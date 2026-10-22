import { normalize } from "./normalize";
import type { BalamaWord, LessonQuestion, LessonTask, Proverb, QuestionType } from "./types";

/*
  Типы вопросов урока: описание для админки, заполнение из библиотеки и проверка ответа.
  Новый тип = строка в QUESTION_TYPES + ветка в fillFrom* + ветка в grade (и редактор/плеер в UI).
*/

export const BLANK = "_____";

export type Shape = "choice" | "write" | "match" | "order";

export const QUESTION_TYPES: {
  type: QuestionType;
  shape: Shape;
  icon: string;
  title: string;
  hint: string;
  prompt: string;
}[] = [
  { type: "ending", shape: "choice", icon: "🔚", title: "Жалғасын тап", hint: "Басын, ортасын не соңын жасырып, нұсқадан таңдату", prompt: "Мақалдың жалғасын табыңыз" },
  { type: "meaning", shape: "choice", icon: "💡", title: "Мағынасын тап", hint: "Мақалдың мағынасын таңдау", prompt: "Мақалдың мағынасын табыңыз" },
  { type: "blank", shape: "choice", icon: "🧩", title: "Орын толтыру", hint: "Бір сөзді жасырып, нұсқадан таңдату", prompt: "Бос орынға сәйкес сөзді таңдаңыз" },
  { type: "write", shape: "write", icon: "✍️", title: "Жалғасын жаз", hint: "Бір бөлігін жасырып, оқушы өзі жазады", prompt: "Мақалдың жалғасын жазыңыз" },
  { type: "match", shape: "match", icon: "🔗", title: "Сәйкестендір", hint: "Мақалды мағынасымен сәйкестендіру", prompt: "Мақалдарды мағынасымен сәйкестендіріңіз" },
  { type: "order", shape: "order", icon: "🔀", title: "Сөздерден құра", hint: "Сөздерді дұрыс ретке қою", prompt: "Сөздерден мақал құраңыз" },
  { type: "single", shape: "choice", icon: "☑️", title: "Бір жауап", hint: "Бір дұрыс жауапты таңдау", prompt: "Дұрыс жауапты таңдаңыз" },
  { type: "multiple", shape: "choice", icon: "✅", title: "Көп жауап", hint: "Бірнеше дұрыс жауапты таңдау", prompt: "Барлық дұрыс жауаптарды таңдаңыз" },
  { type: "truefalse", shape: "choice", icon: "⚖️", title: "Дұрыс / Бұрыс", hint: "Тұжырым дұрыс немесе бұрыс", prompt: "Тұжырым дұрыс па?" },
];

export const TRUE_FALSE = ["Дұрыс", "Бұрыс"];


export function typeInfo(type: QuestionType) {
  return QUESTION_TYPES.find((t) => t.type === type) ?? QUESTION_TYPES[0];
}

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function emptyQuestion(type: QuestionType): LessonQuestion {
  return {
    id: newId(),
    type,
    points: 1,
    prompt: typeInfo(type).prompt,
    text: "",
    options: type === "truefalse" ? [...TRUE_FALSE] : typeInfo(type).shape === "choice" ? ["", "", ""] : [],
    correct: typeInfo(type).shape === "choice" ? [0] : [],
    answer: "",
    full: "",
    hidden: [],
    pairs: type === "match" ? [{ left: "", right: "" }, { left: "", right: "" }] : [],
    source: null,
  };
}

/** Смена типа: общее (балл, текст) остаётся, остальное — как у пустого вопроса. */
export function changeType(q: LessonQuestion, type: QuestionType): LessonQuestion {
  const base = emptyQuestion(type);
  const keepOptions = typeInfo(type).shape === "choice" && typeInfo(q.type).shape === "choice" && type !== "truefalse" && q.type !== "truefalse";
  const next = {
    ...base,
    id: q.id,
    points: q.points,
    text: q.text,
    full: q.full,
    hidden: q.hidden,
    options: keepOptions ? q.options : base.options,
    correct: keepOptions ? q.correct : base.correct,
    prompt: q.prompt === typeInfo(q.type).prompt ? base.prompt : q.prompt,
  };
  return type === "blank" ? applyBlank(next, blankSource(next)) : next;
}

export function emptyTask(): LessonTask {
  return { id: newId(), title: "Жаңа тапсырма", instruction: "", shuffle: false, questions: [] };
}

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

