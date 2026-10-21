"use client";

import { useDeferredValue, useMemo, useState } from "react";
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
      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-6 rounded-2xl border border-line bg-card p-4 shadow-sm">
        <label>
          <span className="sr-only">Балама сөз іздеу</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Балама сөз іздеу..."
            className="field"
          />
        </label>
      </form>

      <p aria-live="polite" className="mb-4 text-sm text-muted">
        {filtered.length} балама сөз табылды
      </p>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((w) => (
          <li key={w.id}>
            <details className="group h-full rounded-2xl border border-line border-t-4 border-t-gold bg-card shadow-sm transition open:shadow-md">
              <summary className="flex cursor-pointer list-none items-start gap-3 p-5 [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="text-3xl">
                  {w.icon}
                </span>
                <span className="flex-1">
                  <span className="block font-serif text-lg font-bold text-heading">{w.text}</span>
                  <span className="mt-1 block text-sm text-muted group-open:hidden">Мағынасын көру</span>
                </span>
                <span aria-hidden="true" className="text-muted transition group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <p className="px-5 pb-5">{w.definition}</p>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
