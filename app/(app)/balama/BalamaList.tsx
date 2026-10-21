"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ChevronDownIcon, SearchIcon } from "@/components/Icons";
import { EmptyState } from "@/components/ui";
import { useBalama } from "@/lib/balama";
import { normalize } from "@/lib/proverbs";

export function BalamaList() {
  const { words } = useBalama();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = normalize(deferred);
    return q ? words.filter((w) => normalize(`${w.text} ${w.definition}`).includes(q)) : words;
  }, [words, deferred]);

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
        <ul className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w) => (
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
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