/** Варианты: правильный + до трёх чужих, перемешаны. */
function withDistractors(right: string, others: string[]) {
  const seen = new Set([normalize(right)]);
  const wrong: string[] = [];
  for (const o of shuffle(others)) {
    const key = normalize(o);
    if (!o || seen.has(key)) continue;
    seen.add(key);
    wrong.push(o);
    if (wrong.length === 3) break;
  }
  // Регистр первой буквы как у правильного ответа, чтобы он не выделялся
  const upper = right[0] !== undefined && right[0] === right[0].toLocaleUpperCase("kk") && right[0] !== right[0].toLocaleLowerCase("kk");
  const sameCase = (o: string) =>
    (upper ? o[0].toLocaleUpperCase("kk") : o[0].toLocaleLowerCase("kk")) + o.slice(1);
  const options = shuffle([right, ...wrong.map(sameCase)]);
  return { options, correct: [options.indexOf(right)] };
}

const wordsOf = (p: { text: string }) =>
  p.text.split(/\s+/).map((t) => cleanWord(t.split(/[-—]/).pop() ?? t)).filter((w) => w.length >= 3);

/* ---------- Пропуски и варианты (ending / blank / write) ---------- */

/** Самое длинное слово мақала — его прячем в «Орын толтыру» по умолчанию. */
function longestWord(words: string[]): number {
  return words.map((w, i) => ({ i, len: cleanWord(w).length })).sort((a, b) => b.len - a.len)[0]?.i ?? 0;
}

/** Слово в «|…|», знаки препинания остаются снаружи: «тіл,» → «|тіл|,». */
function markWord(w: string) {
  const tail = w.match(/[,.!?;:»]+$/)?.[0] ?? "";
  return `|${cleanWord(w)}|${tail}`;
}

/**
 * «Орын толтыру»: админ пишет мақал, а пропуск ставит в прямые скобки — «Өнер алды — |қызыл| тіл».
 * Эта строка хранится в full (ученик её не видит), из неё собираются text с _____ и правильный вариант.
 */
export function blankSource(q: LessonQuestion): string {
  if (q.full.includes("|")) return q.full;
  // Старые вопросы: full + номера скрытых слов
  const words = q.full.trim().split(/\s+/).filter(Boolean);
  if (words.length && q.hidden.length) {
    const hidden = new Set(q.hidden);
    return words.map((w, i) => (hidden.has(i) ? markWord(w) : w)).join(" ").replace(/\| \|/g, " ");
  }
  const right = q.options[q.correct[0] ?? -1];
  if (q.text.includes(BLANK) && right) return q.text.replace(BLANK, `|${right}|`);
  return q.full || q.text;
}

export function applyBlank(q: LessonQuestion, source: string): LessonQuestion {
  const answers = [...source.matchAll(/\|([^|]+)\|/g)].map((m) => m[1].trim()).filter(Boolean);
  const text = source.replace(/\|[^|]*\|/g, BLANK).trim();
  const next = { ...q, full: source, hidden: [], text };
  if (!answers.length) return next;
  const options = q.options.length ? [...q.options] : [""];
  const ci = q.correct[0] ?? 0;
  options[ci] = answers.join(" … ");
  return { ...next, options, correct: [ci] };
}

/** Заполняет неправильные варианты из библиотеки: под одно слово — слова, под фразу — концы других мақалов. */
export function refillOptions(q: LessonQuestion, pool: { text: string }[]): LessonQuestion {
  const right = q.options[q.correct[0] ?? -1]?.trim();
  if (!right) return q;
  const own = normalize(q.type === "blank" ? q.text : q.text + " " + right);
  const others = pool.filter((o) => !normalize(o.text).startsWith(own.slice(0, 12)));
  const candidates =
    right.split(/\s+/).length > 1 ? others.map((o) => cleanWord(splitProverb(o.text)[1])) : others.flatMap(wordsOf);
  return { ...q, ...withDistractors(right, candidates) };
}

/** Мақал → начало, которое видит ученик, и продолжение-ответ. */
function startAndEnd(text: string) {
  const [start, end] = splitProverb(text);
  return { start, end: cleanWord(end) };
}

function blankFrom(q: LessonQuestion, text: string, pool: { text: string }[]) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const k = longestWord(words);
  const source = words.map((w, i) => (i === k ? markWord(w) : w)).join(" ");
  return refillOptions(applyBlank(q, source), pool);
}

