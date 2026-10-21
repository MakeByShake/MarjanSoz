"use client";

import Link from "next/link";
import { ArrowRightIcon, BookIcon, CheckIcon } from "@/components/Icons";
import { EmptyState, Loading, ProgressBar } from "@/components/ui";
import { effective, useLessons, useMyResults } from "@/lib/lessons";
import { taskMax } from "@/lib/questions";
import { useCurrentUser } from "@/lib/user";

export function LessonList() {
  const user = useCurrentUser();
  const lessons = useLessons(user?.isAdmin ?? false);
  const results = useMyResults(user?.id);

  if (lessons.error) {
    return (
      <p role="alert" className="py-16 text-center text-muted">
        Сабақтарды жүктеу мүмкін болмады. Бетті жаңартып көріңіз.
      </p>
    );
  }
  if (!lessons.data) return <Loading />;
  if (lessons.data.length === 0) {
    return <EmptyState icon={<BookIcon size={24} />} title="Сабақтар әлі қосылмаған" text="Кейінірек тексеріңіз." />;
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {lessons.data.map((l, n) => {
        const max = l.tasks.reduce((s, t) => s + taskMax(t), 0);
        const r = results.data?.get(l.id);
        const score = r ? effective(r) : 0;
        return (
          <li key={l.id}>
            <Link href={`/lessons/${encodeURIComponent(l.id)}`} className="card-link group flex h-full flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <span aria-hidden="true" className="font-serif text-4xl leading-none font-semibold text-gold-text/80">
                  {String(n + 1).padStart(2, "0")}
                </span>
                {r?.completed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-1 text-xs font-semibold text-success">
                    <CheckIcon size={14} />
                    Аяқталды
                  </span>
                ) : r ? (
                  <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold-text">Жалғасуда</span>
                ) : !l.published ? (
                  <span className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">Черновик</span>
                ) : null}
              </div>
              <h2 className="mt-5 font-serif text-xl leading-snug font-semibold text-heading">{l.title}</h2>
              <p className="mt-2 flex-1 text-muted">{l.description}</p>
              <div className="mt-6">
                <ProgressBar value={max ? (Math.min(score, max) / max) * 100 : 0} label={`${l.title}: прогресс`} />
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted">
                    {score}/{max} балл · {l.tasks.length} тапсырма
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-primary dark:text-gold">
                    {r?.completed ? "Қайталау" : r ? "Жалғастыру" : "Бастау"}
                    <ArrowRightIcon size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
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
