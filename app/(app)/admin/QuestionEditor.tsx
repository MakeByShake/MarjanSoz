"use client";

import { useState } from "react";
import type { IndexedProverb } from "@/lib/proverbs";
import {
  applyHidden,
  changeType,
  fillFromBalama,
  fillFromProverb,
  fullWords,
  isPartType,
  maskParts,
  orderWords,
  type Preset,
  refillOptions,
  withPreset,
  problem,
  QUESTION_TYPES,
  typeInfo,
} from "@/lib/questions";
import type { BalamaWord, LessonQuestion, Proverb, Topic } from "@/lib/types";
import { LibraryPicker } from "./LibraryPicker";
import { dangerBtn, NumberField, smallBtn, TextField } from "./shared";

/** loading — мақалы ещё догружаются (список пока пустой). */
export type Libraries = { proverbs: IndexedProverb[]; balama: BalamaWord[]; topics: Topic[]; loading?: boolean };

export function QuestionEditor({
  q,
  index,
  total,
  open,
  onToggle,
  onChange,
  onDelete,
  onMove,
  libs,
}: {
  q: LessonQuestion;
  index: number;
  total: number;
  open: boolean;
  onToggle: () => void;
  onChange: (q: LessonQuestion) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  libs: Libraries;
}) {
  const [picking, setPicking] = useState(false);
  const info = typeInfo(q.type);
  const issue = problem(q);
  const preview = q.text || q.answer || q.pairs[0]?.left || "Сұрақ мәтіні жоқ";
  const set = <K extends keyof LessonQuestion>(k: K, v: LessonQuestion[K]) => onChange({ ...q, [k]: v });
  // Старые вопросы без полного мақала редактируются как раньше, через поле «мәтін»
  const usePart = isPartType(q.type) && (q.full.trim() !== "" || q.text.trim() === "");

  return (
    <li className="rounded-xl border border-line border-l-4 border-l-primary/40 bg-bg dark:border-l-gold/50">
      <div className="flex flex-wrap items-center gap-2 p-3 sm:px-4">
        <span className="flex flex-col">
          <button type="button" aria-label="Жоғары" disabled={index === 0} onClick={() => onMove(-1)} className="px-1 leading-none disabled:opacity-30">
            ▲
          </button>
          <button type="button" aria-label="Төмен" disabled={index === total - 1} onClick={() => onMove(1)} className="px-1 leading-none disabled:opacity-30">
            ▼
          </button>
        </span>
        <span className="font-medium">Сұрақ {index + 1}</span>
        <span className="rounded-full border border-line px-2 py-0.5 text-xs">
          {info.icon} {info.title}
        </span>
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white dark:bg-gold dark:text-bg">{q.points} балл</span>
        <span className="min-w-0 flex-1 truncate text-sm text-muted">{preview}</span>
        {issue && <span className="text-xs text-red-800 dark:text-red-200">⚠️ {issue}</span>}
        <button type="button" className={smallBtn} onClick={onToggle} aria-expanded={open}>
          {open ? "▴ Жабу" : "▾ Ашу"}
        </button>
        <button type="button" className={dangerBtn} onClick={onDelete} aria-label={`${index + 1}-сұрақты жою`}>
          🗑
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-line p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Сұрақ түрі</span>
              <select value={q.type} onChange={(e) => onChange(changeType(q, e.target.value as LessonQuestion["type"]))} className="field">
                {QUESTION_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.icon} {t.title} — {t.hint}
                  </option>
                ))}
              </select>
            </label>
            <NumberField label="Балл" min={0} value={q.points} onChange={(v) => set("points", Math.max(0, v))} />
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-gold/60 p-3">
            <button type="button" className="btn-primary min-h-9 px-4 py-1 text-sm" onClick={() => setPicking(true)}>
              📖 Кітапханадан толтыру
            </button>
            <span className="text-xs text-muted">
              Мақалды немесе балама сөзді таңдаңыз — нұсқалар өздігінен толады, кейін оларды өзгерте аласыз.
            </span>
          </div>

          <TextField label="Тапсырма (оқушыға көрінетін сұрақ)" value={q.prompt} onChange={(v) => set("prompt", v)} />

          {usePart && <PartEditor q={q} onChange={onChange} pool={libs.proverbs} />}

          {!usePart && info.shape !== "order" && info.shape !== "match" && (
            <TextField
              label={q.type === "blank" ? "Мәтін (бос орынды _____ деп белгілеңіз)" : "Мақал / мәтін"}
              value={q.text}
              onChange={(v) => set("text", v)}
              multiline
            />
          )}

          {info.shape === "choice" && <ChoiceEditor q={q} onChange={onChange} />}

          {info.shape === "write" && (
            <TextField
              label="Дұрыс жауап"
              value={q.answer}
              onChange={(v) => set("answer", v)}
              hint="Бірнеше дұрыс нұсқа болса, «|» арқылы жазыңыз. Бас әріп пен тыныс белгілері есепке алынбайды."
            />
          )}

          {info.shape === "order" && (
            <>
              <TextField label="Дұрыс мақал (сөздер осы ретпен)" value={q.answer} onChange={(v) => set("answer", v)} multiline />
              <p className="flex flex-wrap gap-1 text-sm">
                {orderWords(q).map((w, i) => (
                  <span key={i} className="rounded border border-line bg-card px-2 py-0.5">
                    {w}
                  </span>
                ))}
              </p>
              <TextField label="Көмекші мәтін (міндетті емес)" value={q.text} onChange={(v) => set("text", v)} />
            </>
          )}

          {info.shape === "match" && <MatchEditor q={q} onChange={onChange} />}
        </div>
      )}

      {picking && (
        <LibraryPicker
          open
          onClose={() => setPicking(false)}
          proverbs={libs.proverbs}
          balama={libs.balama}
          topics={libs.topics}
          loading={libs.loading}
          onPick={(p) =>
            onChange(p.kind === "proverb" ? fillFromProverb(q, p.item, libs.proverbs) : fillFromBalama(q, p.item, libs.balama))
          }
        />
      )}
    </li>
  );
}

