"use client";

import { BadgeCheckIcon, BookIcon, CheckIcon, CrownIcon, GemIcon, LockIcon, SparklesIcon, StarIcon, TargetIcon, TrophyIcon } from "@/components/Icons";
import { OrnamentBand, Shanyrak } from "@/components/Ornament";
import { Loading, ProgressBar, SectionTitle } from "@/components/ui";
import { taskPassed, useLessons, useMyResults } from "@/lib/lessons";
import { levelFor, useCurrentUser } from "@/lib/user";

export function Profile() {
  const user = useCurrentUser();
  const lessons = useLessons(false);
  const results = useMyResults(user?.id);

  if (!user) return <Loading />;

  const list = lessons.data ?? [];
  const lessonsTotal = list.length;
  const lessonsDone = list.filter((l) => results.data?.get(l.id)?.completed).length;
  const tasksDone = list.reduce(
    (s, l) => s + l.tasks.filter((t) => taskPassed(l, t.id, results.data?.get(l.id)?.tasks[t.id])).length,
    0,
  );
  const points = user.points;
  const level = levelFor(points);

  const achievements = [
    { Icon: TargetIcon, title: "Алғашқы қадам", text: "Алғашқы тапсырманы орындау", value: tasksDone, goal: 1 },
    { Icon: TrophyIcon, title: "Мақал шебері", text: "10 тапсырманы орындау", value: tasksDone, goal: 10 },
    { Icon: BookIcon, title: "Сабақ иесі", text: "Бір сабақты толық аяқтау", value: lessonsDone, goal: 1 },
    { Icon: CrownIcon, title: "Ұлы данышпан", text: "Барлық сабақтарды аяқтау", value: lessonsDone, goal: Math.max(lessonsTotal, 1) },
    { Icon: StarIcon, title: "Білім иесі", text: "100 ұпай жинау", value: points, goal: 100 },
    { Icon: SparklesIcon, title: "Тәжірибелі оқушы", text: "300 ұпай жинау", value: points, goal: 300 },
    { Icon: GemIcon, title: "Абсолютті шебер", text: "500 ұпай жинау", value: points, goal: 500 },
  ].map((a) => ({ ...a, progress: Math.min(100, (a.value / a.goal) * 100), unlocked: a.value >= a.goal }));

  const initials =
    user.username
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toLocaleUpperCase("kk") || "П";

  const joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString("kk-KZ") : "—";

  const unlocked = achievements.filter((a) => a.unlocked).length;
  const stats = [
    { value: points, label: "Жиналған ұпай" },
    { value: `${lessonsDone}/${lessonsTotal}`, label: "Аяқталған сабақ" },
    { value: tasksDone, label: "Орындалған тапсырма" },
    { value: `${unlocked}/${achievements.length}`, label: "Жетістік" },
  ];

  return (
    <div className="space-y-10">
      <section className="relative isolate overflow-hidden rounded-3xl bg-panel text-on-panel">
        <Shanyrak className="pointer-events-none absolute -right-20 -bottom-32 -z-10 h-80 w-80 text-gold/12" />
        <div className="flex flex-col items-center gap-6 px-6 py-8 text-center sm:flex-row sm:px-10 sm:text-left">
          <div
            aria-hidden="true"
            className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-2 border-gold/70 bg-white/8 font-serif text-3xl font-semibold ring-4 ring-gold/15"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">Профиль</p>
            <h1 className="mt-1 font-serif text-3xl font-semibold">{user.username}</h1>
            <p className="text-on-panel/70">{user.email}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-sm font-semibold text-[#1a1608]">
                <BadgeCheckIcon size={16} />
                {level.name}
              </span>
              <span className="rounded-full border border-white/20 px-3 py-1 text-sm text-on-panel/80">Тіркелген күні: {joined}</span>
            </div>
          </div>
        </div>
        <OrnamentBand kind="tumar" className="bg-gold/35" />
      </section>

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label} className="card p-5">
            <span className="block font-serif text-3xl font-semibold text-heading">{s.value}</span>
            <span className="text-sm text-muted">{s.label}</span>
          </li>
        ))}
      </ul>

      <section aria-labelledby="study-title" className="card p-6">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="study-title" className="font-serif text-xl font-semibold text-heading">
            Оқу жетістігі
          </h2>
          <span className="text-sm text-muted">
            {lessonsDone}/{lessonsTotal} сабақ · {lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0}%
          </span>
        </div>
        <ProgressBar value={lessonsTotal ? (lessonsDone / lessonsTotal) * 100 : 0} label="Жалпы прогресс" large />
      </section>

      <section aria-labelledby="ach-title">
        <SectionTitle id="ach-title" kicker={`${unlocked} ашылды`} title="Жетістіктер" />
        <ul className="grid gap-4 sm:grid-cols-2">
          {achievements.map(({ Icon, ...a }) => (
            <li key={a.title} className={`card flex items-center gap-4 p-4 ${a.unlocked ? "border-gold/60" : ""}`}>
              <span
                aria-hidden="true"
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${
                  a.unlocked ? "border-gold/50 bg-gold/15 text-gold-text" : "border-line bg-bg text-muted/70"
                }`}
              >
                <Icon size={28} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-sm text-muted">{a.text}</p>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar value={a.progress} label={`${a.title}: прогресс`} />
                  <span className="w-10 text-right text-xs text-muted">{Math.round(a.progress)}%</span>
                </div>
              </div>
              {a.unlocked ? (
                <CheckIcon size={20} className="shrink-0 text-success" aria-hidden={false} aria-label="Ашылды" role="img" />
              ) : (
                <LockIcon size={18} className="shrink-0 text-muted/70" aria-hidden={false} aria-label="Жабық" role="img" />
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