/** Заполняет вопрос из мақала. Всё потом можно поправить вручную. */
export function fillFromProverb(q: LessonQuestion, p: Proverb, pool: Proverb[]): LessonQuestion {
  const others = pool.filter((o) => o.id !== p.id);
  // Для вопросов о смысле берём только мақалы с толкованием
  const explained = others.filter((o) => o.explanation.trim());
  const source = { kind: "proverb" as const, id: p.id };
  switch (q.type) {
    case "ending": {
      const { start, end } = startAndEnd(p.text);
      return refillOptions({ ...q, source, full: "", hidden: [], text: start, options: [end, "", ""], correct: [0] }, pool);
    }
    case "write": {
      const { start, end } = startAndEnd(p.text);
      return { ...q, source, full: "", hidden: [], text: start, answer: end };
    }
    case "blank":
      return blankFrom({ ...q, source }, p.text, pool);
    case "meaning":
    case "single":
      return { ...q, source, text: p.text, ...withDistractors(p.explanation, explained.map((o) => o.explanation)) };
    case "order":
      return { ...q, source, text: "", answer: orderCells({ ...q, answer: p.text }).join("|") };
    case "match": {
      const same = shuffle(explained.filter((o) => o.topic === p.topic));
      const rest3 = [...same, ...shuffle(explained.filter((o) => o.topic !== p.topic))].slice(0, 3);
      return { ...q, source, pairs: [p, ...rest3].map((x) => ({ left: x.text, right: x.explanation })) };
    }
    case "truefalse": {
      const honest = Math.random() < 0.5 || explained.length === 0;
      const meaning = honest ? p.explanation : shuffle(explained)[0].explanation;
      return { ...q, source, text: `«${p.text}» мақалының мағынасы: ${meaning}`, options: [...TRUE_FALSE], correct: [honest ? 0 : 1] };
    }
    case "multiple": {
      const same = shuffle(others.filter((o) => o.topic === p.topic)).slice(0, 1);
      const diff = shuffle(others.filter((o) => o.topic !== p.topic)).slice(0, 2);
      const right = [p, ...same].map((x) => x.text);
      const options = shuffle([...right, ...diff.map((x) => x.text)]);
      return {
        ...q,
        source,
        text: "Мағынасы ұқсас мақалдарды таңдаңыз",
        options,
        correct: right.map((r) => options.indexOf(r)),
      };
    }
  }
}

/** Заполняет вопрос из балама сөз (мағынасы, сәйкестендіру и т.д.). */
export function fillFromBalama(q: LessonQuestion, w: BalamaWord, pool: BalamaWord[]): LessonQuestion {
  const others = pool.filter((o) => o.id !== w.id);
  const source = { kind: "balama" as const, id: w.id };
  switch (q.type) {
    case "match":
      return { ...q, source, pairs: [w, ...shuffle(others).slice(0, 3)].map((x) => ({ left: x.text, right: x.definition })) };
    case "order":
      return { ...q, source, answer: orderCells({ ...q, answer: w.text }).join("|") };
    case "write":
      return { ...q, source, text: w.definition, answer: w.text, prompt: "Мағынасы бойынша балама сөзді жазыңыз" };
    case "truefalse": {
      const honest = Math.random() < 0.5 || others.length === 0;
      const meaning = honest ? w.definition : shuffle(others)[0].definition;
      return { ...q, source, text: `«${w.text}» — ${meaning}`, options: [...TRUE_FALSE], correct: [honest ? 0 : 1] };
    }
    case "ending": {
      const { start, end } = startAndEnd(w.text);
      return refillOptions({ ...q, source, full: "", hidden: [], text: start, options: [end, "", ""], correct: [0] }, pool);
    }
    case "blank":
      return blankFrom({ ...q, source }, w.text, pool);
    default:
      return {
        ...q,
        source,
        text: w.text,
        prompt: q.type === "meaning" ? "Балама сөздің мағынасын табыңыз" : q.prompt,
        ...withDistractors(w.definition, others.map((o) => o.definition)),
      };
  }
}

/** Авто-тапсырма из мақалов урока: по три вопроса на мақал и одно сопоставление. */
export function autoQuestions(lesson: Proverb[], pool: Proverb[]): LessonQuestion[] {
  const types: QuestionType[] = ["ending", "meaning", "blank"];
  const questions = lesson.flatMap((p) => types.map((t) => fillFromProverb(emptyQuestion(t), p, pool)));
  if (lesson.length > 1) {
    const match = emptyQuestion("match");
    questions.push({ ...match, points: 2, pairs: lesson.slice(0, 5).map((p) => ({ left: p.text, right: p.explanation })) });
  }
  return questions;
}

