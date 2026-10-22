"use client";

import Link from "next/link";
import { ArrowRightIcon, BookIcon, QuoteIcon, ScrollIcon, TrophyIcon } from "@/components/Icons";
import { AiExplainButton } from "@/components/MarjanUstaz";
import { OrnamentBand, Rhomb, Shanyrak } from "@/components/Ornament";
import { ProgressBar, SectionTitle, Spinner } from "@/components/ui";
import { useLessons, useMyResults } from "@/lib/lessons";
import { proverbOfTheDay, useLibrary } from "@/lib/proverbs";
import { levelFor, useCurrentUser } from "@/lib/user";

const ACTIONS = [
  { href: "/lessons", Icon: BookIcon, title: "Сабақтар", text: "Мақалдарды оқып, тапсырмаларды орындаңыз" },
  { href: "/proverbs", Icon: ScrollIcon, title: "Мақалдар кітапханасы", text: "Мыңдаған мақал — түсіндірмесімен" },
  { href: "/balama", Icon: QuoteIcon, title: "Балама сөздер", text: "Тұрақты сөз тіркестерінің мағынасы" },
  { href: "/rating", Icon: TrophyIcon, title: "Рейтинг", text: "Ең белсенді оқушылар тізімі" },
];

export function Dashboard() {
  const user = useCurrentUser();
  const { proverbs, loading, error } = useLibrary();
  const daily = proverbOfTheDay(proverbs);

  const lessons = useLessons(false);
  const results = useMyResults(user?.id);
  const total = lessons.data?.length ?? 0;
  const completed = (lessons.data ?? []).filter((l) => results.data?.get(l.id)?.completed).length;
  const percent = total ? (completed / total) * 100 : 0;
  const points = user?.points ?? 0;
  const level = levelFor(points);

  return (
    <div className="space-y-12">
      <div className="grid items-start gap-5 lg:grid-cols-[1.75fr_1fr]">
        <section
          aria-labelledby="daily-title"
          className="relative isolate flex min-h-80 flex-col overflow-hidden rounded-3xl bg-panel text-on-panel"
        >
          <Shanyrak className="spin-slow pointer-events-none absolute -top-28 -right-28 -z-10 h-96 w-96 text-gold/15" />
          <div className="flex flex-1 flex-col px-6 pt-7 pb-8 sm:px-10 sm:pt-9">
            <h2 id="daily-title" className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-gold uppercase">
              <Rhomb />
              Күннің мақалы
            </h2>
            {error ? (
              <p className="mt-6 text-on-panel/80">Мақалдарды жүктеу мүмкін болмады. Бетті жаңартып көріңіз.</p>
            ) : loading ? (
              <p role="status" className="mt-8 flex items-center gap-3 text-on-panel/80">
                <Spinner className="h-5 w-5 text-gold" />
                Жүктелуде...
              </p>
            ) : !daily ? (
              <p className="mt-6 text-on-panel/80">Мақалдар әлі қосылмаған.</p>
            ) : (
              <figure className="mt-auto pt-10">
                <blockquote className="max-w-3xl font-serif text-[1.65rem] leading-snug font-medium italic sm:text-[2.1rem]">
                  <span aria-hidden="true" className="mr-1 text-gold">
                    «
                  </span>
                  {daily.text}
                  <span aria-hidden="true" className="ml-1 text-gold">
                    »
                  </span>
                </blockquote>
                <figcaption className="mt-5 max-w-2xl border-l-2 border-gold/60 pl-4">
                  <p className="text-on-panel/85">{daily.explanation}</p>
                  {daily.translation_ru && (
                    <p lang="ru" className="mt-2 text-sm text-on-panel/60">
                      {daily.translation_ru}
                    </p>
                  )}
                </figcaption>
                <div className="mt-6 max-w-3xl">
                  <AiExplainButton kind="proverb" id={daily.id} variant="dark" />
                </div>
              </figure>
            )}
          </div>
          <OrnamentBand kind="tumar" className="bg-gold/35" />
        </section>

        <section aria-labelledby="progress-title" className="card flex flex-col p-6 sm:p-7">
          <p className="kicker">
            <Rhomb />
            Сіздің жолыңыз
          </p>
          <h2 id="progress-title" className="mt-2 font-serif text-2xl font-semibold text-heading">
            {user ? `Сәлем, ${user.username.split(/\s+/)[0]}!` : "Сәлем!"}
          </h2>
          <dl className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted">Ұпай</dt>
              <dd className="font-serif text-3xl font-semibold text-heading">{points}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Деңгей</dt>
              <dd className="mt-1.5 font-medium leading-tight">{level.name}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-muted">Сабақтар</span>
              <span className="font-medium">
                {completed}/{total} · {Math.round(percent)}%
              </span>
            </div>
            <ProgressBar value={percent} label="Жалпы прогресс" large />
          </div>
          <div className="mt-auto pt-6">
            <Link href="/lessons" className="btn-primary w-full">
              {completed > 0 ? "Оқуды жалғастыру" : "Оқуды бастау"}
              <ArrowRightIcon size={18} />
            </Link>
          </div>
        </section>
      </div>

      <section aria-labelledby="sections-title">
        <SectionTitle id="sections-title" kicker="Бөлімдер" title="Не үйренеміз бүгін?" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map(({ href, Icon, title, text }) => (
            <li key={href}>
              <Link href={href} className="card-link group flex h-full flex-col p-5">
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-gold/40 bg-gold/10 text-gold-text">
                  <Icon size={28} />
                </span>
                <h3 className="mt-4 font-serif text-lg font-semibold text-heading">{title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted">{text}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary dark:text-gold">
                  Ашу
                  <ArrowRightIcon size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
