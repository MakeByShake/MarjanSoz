import { getDocument, queryEqual } from "@/lib/firebaseRest";
import { answerText, correctText, type Answer } from "@/lib/questions";
import type { Lesson, LessonResult, UserProfile } from "@/lib/types";
import { AI_LIMITS } from "./config";
import { findQuestion } from "./data";

/*
  Что Маржан апай знает об ученике: результаты уроков и недавние ошибки — из нашей базы.
  Имя, почту и другие личные данные модели не передаём.
*/

/** Успеваемость текстом для модели. */
export async function studentProgress(uid: string, idToken: string): Promise<string> {
  const [lessons, results, profile] = await Promise.all([
    queryEqual<Lesson>("lessons", "published", true, idToken),
    queryEqual<LessonResult>("results", "uid", uid, idToken),
    getDocument<UserProfile>(`users/${uid}`, idToken),
  ]);
  const byLesson = new Map(results.map((r) => [r.lessonId, r]));
  const ordered = lessons.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const done = ordered.filter((l) => byLesson.get(l.id)?.completed).length;

  const lines = ordered.map((l, i) => {
    const r = byLesson.get(l.id);
    if (!r) return `${i + 1}. «${l.title}» — әлі басталмаған`;
    const score = r.manual ?? r.score;
    const pct = r.maxScore ? Math.round((score / r.maxScore) * 100) : 0;
    return `${i + 1}. «${l.title}» — ${score}/${r.maxScore} балл (${pct}%), ${r.completed ? "аяқталған" : "аяқталмаған"}`;
  });
  return [`Жалпы ұпай: ${profile?.points ?? 0}`, `Сабақтар: ${ordered.length}, оның ішінде аяқталғаны: ${done}`, ...lines].join("\n");
}

export type MistakeRef = { lessonId: string; questionId: string; answer?: Answer };

/** Недавние ошибки: вопрос и правильный ответ берём из урока в базе, от ученика — только его ответ. */
export async function describeMistakes(list: MistakeRef[], idToken: string): Promise<string> {
  const rows = await Promise.all(
    list.map(async (m) => {
      const q = await findQuestion(m.lessonId, m.questionId, idToken).catch(() => null);
      if (!q) return null;
      const given = answerText(q, m.answer).slice(0, AI_LIMITS.maxInput) || "(жауап берілмеді)";
      return `- Сұрақ: ${q.prompt}${q.text ? ` — ${q.text}` : ""}\n  Дұрыс жауап: ${correctText(q)}\n  Оқушы жауабы: ${given}`;
    }),
  );
  return rows.filter(Boolean).join("\n");
}
