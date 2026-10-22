"use client";

import { useDeferredValue, useMemo, useState, useSyncExternalStore } from "react";
import { ChevronDownIcon, SearchIcon } from "@/components/Icons";
import { AiExplainButton } from "@/components/MarjanUstaz";
import { EmptyState } from "@/components/ui";
import { useBalama } from "@/lib/balama";
import { normalize } from "@/lib/proverbs";

// Сколько колонок помещается: как брейкпоинты sm / lg у Tailwind
const QUERIES = ["(min-width: 1024px)", "(min-width: 640px)"];
function subscribeColumns(onChange: () => void) {
  const lists = QUERIES.map((q) => matchMedia(q));
  lists.forEach((l) => l.addEventListener("change", onChange));
  return () => lists.forEach((l) => l.removeEventListener("change", onChange));
}
const getColumns = () => (matchMedia(QUERIES[0]).matches ? 3 : matchMedia(QUERIES[1]).matches ? 2 : 1);

export function BalamaList() {
  const columns = useSyncExternalStore(subscribeColumns, getColumns, () => 1);
  const { words } = useBalama();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = normalize(deferred);
    return q ? words.filter((w) => normalize(`${w.text} ${w.definition}`).includes(q)) : words;
  }, [words, deferred]);

  // Кладка: карточки раскладываются по колонкам по очереди (1-я, 2-я, 3-я, снова 1-я…),
  // поэтому порядок чтения остаётся построчным, а раскрытая карточка сдвигает вниз только свою колонку
  const stacks = Array.from({ length: columns }, (_, c) => filtered.filter((_, i) => i % columns === c));

  return (
    <div>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-6">
        <label className="relative block">
          <span className="sr-only">Балама сөз іздеу</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Балама сөз іздеу..."
            className="field pl-11"
          />
        </label>
      </form>

      <p aria-live="polite" className="mb-4 text-sm text-muted">
        {filtered.length} балама сөз табылды
      </p>

      {filtered.length === 0 ? (
        <EmptyState icon={<SearchIcon size={24} />} title="Ештеңе табылмады" text="Басқа сөзбен іздеп көріңіз." />
      ) : (
        <div className="flex items-start gap-4">
          {stacks.map((stack, c) => (
            <ul key={c} className="flex min-w-0 flex-1 flex-col gap-4">
              {stack.map((w) => (
                <li key={w.id}>
                  <details className="group card overflow-hidden transition-colors open:border-gold/60">
                    <summary className="flex cursor-pointer list-none items-center gap-4 p-5 transition-colors hover:bg-primary/4 [&::-webkit-details-marker]:hidden">
                      {/* Буквица: первая буква тіркеса в ромбе — вместо эмодзи */}
                      <span
                        aria-hidden="true"
                        className="grid h-11 w-11 shrink-0 rotate-45 place-items-center rounded-lg border border-gold/50 bg-gold/10"
                      >
                        <span className="-rotate-45 font-serif text-lg font-semibold text-gold-text">{w.text.trim().charAt(0).toLocaleUpperCase("kk")}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-serif text-lg leading-snug font-semibold text-heading">{w.text}</span>
                        <span className="mt-0.5 block text-sm text-muted group-open:hidden">Мағынасын көру</span>
                      </span>
                      <ChevronDownIcon className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <p className="border-t border-line px-5 py-4">{w.definition}</p>
                    <div className="px-5 pb-5">
                      <AiExplainButton kind="balama" id={w.id} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          ))}
        </div>
      )}
    </div>
  );
}
