import { z } from "zod";
import { AI_LANGS, AI_LIMITS } from "@/lib/ai/config";
import { limitsAvailable } from "@/lib/ai/guard";
import { describeMistakes, studentProgress } from "@/lib/ai/progress";
import { chatPrompt, tag } from "@/lib/ai/prompts";
import { getProvider } from "@/lib/ai/provider";
import { jsonError, respondWithAI } from "@/lib/ai/respond";
import { searchBalama, searchProverbs } from "@/lib/ai/search";
import { bearer, verifyIdToken } from "@/lib/firebaseRest";

/*
  POST /api/ai/chat { messages, lang, mistakes? } + Authorization: Bearer <ID-токен>
  Чат с Маржан апай. К каждому сообщению сервер сам добавляет данные из базы: найденные мақалы и балама сөздер,
  успеваемость ученика и его недавние ошибки. Переписка не сохраняется. Ответ — поток текста.
*/

export const maxDuration = 60;

const Turn = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().trim().min(1).max(4000),
});

const Body = z.object({
  messages: z.array(Turn).min(1).max(40),
  lang: z.enum(AI_LANGS),
  mistakes: z
    .array(
      z.object({
        lessonId: z.string().trim().min(1).max(128).regex(/^[^/]+$/),
        questionId: z.string().trim().min(1).max(64).regex(/^[\w-]+$/),
        answer: z.union([z.array(z.number().int().min(-1).max(200)).max(50), z.string().max(AI_LIMITS.maxInput)]).optional(),
      }),
    )
    .max(5)
    .optional(),
});

export async function POST(request: Request) {
  const token = bearer(request);
  const uid = token ? await verifyIdToken(token).catch(() => null) : null;
  if (!uid || !token) return jsonError(401, "Маржан апайды пайдалану үшін аккаунтқа кіріңіз.");

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Сұрау дұрыс емес.");
  const { lang, mistakes = [] } = parsed.data;

  // Последние сообщения; ученику — не длиннее лимита, первое — от ученика
  const history = parsed.data.messages.slice(-AI_LIMITS.maxHistory);
  while (history.length && history[0].role !== "user") history.shift();
  const last = history.at(-1);
  if (!last || last.role !== "user") return jsonError(400, "Сұрау дұрыс емес.");
  if (last.text.length > AI_LIMITS.maxMessage) return jsonError(400, `Хабарлама тым ұзын (${AI_LIMITS.maxMessage} таңбаға дейін).`);

  // Короткий уточняющий вопрос («тағы бар ма?») ищем вместе с предыдущим
  const asked = history.filter((t) => t.role === "user").map((t) => t.text);
  const query = last.text.split(/\s+/).length < 5 && asked.length > 1 ? `${asked.at(-2)} ${last.text}` : last.text;
  const provider = getProvider();

  try {
    const [proverbs, balama, progress, wrong] = await Promise.all([
      searchProverbs(query, 8, provider && limitsAvailable ? provider : null),
      searchBalama(query, 3),
      studentProgress(uid, token),
      mistakes.length ? describeMistakes(mistakes, token) : Promise.resolve(""),
    ]);

    const data = [
      tag("progress", progress),
      wrong && tag("mistakes", wrong),
      tag("found_proverbs", proverbs.map((p) => `- ${p.text}\n  Түсіндірме (база): ${p.explanation || "—"}`).join("\n") || "(табылмады)"),
      balama.length > 0 && tag("found_balama", balama.map((w) => `- ${w.text}: ${w.definition}`).join("\n")),
    ]
      .filter(Boolean)
      .join("\n\n");

    const fallback = proverbs.length
      ? `Сұрағыңызға базадан табылған мақалдар:\n${proverbs
          .slice(0, 4)
          .map((p) => `- **${p.text}** — ${p.explanation || "түсіндірмесі әлі қосылмаған"}`)
          .join("\n")}`
      : "Базадан сәйкес мақал табылмады. Сұрағыңызды басқаша жазып көріңіз.";

    return respondWithAI({
      request,
      uid,
      system: `${chatPrompt(lang)}\n\n${data}`,
      prompt: history,
      fallback,
    });
  } catch {
    return jsonError(502, "Базаны оқу мүмкін болмады. Сәлден соң қайталаңыз.");
  }
}
