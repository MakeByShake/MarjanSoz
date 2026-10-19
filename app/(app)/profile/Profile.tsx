"use client";

import { OrnateCard } from "@/components/Ornament";
import { Loading, ProgressBar } from "@/components/ui";
import { groupByTopic, useProverbs } from "@/lib/proverbs";
import { levelFor, useCurrentUser } from "@/lib/user";

export function Profile() {
  const user = useCurrentUser();
  const { proverbs } = useProverbs();

  if (!user) return <Loading />;

  const total = proverbs.length;
  const ids = new Set(proverbs.map((p) => p.id));
  const learned = user.completedProverbs.filter((id) => ids.has(id)).length;
  const topicsTotal = groupByTopic(proverbs).size;
  const topicsDone = user.completedTopics?.length ?? 0;
  const points = user.points;
  const level = levelFor(points);

  const achievements = [
    { icon: "🎯", title: "Алғашқы қадам", text: "Алғашқы мақалды үйрену", value: learned, goal: 1 },
    { icon: "🏆", title: "Мақал шебері", text: "10 мақалды үйрену", value: learned, goal: 10 },
    { icon: "👑", title: "Ұлы данышпан", text: "Барлық мақалдарды үйрену", value: learned, goal: Math.max(total, 1) },
    { icon: "📗", title: "Тақырып иесі", text: "Бір тақырыпты толық аяқтау", value: topicsDone, goal: 1 },
    { icon: "⭐", title: "Білім иесі", text: "100 ұпай жинау", value: points, goal: 100 },
    { icon: "🌟", title: "Тәжірибелі оқушы", text: "300 ұпай жинау", value: points, goal: 300 },
    { icon: "💎", title: "Абсолютті шебер", text: "500 ұпай жинау", value: points, goal: 500 },
  ].map((a) => ({ ...a, progress: Math.min(100, (a.value / a.goal) * 100), unlocked: a.value >= a.goal }));

  const initials =
    user.username
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toLocaleUpperCase("kk") || "П";

  const joined = user.createdAt ? new Date(user.createdAt).toLocaleDateString("kk-KZ") : "—";

  const stats = [
    { value: points, label: "Жиналған ұпай" },
    { value: `${topicsDone}/${topicsTotal}`, label: "Аяқталған сабақ" },
    { value: learned, label: "Үйренген мақал" },
    { value: achievements.filter((a) => a.unlocked).length, label: "Жетістік" },
  ];

  return (
    <div className="space-y-8">
      <OrnateCard className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div
            aria-hidden="true"
            className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-gold bg-primary font-serif text-3xl font-bold text-white"
          >
            {initials}
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold text-heading">{user.username}</h1>
            <p className="text-muted">{user.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-white">{level.name}</span>
              <span className="rounded-full border border-line px-3 py-1 text-sm">Тіркелген күні: {joined}</span>
            </div>
          </div>
        </div>
      </OrnateCard>

      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <li key={s.label} className="rounded-2xl border border-line bg-card p-5 text-center shadow-sm">
            <span className="block font-serif text-3xl font-bold text-heading">{s.value}</span>
            <span className="text-sm text-muted">{s.label}</span>
          </li>
        ))}
      </ul>

      <section aria-labelledby="study-title" className="rounded-2xl border border-line bg-card p-6 shadow-sm">
        <h2 id="study-title" className="mb-4 font-serif text-xl font-bold text-heading">
          Оқу жетістігі
        </h2>
        <ProgressBar value={total ? (learned / total) * 100 : 0} label="Жалпы прогресс" large />
        <p className="mt-2 text-sm text-muted">
          Жалпы прогресс: {learned}/{total} мақал ({total ? Math.round((learned / total) * 100) : 0}%)
        </p>
      </section>

      <section aria-labelledby="ach-title">
        <h2 id="ach-title" className="mb-4 font-serif text-xl font-bold text-heading">
          Жетістіктер
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {achievements.map((a) => (
            <li
              key={a.title}
              className={`flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm ${
                a.unlocked ? "border-gold" : "border-line"
              }`}
            >
              <span aria-hidden="true" className={`text-4xl ${a.unlocked ? "" : "opacity-40 grayscale"}`}>
                {a.icon}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-sm text-muted">{a.text}</p>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar value={a.progress} label={`${a.title}: прогресс`} />
                  <span className="w-10 text-right text-xs text-muted">{Math.round(a.progress)}%</span>
                </div>
              </div>
              <span className="text-xl">{a.unlocked ? <span aria-label="Ашылды">✅</span> : <span aria-label="Жабық">🔒</span>}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
