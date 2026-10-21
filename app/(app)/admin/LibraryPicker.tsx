"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { normalize, type IndexedProverb } from "@/lib/proverbs";
import type { BalamaWord, Topic } from "@/lib/types";

export type Picked = { kind: "proverb"; item: IndexedProverb } | { kind: "balama"; item: BalamaWord };

const LIMIT = 50;

/**
 * Окно выбора из библиотеки мақалов или балама сөздер.
 * multiple — окно не закрывается после выбора (добавление нескольких мақалов в урок).
 */
export function LibraryPicker({
  open,
  onClose,
  onPick,
  proverbs,
  balama,
  topics,
  kinds = ["proverb", "balama"],
  multiple,
  chosen,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (p: Picked) => void;
  proverbs: IndexedProverb[];
  balama: BalamaWord[];
  topics: Topic[];
  kinds?: Picked["kind"][];
  multiple?: boolean;
  chosen?: Set<string>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<Picked["kind"]>(kinds[0]);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const deferred = useDeferredValue(query);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const list = useMemo(() => {
    const q = normalize(deferred);
    if (kind === "proverb") {
      return proverbs.filter((p) => (topic === "all" || p.topic === topic) && (!q || p.search.includes(q))).slice(0, LIMIT);
    }
    return balama.filter((w) => !q || normalize(`${w.text} ${w.definition}`).includes(q)).slice(0, LIMIT);
  }, [kind, proverbs, balama, deferred, topic]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto max-h-[85vh] open:flex w-[min(94vw,44rem)] flex-col rounded-2xl border border-line bg-card p-0 text-text shadow-xl backdrop:bg-black/50"
    >
      <div className="space-y-3 border-b border-line p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-bold text-heading">Кітапханадан таңдау</h2>
          <button type="button" onClick={onClose} aria-label="Жабу" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-track">
            ✕
          </button>
        </div>
        {kinds.length > 1 && (
          <div className="flex gap-2">
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                  kind === k ? "border-primary bg-primary text-white dark:border-gold dark:bg-gold dark:text-bg" : "border-line"
                }`}
              >
                {k === "proverb" ? "📜 Мақалдар" : "🎭 Балама сөздер"}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Іздеу..."
            aria-label="Іздеу"
            className="field"
          />
          {kind === "proverb" && (
            <select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Тақырып" className="field sm:w-56">
              <option value="all">Барлық тақырыптар</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <ul className="flex-1 divide-y divide-line overflow-y-auto">
        {list.map((item) => {
          const isChosen = chosen?.has(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={isChosen}
                onClick={() => {
                  onPick(kind === "proverb" ? { kind, item: item as IndexedProverb } : { kind: "balama", item: item as BalamaWord });
                  if (!multiple) onClose();
                }}
                className="block w-full px-5 py-3 text-left transition hover:bg-primary/5 disabled:opacity-50 dark:hover:bg-gold/10"
              >
                <span className="block font-serif italic text-proverb">
                  {isChosen && "✓ "}
                  {item.text}
                </span>
                <span className="line-clamp-1 text-sm text-muted">
                  {"explanation" in item ? item.explanation : item.definition}
                </span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="p-8 text-center text-muted">Ештеңе табылмады</li>}
      </ul>
      {multiple && (
        <div className="border-t border-line p-4 text-right">
          <button type="button" className="btn-primary" onClick={onClose}>
            Дайын
          </button>
        </div>
      )}
    </dialog>
  );
}
