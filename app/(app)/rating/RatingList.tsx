"use client";

import { levelFor, useCurrentUser, useUsers } from "@/lib/user";

// Демо-участники, как в старом сайте, чтобы рейтинг не был пустым
const DEMO = [
  { id: -1, username: "Аслан", points: 1250 },
  { id: -2, username: "Айгүл", points: 980 },
  { id: -3, username: "Бауыржан", points: 750 },
  { id: -4, username: "Құралай", points: 450 },
];

const MEDALS = ["🥇", "🥈", "🥉"];

export function RatingList() {
  const current = useCurrentUser();
  const users = useUsers();

  const rows = [...DEMO, ...users.map((u) => ({ id: u.id, username: u.username, points: u.points ?? 0 }))].sort(
    (a, b) => b.points - a.points,
  );

  return (
    <ol className="mx-auto max-w-3xl space-y-3">
      {rows.map((u, i) => {
        const isMe = u.id === current?.id;
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
              <span className="block text-sm text-muted">{levelFor(u.points).name}</span>
            </span>
            <span className="whitespace-nowrap font-bold text-primary dark:text-gold">{u.points} ұпай</span>
          </li>
        );
      })}
    </ol>
  );
}
