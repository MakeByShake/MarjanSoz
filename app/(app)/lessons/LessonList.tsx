"use client";

import Link from "next/link";
import { Loading, ProgressBar } from "@/components/ui";
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
    return <p className="py-16 text-center text-muted">Сабақтар әлі қосылмаған. Кейінірек тексеріңіз.</p>;
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {lessons.data.map((l) => {
        const max = l.tasks.reduce((s, t) => s + taskMax(t), 0);
        const r = results.data?.get(l.id);
        const score = r ? effective(r) : 0;
        return (
          <li key={l.id}>
            <Link
              href={`/lessons/${encodeURIComponent(l.id)}`}
              className="flex h-full flex-col rounded-2xl border-2 border-transparent bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary hover:shadow-lg dark:hover:border-gold"
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-gold/60 bg-primary/10 text-2xl dark:bg-gold/10"
                >
                  {l.icon}
                </span>
                <h2 className="font-serif text-lg font-bold leading-snug text-heading">
                  {l.title}
                  {!l.published && <span className="ml-2 text-xs font-normal text-muted">(черновик)</span>}
                </h2>
              </div>
              <p className="flex-1 text-muted">{l.description}</p>
              <div className="mt-4">
                <ProgressBar value={max ? (Math.min(score, max) / max) * 100 : 0} label={`${l.title}: прогресс`} />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>
                    {score}/{max} балл · {l.tasks.length} тапсырма
                  </span>
                  <span className="font-semibold text-primary dark:text-gold">
                    {r?.completed ? "Аяқталды ✅" : r ? "Жалғастыру →" : "Бастау →"}
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