function ChoiceEditor({ q, onChange }: { q: LessonQuestion; onChange: (q: LessonQuestion) => void }) {
  const many = q.type === "multiple";
  const fixed = q.type === "truefalse";

  function toggle(i: number) {
    if (!many) return onChange({ ...q, correct: [i] });
    const has = q.correct.includes(i);
    onChange({ ...q, correct: has ? q.correct.filter((x) => x !== i) : [...q.correct, i] });
  }

  function remove(i: number) {
    onChange({
      ...q,
      options: q.options.filter((_, j) => j !== i),
      correct: q.correct.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)),
    });
  }

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">
        Жауап нұсқалары <span className="font-normal text-muted">({many ? "дұрыстарының бәрін белгілеңіз" : "дұрысын белгілеңіз"})</span>
      </legend>
      {q.options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type={many ? "checkbox" : "radio"}
            name={`correct-${q.id}`}
            checked={q.correct.includes(i)}
            onChange={() => toggle(i)}
            aria-label={`${i + 1}-нұсқа дұрыс`}
            className="h-5 w-5 shrink-0 accent-[var(--success)]"
          />
          <input
            value={o}
            readOnly={fixed}
            onChange={(e) => onChange({ ...q, options: q.options.map((x, j) => (j === i ? e.target.value : x)) })}
            placeholder={`${i + 1}-нұсқа`}
            aria-label={`${i + 1}-нұсқа`}
            className={`field ${q.correct.includes(i) ? "border-success" : ""}`}
          />
          {!fixed && (
            <button type="button" className={dangerBtn} onClick={() => remove(i)} aria-label={`${i + 1}-нұсқаны жою`}>
              ✕
            </button>
          )}
        </div>
      ))}
      {!fixed && (
        <button type="button" className={smallBtn} onClick={() => onChange({ ...q, options: [...q.options, ""] })}>
          ＋ Нұсқа қосу
        </button>
      )}
    </fieldset>
  );
}

