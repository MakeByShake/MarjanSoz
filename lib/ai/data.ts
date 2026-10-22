import seedBalama from "@/data/balama.json";
import { getDocument } from "@/lib/firebaseRest";
import type { BalamaWord, Lesson, LessonQuestion, Proverb } from "@/lib/types";

/*
  ИИ получает мақал, балама сөз и вопрос урока только отсюда — из нашей базы Firestore.
  Браузер присылает лишь id, поэтому подменить текст, о котором рассказывает ИИ, нельзя.
*/

type LibraryMeta = { version: number; chunks: string[] };

// Библиотека мақалов в памяти сервера: перечитываем не чаще раза в 5 минут и только при смене version
let library: { version: number; byId: Map<string, Proverb>; checkedAt: number } | null = null;
const LIBRARY_TTL = 5 * 60 * 1000;

async function proverbsById(): Promise<Map<string, Proverb>> {
  if (library && Date.now() - library.checkedAt < LIBRARY_TTL) return library.byId;
  const meta = await getDocument<LibraryMeta>("meta/library");
  if (!meta) return library?.byId ?? new Map();
  if (library && library.version === meta.version) {
    library.checkedAt = Date.now();
    return library.byId;
  }
  const chunks = await Promise.all(meta.chunks.map((id) => getDocument<{ items: Proverb[] }>(`proverbChunks/${id}`)));
  const byId = new Map(chunks.flatMap((c) => c?.items ?? []).map((p) => [String(p.id), p]));
  library = { version: meta.version, byId, checkedAt: Date.now() };
  return byId;
}

export async function findProverb(id: string): Promise<Proverb | null> {
  return (await proverbsById()).get(id) ?? null;
}

export async function allProverbs(): Promise<Map<string, Proverb>> {
  return proverbsById();
}

export async function allBalama(): Promise<BalamaWord[]> {
  const doc = await getDocument<{ items: BalamaWord[] }>("meta/balama");
  return (doc?.items ?? seedBalama).map((w) => ({ ...w, id: String(w.id) }));
}

export async function findBalama(id: string): Promise<BalamaWord | null> {
  return (await allBalama()).find((w) => w.id === id) ?? null;
}

/** Вопрос урока. Токен ученика: черновики урока видит только админ (правила Firestore). */
export async function findQuestion(lessonId: string, questionId: string, idToken: string) {
  const lesson = await getDocument<Lesson>(`lessons/${encodeURIComponent(lessonId)}`, idToken);
  for (const task of lesson?.tasks ?? []) {
    const q = task.questions?.find((x) => x.id === questionId);
    if (q) return { ...q, full: q.full ?? "", hidden: q.hidden ?? [] } as LessonQuestion;
  }
  return null;
}
