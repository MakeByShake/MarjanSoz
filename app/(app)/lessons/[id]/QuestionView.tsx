"use client";

import { type Answer, orderWords, typeInfo } from "@/lib/questions";
import type { LessonQuestion } from "@/lib/types";

/** Вопрос, подготовленный к показу: в каком порядке показывать варианты, правые части и слова. */
export type Prepared = { q: LessonQuestion; options: number[]; rights: number[]; words: number[] };

const LETTERS = ["А", "Ә", "Б", "В", "Г", "Ғ", "Д", "Е", "Ж", "З"];

const optionClass =
  "flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-line bg-card px-4 py-3 text-center font-medium transition-colors hover:border-primary/60 hover:bg-primary/4 has-checked:border-primary has-checked:bg-primary has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-gold dark:hover:border-gold dark:has-checked:border-gold dark:has-checked:bg-gold dark:has-checked:text-bg";

export function QuestionView({ item, answer, onAnswer }: { item: Prepared; answer: Answer; onAnswer: (a: Answer) => void }) {
  const { q } = item;
  const shape = typeInfo(q.type).shape;
  const chosen = Array.isArray(answer) ? answer : [];

  const title = <h3 className="mb-2 text-center font-serif text-xl font-semibold text-heading">{q.prompt}</h3>;
  const text = q.text && <p className="mb-6 whitespace-pre-line text-center font-serif text-xl italic text-proverb">{q.text}</p>;

  if (shape === "choice") {
    const many = q.type === "multiple";
    const long = item.options.some((i) => q.options[i].length > 30);
    return (
      <fieldset>
        <legend className="w-full">{title}</legend>
        {text}
        {many && <p className="mb-3 text-center text-sm text-muted">Бірнеше жауап болуы мүмкін</p>}
        <div className={`grid gap-3 ${long ? "" : "sm:grid-cols-2"}`}>
          {item.options.map((i) => (
            <label key={i} className={`${optionClass} ${long ? "justify-start text-left" : ""}`}>
              <input
                type={many ? "checkbox" : "radio"}
                name={`q-${q.id}`}
                checked={chosen.includes(i)}
                onChange={() => onAnswer(many ? (chosen.includes(i) ? chosen.filter((x) => x !== i) : [...chosen, i]) : [i])}
                className="sr-only"
              />
              {q.options[i]}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (shape === "write") {
    return (
      <div className="text-center">
        {title}
        {text}
        <label className="mx-auto block max-w-lg text-left">
          <span className="sr-only">Жауабыңыз</span>
          <input
            type="text"
            autoFocus
            autoComplete="off"
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="Жауапты енгізіңіз"
            className="field text-lg"
          />
        </label>
        <p className="mt-2 text-sm text-muted">Бас әріп пен тыныс белгілері есепке алынбайды</p>
      </div>
    );
  }

  if (shape === "order") {
    const words = orderWords(q);
    const bank = item.words.filter((i) => !chosen.includes(i));
    return (
      <div className="text-center">
        {title}
        {text}
        <div
          aria-label="Сіздің мақалыңыз"
          className="mb-4 flex min-h-16 flex-wrap items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gold/60 bg-bg p-3"
        >
          {chosen.length === 0 && <span className="text-sm text-muted">Төмендегі сөздерді ретімен басыңыз</span>}
          {chosen.map((i, pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => onAnswer(chosen.filter((_, p) => p !== pos))}
              className="cursor-pointer rounded-xl bg-primary px-3.5 py-2 font-medium text-white dark:bg-gold dark:text-bg"
              aria-label={`${words[i]} — алып тастау`}
            >
              {words[i]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {bank.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => onAnswer([...chosen, i])}
              className="cursor-pointer rounded-xl border border-line bg-card px-3.5 py-2 font-medium transition-colors hover:border-primary/60 dark:hover:border-gold/60"
            >
              {words[i]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Сопоставление: answer[i] — номер правой части, выбранной для левой части i
  const picks = chosen.length === q.pairs.length ? chosen : q.pairs.map(() => -1);
  return (
    <div>
      {title}
      {text}
      <h4 className="mb-2 font-semibold">Мағыналар:</h4>
      <ul className="mb-6 space-y-2">
        {item.rights.map((r, n) => (
          <li key={r} className="flex gap-3 rounded-xl border border-gold/50 bg-bg p-3">
            <span className="font-serif font-semibold text-gold-text">{LETTERS[n] ?? n + 1}</span>
            <span>{q.pairs[r].right}</span>
          </li>
        ))}
      </ul>
      <ol className="space-y-4">
        {q.pairs.map((p, i) => (
          <li key={i} className="rounded-xl border border-line bg-bg p-4">
            <label htmlFor={`match-${q.id}-${i}`} className="mb-2 block font-serif italic text-proverb">
              {i + 1}. {p.left}
            </label>
            <select
              id={`match-${q.id}-${i}`}
              value={picks[i]}
              onChange={(e) => onAnswer(picks.map((v, j) => (j === i ? Number(e.target.value) : v)))}
              className="field"
            >
              <option value={-1} disabled>
                Мағынасын таңдаңыз
              </option>
              {item.rights.map((r, n) => (
                <option key={r} value={r}>
                  {LETTERS[n] ?? n + 1} — {q.pairs[r].right.length > 50 ? q.pairs[r].right.slice(0, 50) + "…" : q.pairs[r].right}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ol>
    </div>
  );
}
