import { z } from "zod";
import { AI_LANGS, AI_LIMITS, PROMPT_VERSION } from "@/lib/ai/config";
import { findBalama, findProverb, findQuestion } from "@/lib/ai/data";
import { fingerprint } from "@/lib/ai/guard";
import { headings, mistakePrompt, tag } from "@/lib/ai/prompts";
import { jsonError, respondWithAI } from "@/lib/ai/respond";
import { bearer, verifyIdToken } from "@/lib/firebaseRest";
import { answerText, correctText, typeInfo } from "@/lib/questions";

/*
  POST /api/ai/mistake { lessonId, questionId, answer, lang } + Authorization: Bearer <ID-токен>
  «Неге қате?»: вопрос и правильный ответ сервер берёт из урока в базе, от ученика — только его ответ.
*/

export const maxDuration = 60;

const Body = z.object({
  lessonId: z.string().trim().min(1).max(128).regex(/^[^/]+$/),
  questionId: z.string().trim().min(1).max(64).regex(/^[\w-]+$/),
  answer: z.union([z.array(z.number().int().min(-1).max(200)).max(50), z.string().max(AI_LIMITS.maxInput)]).optional(),
  lang: z.enum(AI_LANGS),
});

export async function POST(request: Request) {
  const token = bearer(request);
  const uid = token ? await verifyIdToken(token).catch(() => null) : null;
  if (!uid || !token) return jsonError(401, "Маржан апайды пайдалану үшін аккаунтқа кіріңіз.");

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Сұрау дұрыс емес.");
  const { lessonId, questionId, answer, lang } = parsed.data;

  let question: string;
  let item = "";
  let correct: string;
  try {
    const q = await findQuestion(lessonId, questionId, token);
    if (!q) return jsonError(404, "Сұрақ табылмады.");
    correct = correctText(q);
    const given = answerText(q, answer).slice(0, AI_LIMITS.maxInput) || "(жауап берілмеді)";
    const options = typeInfo(q.type).shape === "choice" ? `\nНұсқалар: ${q.options.filter(Boolean).join(" | ")}` : "";
    question = `Сұрақ түрі: ${typeInfo(q.type).title}\nТапсырма: ${q.prompt}\nМәтін: ${q.text || "—"}${options}\nДұрыс жауап: ${correct}`;
    if (q.source?.kind === "proverb") {
      const p = await findProverb(q.source.id);
      if (p) item = `Мақал: ${p.text}\nТүсіндірме (база): ${p.explanation || "—"}`;
    } else if (q.source?.kind === "balama") {
      const w = await findBalama(q.source.id);
      if (w) item = `Балама сөз: ${w.text}\nМағынасы (база): ${w.definition}`;
    }
    const data = [tag("question", question), item && tag("item", item), tag("student_answer", given)].filter(Boolean).join("\n\n");
    const h = headings(lang);
    const meaning = item.split("\n")[1]?.replace(/^[^:]+:\s*/, "");

    return respondWithAI({
      request,
      uid,
      cacheKey: `ai:v${PROMPT_VERSION}:mistake:${lessonId}:${questionId}:${lang}:${await fingerprint(data)}`,
      system: mistakePrompt(lang),
      prompt: data,
      fallback: `## ${h.why}\nДұрыс жауап: ${correct}.${meaning && meaning !== "—" ? `\n## ${h.remember}\n${meaning}` : ""}`,
    });
  } catch {
    return jsonError(502, "Базаны оқу мүмкін болмады. Сәлден соң қайталаңыз.");
  }
}
