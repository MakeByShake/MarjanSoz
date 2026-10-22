"use client";

import { useState } from "react";
import type { IndexedProverb } from "@/lib/proverbs";
import {
  applyBlank,
  blankSource,
  changeType,
  fillFromBalama,
  fillFromProverb,
  orderCells,
  problem,
  QUESTION_TYPES,
  refillOptions,
  typeInfo,
} from "@/lib/questions";
import type { BalamaWord, LessonQuestion, Topic } from "@/lib/types";
import { LibraryPicker } from "./LibraryPicker";
import { dangerBtn, NumberField, smallBtn, TextField } from "./shared";

/** Подсказка-пример для каждого типа: как заполнить и что увидит ученик. */
const EXAMPLES: Record<LessonQuestion["type"], { how: string; student: string }> = {
  ending: {
    how: "Мақалдың басын ғана жазыңыз (соңынсыз). Төменгі нұсқалардың біреуіне дұрыс жалғасын, қалғандарына қате сөздерді жазып, дұрысын белгілеңіз.",
    student: "Өнер алды — қызыл …   [тіл]  [ауыз]  [мұрын]  [көз]",
  },
  meaning: {
    how: "«Мақал / мәтін» өрісіне мақалды жазыңыз, нұсқаларға мағыналарды жазып, дұрысын белгілеңіз.",
    student: "«Өнер алды — қызыл тіл»   [Сөз — өнердің ең биігі]  [Еңбек адамды асырайды]",
  },
  blank: {
    how: "Мақалды толық жазып, жасыратын сөзді тік сызықтардың ішіне алыңыз: Өнер алды — |қызыл| тіл. Сызықтардың ішіндегі сөз дұрыс нұсқа болады, оқушы оны көрмейді.",
    student: "Өнер алды — _____ тіл   [қызыл]  [ұзын]  [ащы]",
  },
  write: {
    how: "Мақалдың басын ғана жазыңыз, ал оқушы жазуы керек жалғасын «Дұрыс жауап» өрісіне жазыңыз.",
    student: "Өнер алды — қызыл …   (оқушы өзі жазады: тіл)",
  },
  match: {
    how: "Әр жолдың сол жағына мақал, оң жағына оның мағынасы. Кемінде 2 жұп керек.",
    student: "Мақалдар мен мағыналар араласып беріледі, оқушы әрқайсысына мағынасын таңдайды.",
  },
  order: {
    how: "Әр ұяшыққа бір сөз жазыңыз, дұрыс ретпен. «＋ Сөз қосу» не Enter — жаңа ұяшық. Оқушыға ұяшықтар араласып беріледі.",
    student: "[тіл]  [Өнер]  [қызыл]  [алды]  →  Өнер алды қызыл тіл",
  },
  single: {
    how: "Сұрақты жазыңыз, нұсқаларды толтырып, бір дұрысын белгілеңіз.",
    student: "«Өнер алды — қызыл тіл» не туралы?   [Сөз өнері]  [Еңбек]  [Отан]",
  },
  multiple: {
    how: "Сұрақты жазыңыз, дұрыс нұсқалардың бәрін белгілеңіз.",
    student: "Сөз туралы мақалдарды таңдаңыз:   [Өнер алды — қызыл тіл]  [Тіл — тас жарады]  [Еңбек — ер азығы]",
  },
  truefalse: {
    how: "Тұжырымды жазып, «Дұрыс» не «Бұрыс» нұсқасын белгілеңіз.",
    student: "«Өнер алды — қызыл тіл» — еңбек туралы мақал.   [Дұрыс]  [Бұрыс]",
  },
};

