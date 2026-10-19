import { normalize } from "./proverbs";
import type { Proverb } from "./types";

/**
 * Задания строятся из самого текста мақала, поэтому работают для любого количества
 * мақалов без ручных вопросов (в старом сайте они были прописаны вручную для 31 мақала).
 */
export type ChoiceQuestion = {
  kind: "choice";
  proverbId: number;
  prompt: string;
  options: string[];
  answer: string;
};

export type CompletionQuestion = {
  kind: "completion";
  proverbId: number;
  prompt: string;
  answer: string;
};

export type MatchQuestion = {
  kind: "match";
  pairs: { proverbId: number; text: string; meaning: string }[];
  meanings: string[];
};

export type Question = ChoiceQuestion | CompletionQuestion | MatchQuestion;

export const BLANK = "_____";
export const PASS_PERCENT = 70;

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const cleanWord = (w: string) => w.replace(/^[«"“(]+|[»"”),.!?;:]+$/g, "");

/** Делит мақал на начало и продолжение: по запятой, по тире, иначе пополам. */
export function splitProverb(text: string): [string, string] {
  const comma = text.indexOf(",");
  if (comma > 0) return [text.slice(0, comma + 1).trim(), text.slice(comma + 1).trim()];
  const dash = text.search(/\s?[—–-]\s?/);
  if (dash > 0) return [text.slice(0, dash).trim() + " —", text.slice(dash).replace(/^\s?[—–-]\s?/, "").trim()];
  const words = text.split(/\s+/);
  const cut = Math.max(1, Math.ceil(words.length / 2));
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

function makeChoice(p: Proverb, pool: Proverb[]): ChoiceQuestion | null {
  const tokens = p.text.split(/\s+/);
  const candidates = tokens
    .map((t, i) => ({ i, word: cleanWord(t.split(/[-—]/).pop() ?? t) }))
    .filter((c) => c.word.length >= 4);
  if (candidates.length === 0) return null;
  const pick = candidates.sort((a, b) => b.word.length - a.word.length)[0];

  const used = new Set([normalize(pick.word)]);
  const distractors: string[] = [];
  for (const other of shuffle(pool)) {
    if (other.id === p.id) continue;
    const words = other.text.split(/\s+/).map((t) => cleanWord(t.split(/[-—]/).pop() ?? t));
    const word = words.find((w) => w.length >= 4 && !used.has(normalize(w)));
    if (word) {
      used.add(normalize(word));
      distractors.push(word);
    }
    if (distractors.length === 2) break;
  }
  if (distractors.length < 2) return null;

  const prompt = tokens.map((t, i) => (i === pick.i ? t.replace(pick.word, BLANK) : t)).join(" ");
  return { kind: "choice", proverbId: p.id, prompt, options: shuffle([pick.word, ...distractors]), answer: pick.word };
}

function makeCompletion(p: Proverb): CompletionQuestion | null {
  const [start, rest] = splitProverb(p.text);
  if (!rest) return null;
  return { kind: "completion", proverbId: p.id, prompt: `${start} ${BLANK}`, answer: rest };
}

/** Смешанный тест: по два задания на мақал и одно задание на сопоставление. */
export function buildTest(lesson: Proverb[], pool: Proverb[]): Question[] {
  const questions: Question[] = [];
  for (const p of lesson) {
    const completion = makeCompletion(p);
    if (completion) questions.push(completion);
    const choice = makeChoice(p, pool);
    if (choice) questions.push(choice);
  }
  const shuffled = shuffle(questions);
  if (lesson.length > 1) {
    const pairs = lesson.map((p) => ({ proverbId: p.id, text: p.text, meaning: p.explanation }));
    shuffled.push({ kind: "match", pairs, meanings: shuffle(pairs.map((x) => x.meaning)) });
  }
  return shuffled;
}

export type Answer = string | Record<number, string> | undefined;

export function isCorrect(q: Question, answer: Answer): boolean {
  if (answer === undefined) return false;
  if (q.kind === "match") {
    if (typeof answer !== "object") return false;
    return q.pairs.every((p) => answer[p.proverbId] === p.meaning);
  }
  if (typeof answer !== "string") return false;
  return normalize(answer) === normalize(q.answer);
}
