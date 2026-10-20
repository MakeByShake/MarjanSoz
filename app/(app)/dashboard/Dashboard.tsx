"use client";

import Link from "next/link";
import { Divider, OrnateCard } from "@/components/Ornament";
import { LoadError, ProgressBar } from "@/components/ui";
import { proverbOfTheDay, useLibrary } from "@/lib/proverbs";
import { useCurrentUser } from "@/lib/user";

const ACTIONS = [
  { href: "/lessons", icon: "📚", title: "Сабақтарды жалғастыру", text: "Мақалдарды үйренуді жалғастырыңыз" },
  { href: "/proverbs", icon: "📖", title: "Мақалдар кітапханасы", text: "Барлық мақалдарды оқып шығыңыз" },
  { href: "/balama", icon: "🎭", title: "Балама сөздер", text: "Тұрақты сөз тіркестерімен танысыңыз" },
  { href: "/rating", icon: "🏆", title: "Рейтинг", text: "Ең белсенді оқушылар тізімі" },
];

export function Dashboard() {
  const user = useCurrentUser();
  const { proverbs, loading, error } = useLibrary();
  const daily = proverbOfTheDay(proverbs);

  // Единый источник правды: всего мақалов = длина массива данных
  const total = proverbs.length;
  const ids = new Set(proverbs.map((p) => p.id));
  const completed = user ? user.completedProverbs.filter((id) => ids.has(id)).length : 0;
  const percent = total ? (completed / total) * 100 : 0;

  return (
    <div className="space-y-10">
      <section aria-labelledby="daily-title">
        <h2 id="daily-title" className="mb-6 text-center font-serif text-2xl font-bold text-heading sm:text-3xl">
          <span aria-hidden="true">🎯 </span>Күннің мақалы
        </h2>
        <OrnateCard className="text-center sm:py-12">
          {error ? (
            <LoadError />
          ) : loading ? (
            <p className="py-6 text-muted">Жүктелуде...</p>
          ) : !daily ? (
            <p className="py-6 text-muted">Мақалдар әлі қосылмаған.</p>
          ) : (
            <>
              <blockquote className="font-serif text-2xl italic leading-relaxed text-proverb sm:text-3xl">
                «{daily.text}»
              </blockquote>
              <Divider />
              <p className="mx-auto max-w-2xl text-lg">{daily.explanation}</p>
              {daily.translation_ru && (
                <p lang="ru" className="mx-auto mt-3 max-w-2xl text-sm text-muted">
                  {daily.translation_ru}
                </p>
              )}
            </>
          )}
        </OrnateCard>
      </section>

      <section aria-labelledby="progress-title" className="rounded-2xl border border-line bg-card p-6 text-center shadow-sm">
        <h3 id="progress-title" className="mb-4 font-serif text-xl font-bold text-heading">
          Сіздің жалпы прогрессіңіз
        </h3>
        <ProgressBar value={percent} label="Жалпы прогресс" large />
        <p className="mt-3 font-medium">
          {completed}/{total} мақал ({Math.round(percent)}%)
        </p>
        <p className="text-sm text-muted">
          {completed} үйрендіңіз, {Math.max(0, total - completed)} үйрену керек
        </p>
      </section>

      <section aria-label="Жылдам әрекеттер" className="grid gap-5 sm:grid-cols-2">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group rounded-2xl border-2 border-transparent bg-card p-7 text-center shadow-sm transition hover:-translate-y-1 hover:border-primary hover:shadow-lg dark:hover:border-gold"
          >
            <div aria-hidden="true" className="mb-3 text-5xl">
              {a.icon}
            </div>
            <h3 className="font-serif text-xl font-bold text-heading">{a.title}</h3>
            <p className="mt-1 text-muted">{a.text}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
