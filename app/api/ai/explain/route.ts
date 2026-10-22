import { z } from "zod";
import { AI_LANGS, PROMPT_VERSION } from "@/lib/ai/config";
import { findBalama, findProverb } from "@/lib/ai/data";
import { fingerprint } from "@/lib/ai/guard";
import { explainPrompt, headings, tag } from "@/lib/ai/prompts";
import { jsonError, respondWithAI } from "@/lib/ai/respond";
import { bearer, verifyIdToken } from "@/lib/firebaseRest";

/*
  POST /api/ai/explain { kind: "proverb" | "balama", id, lang } + Authorization: Bearer <ID-токен>
  Маржан ұстаз объясняет мақал или балама сөз из нашей базы. Ответ — поток текста.
*/

export const maxDuration = 60;

const Body = z.object({
  kind: z.enum(["proverb", "balama"]),
  id: z.string().trim().min(1).max(64).regex(/^[\w-]+$/),
  lang: z.enum(AI_LANGS),
});

export async function POST(request: Request) {
  const token = bearer(request);
  const uid = token ? await verifyIdToken(token).catch(() => null) : null;
  if (!uid) return jsonError(401, "Маржан ұстазды пайдалану үшін аккаунтқа кіріңіз.");

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Сұрау дұрыс емес.");
  const { kind, id, lang } = parsed.data;
  const h = headings(lang);

  let item: string;
  let fallback: string;
  try {
    if (kind === "proverb") {
      const p = await findProverb(id);
      if (!p) return jsonError(404, "Мұндай мақал базада жоқ.");
      item = `Мақал: ${p.text}\nТүсіндірме (база): ${p.explanation || "—"}\nОрысша аудармасы (база): ${p.translation_ru || "—"}`;
      fallback = `## ${h.meaning}\n${p.explanation || "Түсіндірмесі әлі қосылмаған."}${
        p.translation_ru ? `\n## ${h.translation}\n${p.translation_ru}` : ""
      }`;
    } else {
      const w = await findBalama(id);
      if (!w) return jsonError(404, "Мұндай балама сөз базада жоқ.");
      item = `Балама сөз: ${w.text}\nМағынасы (база): ${w.definition}`;
      fallback = `## ${h.meaning}\n${w.definition}`;
    }
  } catch {
    return jsonError(502, "Базаны оқу мүмкін болмады. Сәлден соң қайталаңыз.");
  }

  return respondWithAI({
    request,
    uid,
    cacheKey: `ai:v${PROMPT_VERSION}:explain:${kind}:${id}:${lang}:${await fingerprint(item)}`,
    system: explainPrompt(kind, lang),
    prompt: tag("item", item),
    fallback,
  });
}
