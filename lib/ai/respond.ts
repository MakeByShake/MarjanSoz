import { getProvider, QuotaError } from "./provider";
import { cacheGet, cacheSet, limitsAvailable, takeQuota } from "./guard";

/*
  Общий путь ответа ИИ для роутов: кэш → лимиты → поток от модели (с сохранением в кэш).
  Когда ИИ недоступен, ученик всё равно получает ответ — заготовку из базы и пояснение (заголовок X-AI-Notice).
*/

type Reason = "demo" | "user" | "day" | "minute" | "quota" | "error";

const NOTICES: Record<Reason, string> = {
  demo: "Маржан ұстаз әзірге қосылмаған. Базадағы түсіндірме көрсетілді.",
  user: "Бүгінгі ИИ сұрақтарың таусылды — ертең қайта келіңіз! Әзірге базадағы түсіндірме:",
  day: "Сайттың бүгінгі ИИ лимиті таусылды, ертең қайта қосылады. Әзірге базадағы түсіндірме:",
  minute: "Қазір сұрақ өте көп. Бір минуттан кейін қайталап көріңіз. Әзірге базадағы түсіндірме:",
  quota: "ИИ лимиті уақытша таусылды. Әзірге базадағы түсіндірме:",
  error: "Маржан ұстаз жауап бере алмады. Әзірге базадағы түсіндірме:",
};

const TEXT_HEADERS = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" };

function textResponse(body: string, source: "cache" | "fallback", reason?: Reason) {
  return new Response(body, {
    headers: {
      ...TEXT_HEADERS,
      "X-AI-Source": source,
      ...(reason ? { "X-AI-Notice": encodeURIComponent(NOTICES[reason]) } : {}),
    },
  });
}

export function jsonError(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function respondWithAI(opts: {
  request: Request;
  uid: string;
  cacheKey: string;
  system: string;
  prompt: string;
  /** Ответ из базы на случай, когда ИИ недоступен */
  fallback: string;
}): Promise<Response> {
  const { request, uid, cacheKey, system, prompt, fallback } = opts;

  const cached = await cacheGet(cacheKey);
  if (cached) return textResponse(cached, "cache");

  const provider = getProvider();
  if (!provider || !limitsAvailable) return textResponse(fallback, "fallback", "demo");

  const quota = await takeQuota(uid).catch(() => ({ ok: true }) as const);
  if (!quota.ok) return textResponse(fallback, "fallback", quota.reason);

  const iterator = provider.stream({ system, prompt, signal: request.signal })[Symbol.asyncIterator]();

  // Ждём первый кусок: если модель сразу отказала, отдаём заготовку вместо пустого потока
  let first: IteratorResult<string>;
  try {
    first = await iterator.next();
  } catch (e) {
    return textResponse(fallback, "fallback", e instanceof QuotaError ? "quota" : "error");
  }
  if (first.done) return textResponse(fallback, "fallback", "error");

  const encoder = new TextEncoder();
  let full = first.value;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(first.value));
    },
    async pull(controller) {
      try {
        const next = await iterator.next();
        if (next.done) {
          controller.close();
          if (full.trim().length > 40) await cacheSet(cacheKey, full);
          return;
        }
        full += next.value;
        controller.enqueue(encoder.encode(next.value));
      } catch {
        // Обрыв посреди ответа: показываем, что успели, и не кэшируем
        controller.enqueue(encoder.encode("\n\n…"));
        controller.close();
      }
    },
    async cancel() {
      await iterator.return?.();
    },
  });

  return new Response(stream, { headers: { ...TEXT_HEADERS, "X-AI-Source": "live" } });
}