/** Поле «text» для каждого типа: подпись, пример и подсказка. */
const TEXT_FIELD: Record<LessonQuestion["type"], { label: string; placeholder: string; hint?: string }> = {
  ending: { label: "Мақалдың басы (оқушы көреді)", placeholder: "Мысалы: Өнер алды — қызыл", hint: "Жалғасын мұнда жазбаңыз — ол төмендегі нұсқаларда болады." },
  write: { label: "Мақалдың басы (оқушы көреді)", placeholder: "Мысалы: Өнер алды — қызыл", hint: "Жалғасын төмендегі «Дұрыс жауап» өрісіне жазыңыз." },
  blank: { label: "", placeholder: "" },
  meaning: { label: "Мақал", placeholder: "Мысалы: Өнер алды — қызыл тіл" },
  single: { label: "Сұрақ мәтіні", placeholder: "Мысалы: «Өнер алды — қызыл тіл» мақалы не туралы?" },
  multiple: { label: "Сұрақ мәтіні", placeholder: "Мысалы: Сөз туралы мақалдарды таңдаңыз" },
  truefalse: { label: "Тұжырым", placeholder: "Мысалы: «Өнер алды — қызыл тіл» — еңбек туралы мақал." },
  match: { label: "", placeholder: "" },
  order: { label: "", placeholder: "" },
};

