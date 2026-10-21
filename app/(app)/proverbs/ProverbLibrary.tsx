"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Pagination } from "@/components/Pagination";
import { LoadError, Loading } from "@/components/ui";
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
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm sm:flex-row"
      >
        <label className="flex-1">
          <span className="sr-only">Мақал іздеу</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Мақал іздеу..."
            className="field"
          />
        </label>
        <label className="sm:w-64">
          <span className="sr-only">Тақырып бойынша сүзу</span>
          <select
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              setPage(1);
            }}
            className="field"
          >
            <option value="all">Барлық тақырыптар</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.title} ({counts.get(t.id) ?? 0})
              </option>
            ))}
          </select>
        </label>
      </form>

      <p aria-live="polite" className="mb-4 text-sm text-muted">
        {filtered.length} мақал табылды{pages > 1 ? ` · ${current}/${pages} бет` : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted">Ештеңе табылмады. Басқа сөзбен іздеп көріңіз.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((p) => {
            return (
              <li
                key={p.id}
                className="flex flex-col rounded-2xl border border-line border-l-4 border-l-gold bg-card p-5 shadow-sm [content-visibility:auto] [contain-intrinsic-size:auto_220px]"
              >
                <p className="font-serif text-lg italic text-proverb">«{p.text}»</p>
                <p className="mt-2 flex-1">{p.explanation || <span className="text-muted">Түсіндірмесі әлі қосылмаған.</span>}</p>
                {p.translation_ru && (
                  <p lang="ru" className="mt-2 text-sm text-muted">
                    {p.translation_ru}
                  </p>
                )}
                <div className="mt-4 text-sm">
                  <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary-dark dark:bg-gold/15 dark:text-gold">
                    {topicMeta(topics, p.topic).title}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={current} pages={pages} onPage={goTo} />
    </div>
  );
}
