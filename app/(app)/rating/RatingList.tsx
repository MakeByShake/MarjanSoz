"use client";

import { Loading } from "@/components/ui";
import { levelFor, useCurrentUser, useRating } from "@/lib/user";

const MEDALS = ["🥇", "🥈", "🥉"];

export function RatingList() {
  const current = useCurrentUser();
  const { rows, error } = useRating();

  if (error) {
    return (
      <p role="alert" className="py-16 text-center text-muted">
        Рейтингті жүктеу мүмкін болмады. Бетті жаңартып көріңіз.
      </p>
    );
  }
  if (!rows) return <Loading />;
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center">
        <div aria-hidden="true" className="text-5xl">
          🏆
        </div>
        <h2 className="mt-3 font-serif text-xl font-bold text-heading">Әлі ешкім жоқ</h2>
        <p className="text-muted">Бірінші болыңыз!</p>
      </div>
    );
  }

  return (
    <ol className="mx-auto max-w-3xl space-y-3">
      {rows.map((u, i) => {
        const isMe = u.id === current?.id;
        // Свои очки берём из живого профиля, чтобы они сразу обновлялись после урока
        const points = isMe && current ? current.points : u.points;
        const top = i < 3;
        return (
          <li
            key={u.id}
            aria-current={isMe ? "true" : undefined}
            className={`flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:px-6 ${
              isMe ? "border-2 border-primary dark:border-gold" : top ? "border-gold" : "border-line"
            }`}
          >
            <span className="w-10 text-center font-serif text-2xl font-bold text-heading">
              {top ? <span aria-label={`${i + 1}-орын`}>{MEDALS[i]}</span> : `#${i + 1}`}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {u.username}
                {isMe && <span className="ml-2 text-sm font-normal text-muted">(сіз)</span>}
              </span>
              <span className="block text-sm text-muted">{levelFor(points).name}</span>
            </span>
            <span className="whitespace-nowrap font-bold text-primary dark:text-gold">{points} ұпай</span>
          </li>
        );
      })}
    </ol>
  );
}
