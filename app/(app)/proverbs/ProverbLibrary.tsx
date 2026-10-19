"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { LoadError, Loading } from "@/components/ui";
import { getTopicMeta } from "@/lib/topics";
import { groupByTopic, normalize, useProverbs } from "@/lib/proverbs";
import { useCurrentUser } from "@/lib/user";

const PAGE_SIZE = 24;

export function ProverbLibrary() {
  const user = useCurrentUser();
  const { proverbs, loading, error } = useProverbs();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);

  // Поиск не блокирует ввод даже на тысячах мақалов
  const deferredQuery = useDeferredValue(query);

  const topics = useMemo(() => [...groupByTopic(proverbs).keys()], [proverbs]);
  const learned = useMemo(() => new Set(user?.completedProverbs), [user]);

  const filtered = useMemo(() => {
    const q = normalize(deferredQuery);
    return proverbs.filter((p) => (topic === "all" || p.topic === topic) && (!q || p.search.includes(q)));
  }, [proverbs, deferredQuery, topic]);

  const visible = filtered.slice(0, limit);
  const hasMore = visible.length < filtered.length;

  // Бесконечный скролл: подгружаем следующую порцию, когда низ списка виден
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && setLimit((l) => l + PAGE_SIZE),
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

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
              setLimit(PAGE_SIZE);
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
              setLimit(PAGE_SIZE);
            }}
            className="field"
          >
            <option value="all">Барлық тақырыптар</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {getTopicMeta(t).title}
              </option>
            ))}
          </select>
        </label>
      </form>

      <p aria-live="polite" className="mb-4 text-sm text-muted">
        {filtered.length} мақал табылды
      </p>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted">Ештеңе табылмады. Басқа сөзбен іздеп көріңіз.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((p) => {
            const isLearned = learned.has(p.id);
            return (
              <li
                key={p.id}
                className="flex flex-col rounded-2xl border border-line border-l-4 border-l-gold bg-card p-5 shadow-sm [content-visibility:auto] [contain-intrinsic-size:auto_220px]"
              >
                <p className="font-serif text-lg italic text-proverb">«{p.text}»</p>
                <p className="mt-2 flex-1">{p.explanation}</p>
                {p.translation_ru && (
                  <p lang="ru" className="mt-2 text-sm text-muted">
                    {p.translation_ru}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary-dark dark:bg-gold/15 dark:text-gold">
                    {getTopicMeta(p.topic).title}
                  </span>
                  <span className={isLearned ? "font-medium text-primary dark:text-gold" : "text-muted"}>
                    {isLearned ? "✅ Үйрендім" : "📚 Үйрену керек"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <div ref={sentinel} className="mt-8 text-center">
          <button type="button" className="btn-secondary" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            Тағы көрсету ({filtered.length - visible.length})
          </button>
        </div>
      )}
    </div>
  );
}