function MatchEditor({ q, onChange }: { q: LessonQuestion; onChange: (q: LessonQuestion) => void }) {
  const setPair = (i: number, k: "left" | "right", v: string) =>
    onChange({ ...q, pairs: q.pairs.map((p, j) => (j === i ? { ...p, [k]: v } : p)) });

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">
        Жұптар <span className="font-normal text-muted">(оқушыға оң жағы араласып көрсетіледі; балл дұрыс жұптар үлесімен беріледі)</span>
      </legend>
      {q.pairs.map((p, i) => (
        <div key={i} className="grid items-start gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <textarea
            value={p.left}
            onChange={(e) => setPair(i, "left", e.target.value)}
            rows={2}
            placeholder="Мақал"
            aria-label={`${i + 1}-жұп: мақал`}
            className="field resize-y"
          />
          <textarea
            value={p.right}
            onChange={(e) => setPair(i, "right", e.target.value)}
            rows={2}
            placeholder="Мағынасы"
            aria-label={`${i + 1}-жұп: мағынасы`}
            className="field resize-y"
          />
          <button
            type="button"
            className={dangerBtn}
            onClick={() => onChange({ ...q, pairs: q.pairs.filter((_, j) => j !== i) })}
            aria-label={`${i + 1}-жұпты жою`}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className={smallBtn} onClick={() => onChange({ ...q, pairs: [...q.pairs, { left: "", right: "" }] })}>
        ＋ Жұп қосу
      </button>
    </fieldset>
  );
}

const PRESETS: { preset: Preset; label: string }[] = [
  { preset: "start", label: "Басы" },
  { preset: "middle", label: "Ортасы" },
  { preset: "end", label: "Соңы" },
  { preset: "word", label: "Ең ұзын сөз" },
];

/** Мақал целиком + какую часть скрыть: пресетом или кликом по словам. */
function PartEditor({ q, onChange, pool }: { q: LessonQuestion; onChange: (q: LessonQuestion) => void; pool: Proverb[] }) {
  const [preset, setPreset] = useState<Preset | "manual">(q.hidden.length ? "manual" : q.type === "blank" ? "word" : "end");
  const words = fullWords(q);
  const hidden = new Set(q.hidden);
  const { answer } = words.length && q.hidden.length ? maskParts(words, q.hidden) : { answer: "" };
  const isChoice = typeInfo(q.type).shape === "choice";

  function setFull(full: string) {
    const next = { ...q, full };
    if (preset !== "manual") return onChange(withPreset(next, preset));
    const valid = q.hidden.filter((i) => i < fullWords(next).length);
    onChange(applyHidden({ ...next, hidden: valid }));
  }

  function toggleWord(i: number) {
    setPreset("manual");
    const next = hidden.has(i) ? q.hidden.filter((x) => x !== i) : [...q.hidden, i].sort((a, b) => a - b);
    onChange(applyHidden({ ...q, hidden: next }));
  }

  return (
    <div className="space-y-3 rounded-xl border border-gold/50 bg-card p-4">
      <TextField
        label="Мақал (толық)"
        value={q.full}
        onChange={setFull}
        multiline
        placeholder="Мысалы: Өнер алды — қызыл тіл"
        hint="Мақалды толық жазыңыз, содан кейін қай бөлігін жасыратынын таңдаңыз."
      />
      {words.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Жасыру:</span>
            {PRESETS.map((p) => (
              <button
                key={p.preset}
                type="button"
                aria-pressed={preset === p.preset}
                onClick={() => {
                  setPreset(p.preset);
                  onChange(withPreset(q, p.preset));
                }}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                  preset === p.preset
                    ? "border-primary bg-primary text-white dark:border-gold dark:bg-gold dark:text-bg"
                    : "border-line hover:border-primary dark:hover:border-gold"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div>
            <p className="mb-1 text-xs text-muted">Немесе сөздерді басып, өзіңіз белгілеңіз (сары = жасырылады):</p>
            <div className="flex flex-wrap gap-1.5">
              {words.map((w, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={hidden.has(i)}
                  onClick={() => toggleWord(i)}
                  className={`rounded-lg border px-2.5 py-1 transition ${
                    hidden.has(i) ? "border-gold bg-gold/30 font-semibold" : "border-line bg-bg hover:border-primary dark:hover:border-gold"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-bg p-3 text-sm">
            <p>
              <span className="text-muted">Оқушы көреді: </span>
              <span className="font-serif italic text-proverb">{q.text}</span>
            </p>
            <p className="mt-1">
              <span className="text-muted">Дұрыс жауап: </span>
              <strong>{answer || "— сөз белгіленбеген"}</strong>
            </p>
          </div>
          {isChoice && (
            <button type="button" className={smallBtn} disabled={!answer} onClick={() => onChange(refillOptions(q, pool))}>
              ⚡ Қате нұсқаларды кітапханадан толтыру
            </button>
          )}
        </>
      )}
    </div>
  );
}
