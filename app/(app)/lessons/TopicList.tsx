"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LoadError, Loading, ProgressBar } from "@/components/ui";
import { groupByTopic, topicMeta, useLibrary } from "@/lib/proverbs";
import { useCurrentUser } from "@/lib/user";

export function TopicList() {
  const user = useCurrentUser();
  const { proverbs, topics, loading, error } = useLibrary();
  const groups = useMemo(() => [...groupByTopic(proverbs, topics)], [proverbs, topics]);
  const learned = useMemo(() => new Set(user?.completedProverbs), [user]);

  if (error) return <LoadError />;
  if (loading) return <Loading />;
  if (groups.length === 0) {
    return <p className="py-16 text-center text-muted">Сабақтар әлі қосылмаған. Кейінірек тексеріңіз.</p>;
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map(([topic, list]) => {
        const meta = topicMeta(topics, topic);
        const done = list.filter((p) => learned.has(p.id)).length;
        return (
          <li key={topic}>
            <Link
              href={`/lessons/${encodeURIComponent(topic)}`}
              className="flex h-full flex-col rounded-2xl border-2 border-transparent bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary hover:shadow-lg dark:hover:border-gold"
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-gold/60 bg-primary/10 text-2xl dark:bg-gold/10"
                >
                  {meta.icon}
                </span>
                <h2 className="font-serif text-lg font-bold leading-snug text-heading">{meta.title}</h2>
              </div>
              <p className="flex-1 text-muted">{meta.description}</p>
              <div className="mt-4">
                <ProgressBar value={list.length ? (done / list.length) * 100 : 0} label={`${meta.title}: прогресс`} />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>
                    {done}/{list.length} мақал
                  </span>
                  <span className="font-semibold text-primary dark:text-gold">
                    {done === list.length ? "Аяқталды ✅" : done > 0 ? "Жалғастыру →" : "Бастау →"}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
