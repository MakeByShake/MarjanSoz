"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Pagination, PagerCompact } from "@/components/Pagination";
import { SearchIcon } from "@/components/Icons";
import { EmptyState, LoadError, Loading } from "@/components/ui";
import { normalize, topicMeta, useLibrary } from "@/lib/proverbs";

const PAGE_SIZE = 20;

export function ProverbLibrary() {
  const { proverbs, topics, loading, error } = useLibrary();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [page, setPage] = useState(1);

  // Поиск не блокирует ввод даже на тысячах мақалов
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = normalize(deferredQuery);
    return proverbs.filter((p) => (topic === "all" || p.topic === topic) && (!q || p.search.includes(q)));
  }, [proverbs, deferredQuery, topic]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    proverbs.forEach((p) => c.set(p.topic, (c.get(p.topic) ?? 0) + 1));
    return c;
  }, [proverbs]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const goTo = (n: number) => {
    setPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error) return <LoadError />;
  if (loading) return <Loading />;

  return (
    <div>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Мақал іздеу</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Мақал не сөз іздеу..."
            className="field pl-11"
          />
        </label>
        <label className="sm:w-72">
          <span className="sr-only">Тақырып бойынша сүзу</span>
          <select
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setPage(1);
            }}
            className="field"
          >
            <option value="all">Барлық тақырыптар ({topics.length})</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({counts.get(t.id) ?? 0})
              </option>
            ))}
          </select>
        </label>
      </form>

      <div className="mb-4 flex items-center justify-between gap-4">
        <p aria-live="polite" className="text-sm text-muted">
          {filtered.length} мақал табылды
        </p>
        <PagerCompact page={current} pages={pages} onPage={setPage} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<SearchIcon size={24} />} title="Ештеңе табылмады" text="Басқа сөзбен іздеп көріңіз." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((p) => (
            <li
              key={p.id}
              className="card relative flex flex-col overflow-hidden p-6 pl-14 [content-visibility:auto] [contain-intrinsic-size:auto_220px]"
            >
              <span aria-hidden="true" className="absolute top-3 left-5 font-serif text-5xl leading-none text-gold/70">
                «
              </span>
              <p className="font-serif text-lg leading-snug font-medium text-proverb italic">{p.text}</p>
              <p className="mt-3 flex-1 text-[15px]">{p.explanation || <span className="text-muted">Түсіндірмесі әлі қосылмаған.</span>}</p>
              {p.translation_ru && (
                <p lang="ru" className="mt-2 text-sm text-muted">
                  {p.translation_ru}
                </p>
              )}
              <p className="mt-4 border-t border-line pt-3 text-xs font-semibold tracking-[0.14em] text-gold-text uppercase">
                {topicMeta(topics, p.topic).title}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={current} pages={pages} onPage={goTo} />
    </div>
  );
}