/* ---------- Проверка ответа ---------- */

/** choice/order — номера (вариантов или слов), match — номер правой части для каждой левой, write — текст. */
export type Answer = number[] | string | undefined;

/**
 * «Сөздерден құра»: ячейки через «|» (в ячейке может быть и фраза). Старые ответы без «|» делятся по пробелам.
 * orderCells — как в редакторе (с пустыми ячейками), orderWords — то, что получает ученик.
 */
export const orderCells = (q: Pick<LessonQuestion, "answer">) =>
  q.answer.includes("|") ? q.answer.split("|").map((c) => c.trim()) : q.answer.trim().split(/\s+/).filter(Boolean);
export const orderWords = (q: Pick<LessonQuestion, "answer">) => orderCells(q).filter(Boolean);

const accepted = (q: LessonQuestion) =>
  q.answer
    .split("|")
    .map((a) => normalize(a))
    .filter(Boolean);

/** Сколько баллов из q.points заработано. Сопоставление считается частично. */
export function grade(q: LessonQuestion, answer: Answer): number {
  if (answer === undefined) return 0;
  const shape = typeInfo(q.type).shape;
  if (shape === "write") {
    return typeof answer === "string" && accepted(q).includes(normalize(answer)) ? q.points : 0;
  }
  if (typeof answer === "string") return 0;
  if (shape === "choice") {
    const chosen = [...answer].sort().join(",");
    return chosen === [...q.correct].sort().join(",") ? q.points : 0;
  }
  if (shape === "order") {
    const words = orderWords(q);
    return normalize(answer.map((i) => words[i]).join(" ")) === normalize(words.join(" ")) ? q.points : 0;
  }
  if (q.pairs.length === 0) return 0;
  const right = q.pairs.filter((_, i) => answer[i] === i).length;
  return Math.round((q.points * right) / q.pairs.length);
}

export const taskMax = (t: LessonTask) => t.questions.reduce((s, q) => s + (Number(q.points) || 0), 0);

/** Правильный ответ текстом — для разбора ошибок. */
export function correctText(q: LessonQuestion): string {
  const shape = typeInfo(q.type).shape;
  if (shape === "choice") return q.correct.map((i) => q.options[i]).join("; ");
  if (shape === "write") return q.answer.split("|")[0]?.trim() ?? "";
  if (shape === "order") return orderWords(q).join(" ");
  return q.pairs.map((p) => `${p.left} — ${p.right}`).join("\n");
}

/** Ответ ученика текстом — для разбора ошибки. */
export function answerText(q: LessonQuestion, answer: Answer): string {
  if (answer === undefined) return "";
  if (typeof answer === "string") return answer;
  const shape = typeInfo(q.type).shape;
  if (shape === "choice") return answer.map((i) => q.options[i]).filter(Boolean).join("; ");
  if (shape === "order") {
    const words = orderWords(q);
    return answer.map((i) => words[i]).filter(Boolean).join(" ");
  }
  return q.pairs.map((p, i) => `${p.left} — ${q.pairs[answer[i]]?.right ?? "?"}`).join("\n");
}

/** Что не так с вопросом (для подсказки в админке). null — всё в порядке. */
export function problem(q: LessonQuestion): string | null {
  const shape = typeInfo(q.type).shape;
  if (!(q.points > 0)) return "Балл 0";
  if (shape === "choice") {
    const filled = q.options.filter((o) => o.trim()).length;
    if (filled < 2) return "Кемінде 2 нұсқа керек";
    if (q.correct.length === 0) return "Дұрыс жауап белгіленбеген";
    if (q.correct.some((i) => !q.options[i]?.trim())) return "Дұрыс нұсқа бос";
  }
  if (shape === "write" && accepted(q).length === 0) return "Дұрыс жауап жазылмаған";
  if (q.type === "blank" && !q.text.includes(BLANK)) return "Жасырын сөзді |...| ішіне жазыңыз";
  if (shape === "order" && orderWords(q).length < 2) return "Мақал мәтіні керек";
  if (shape === "match" && q.pairs.filter((p) => p.left.trim() && p.right.trim()).length < 2) return "Кемінде 2 жұп керек";
  return null;
}