/** Примеры в пустых вариантах ответа. */
const OPTION_EXAMPLES: Partial<Record<LessonQuestion["type"], string[]>> = {
  ending: ["тіл", "ауыз", "мұрын", "көз"],
  blank: ["қызыл", "ұзын", "ащы"],
  meaning: ["Сөз — өнердің ең биігі", "Еңбек адамды асырайды", "Отанды сүю"],
  single: ["Сөз өнері", "Еңбек", "Отан"],
  multiple: ["Өнер алды — қызыл тіл", "Тіл — тас жарады", "Еңбек — ер азығы"],
};

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

          <div className="rounded-xl border border-line bg-card p-3 text-sm">
            <p>
              <span className="font-semibold">Қалай толтыру: </span>
              {EXAMPLES[q.type].how}
            </p>
            <p className="mt-1.5">
              <span className="font-semibold">Оқушы көреді: </span>
              <span className="font-serif text-proverb italic">{EXAMPLES[q.type].student}</span>
            </p>
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

          {q.type === "blank" ? (
            <BlankEditor q={q} onChange={onChange} />
          ) : (
            info.shape !== "order" &&
            info.shape !== "match" && (
              <TextField
                label={TEXT_FIELD[q.type].label}
                value={q.text}
                onChange={(v) => set("text", v)}
                multiline
                placeholder={TEXT_FIELD[q.type].placeholder}
                hint={TEXT_FIELD[q.type].hint}
              />
            )
          )}

          {info.shape === "choice" && <ChoiceEditor q={q} onChange={onChange} />}

          {(q.type === "ending" || q.type === "blank") && (
            <button
              type="button"
              className={smallBtn}
              disabled={!q.options[q.correct[0] ?? -1]?.trim()}
              onClick={() => onChange(refillOptions(q, libs.proverbs))}
            >
              ⚡ Қате нұсқаларды кітапханадан толтыру
            </button>
          )}

          {info.shape === "write" && (
            <TextField
              label="Дұрыс жауап (оқушы жазуы керек бөлік)"
              value={q.answer}
              onChange={(v) => set("answer", v)}
              placeholder="Мысалы: тіл"
              hint="Бірнеше жауап дұрыс саналса, оларды «|» арқылы жазыңыз. Мысалы: қызыл тіл|тіл. Бас әріп пен тыныс белгілері есепке алынбайды."
            />
          )}

          {info.shape === "order" && (
            <>
              <OrderEditor q={q} onChange={onChange} />
              <TextField
                label="Көмекші мәтін (міндетті емес)"
                value={q.text}
                onChange={(v) => set("text", v)}
                placeholder="Мысалы: Сөз өнері туралы мақал"
              />
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
  // В «Орын толтыру» правильный вариант берётся из |…| и меняется только там
  const locked = q.type === "blank";
  const examples = OPTION_EXAMPLES[q.type];

  function toggle(i: number) {
    if (locked) return;
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
        Жауап нұсқалары{" "}
        <span className="font-normal text-muted">
          ({locked ? "дұрысы |...| ішінен өзі толады, қалғандарына қате сөздер жазыңыз" : many ? "дұрыстарының бәрін белгілеңіз" : "дұрысын белгілеңіз"})
        </span>
      </legend>
      {q.options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type={many ? "checkbox" : "radio"}
            name={`correct-${q.id}`}
            checked={q.correct.includes(i)}
            onChange={() => toggle(i)}
            disabled={locked && !q.correct.includes(i)}
            aria-label={`${i + 1}-нұсқа дұрыс`}
            className="h-5 w-5 shrink-0 accent-[var(--success)]"
          />
          <input
            value={o}
            readOnly={fixed || (locked && q.correct.includes(i))}
            title={locked && q.correct.includes(i) ? "Бұл нұсқа мақалдағы |...| ішінен өзі толады" : undefined}
            onChange={(e) => onChange({ ...q, options: q.options.map((x, j) => (j === i ? e.target.value : x)) })}
            placeholder={fixed ? undefined : examples?.[i] ? `Мысалы: ${examples[i]}` : `${i + 1}-нұсқа`}
            aria-label={`${i + 1}-нұсқа`}
            className={`field ${q.correct.includes(i) ? "border-success" : ""}`}
          />
          {!fixed && !(locked && q.correct.includes(i)) && (
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
            placeholder={i === 0 ? "Мысалы: Өнер алды — қызыл тіл" : "Мақал"}
            aria-label={`${i + 1}-жұп: мақал`}
            className="field resize-y"
          />
          <textarea
            value={p.right}
            onChange={(e) => setPair(i, "right", e.target.value)}
            rows={2}
            placeholder={i === 0 ? "Мысалы: Сөз — өнердің ең биігі" : "Мағынасы"}
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

/** «Орын толтыру»: мақал, где пропуск отмечен прямыми скобками |…|. */
function BlankEditor({ q, onChange }: { q: LessonQuestion; onChange: (q: LessonQuestion) => void }) {
  const source = blankSource(q);
  const right = q.text.includes("_____") ? q.options[q.correct[0] ?? -1] : "";
  return (
    <div className="space-y-3 rounded-xl border border-gold/50 bg-card p-4">
      <TextField
        label="Мақал (жасырын сөзді |...| ішіне жазыңыз)"
        value={source}
        onChange={(v) => onChange(applyBlank(q, v))}
        multiline
        placeholder="Мысалы: Өнер алды — |қызыл| тіл"
        hint="Тік сызықтардың ішіндегі сөз оқушыға _____ болып көрінеді және дұрыс нұсқа болады."
      />
      <div className="rounded-lg bg-bg p-3 text-sm">
        <p>
          <span className="text-muted">Оқушы көреді: </span>
          <span className="font-serif text-proverb italic">{q.text || "—"}</span>
        </p>
        <p className="mt-1">
          <span className="text-muted">Дұрыс жауап: </span>
          <strong>{right || "— сөз |...| ішіне алынбаған"}</strong>
        </p>
      </div>
    </div>
  );
}

/** «Сөздерден құра»: по одному слову в ячейке, в правильном порядке. */
function OrderEditor({ q, onChange }: { q: LessonQuestion; onChange: (q: LessonQuestion) => void }) {
  const stored = orderCells(q);
  const cells = stored.length ? stored : [""];
  const [focusLast, setFocusLast] = useState(false);
  const save = (next: string[]) => onChange({ ...q, answer: next.join("|") });
  const add = () => {
    setFocusLast(true);
    save([...cells, ""]);
  };

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">
        Сөздер <span className="font-normal text-muted">(әр ұяшыққа бір сөз, дұрыс ретпен — оқушыға араласып беріледі)</span>
      </legend>
      <ol className="flex flex-wrap gap-2">
        {cells.map((c, i) => (
          <li key={i} className="flex items-center gap-1 rounded-xl border border-line bg-card py-1 pr-1 pl-2.5">
            <span className="text-xs text-muted">{i + 1}</span>
            <input
              value={c}
              autoFocus={focusLast && i === cells.length - 1}
              onChange={(e) => save(cells.map((x, j) => (j === i ? e.target.value.replace(/\|/g, "") : x)))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder={["Өнер", "алды", "—", "қызыл", "тіл"][i] ?? "сөз"}
              aria-label={`${i + 1}-сөз`}
              size={Math.max(6, c.length + 1)}
              className="min-w-0 rounded-lg bg-transparent px-1.5 py-1.5 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => save(cells.filter((_, j) => j !== i))}
              disabled={cells.length === 1}
              aria-label={`${i + 1}-сөзді жою`}
              className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-red-700/10 hover:text-red-700 disabled:opacity-30"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className={smallBtn} onClick={add}>
        ＋ Сөз қосу
      </button>
    </fieldset>
  );
}
