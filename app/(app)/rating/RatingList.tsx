"use client";

import { useState } from "react";
import { CheckIcon, TrophyIcon } from "@/components/Icons";
import { EmptyState, Loading } from "@/components/ui";
import { effective, useLessonResults, useLessons } from "@/lib/lessons";
import { levelFor, useCurrentUser, useRating } from "@/lib/user";

// Алтын, күміс, қола — тон медали для первых трёх мест
const MEDALS = [
  { ring: "#c9a23a", fill: "#f3e3ad", text: "#5c4508" },
  { ring: "#9aa5a8", fill: "#e6eaeb", text: "#3c4547" },
  { ring: "#b07a4f", fill: "#f0dccb", text: "#5a3519" },
];

type Row = { id: string; username: string; points: number; note: string };

export function RatingList() {
  const current = useCurrentUser();
  const lessons = useLessons(false);
  const [lessonId, setLessonId] = useState("");

  return (
    <div className="mx-auto max-w-3xl">
      {lessons.data && lessons.data.length > 0 && (
        <label className="mb-6 block">
          <span className="sr-only">Рейтинг түрі</span>
          <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="field">
            <option value="">Жалпы рейтинг</option>
            {lessons.data.map((l) => (
              <option key={l.id} value={l.id}>
                Сабақ: {l.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {lessonId ? <LessonRating lessonId={lessonId} me={current?.id} /> : <OverallRating me={current?.id} myPoints={current?.points} />}
    </div>
  );
}

function OverallRating({ me, myPoints }: { me?: string; myPoints?: number }) {
  const { rows, error } = useRating();
  if (error) return <Failed />;
  if (!rows) return <Loading />;
  return (
    <Rows
      me={me}
      rows={rows.map((u) => {
        // Свои очки берём из живого профиля, чтобы они сразу обновлялись после урока
        const points = u.id === me && myPoints !== undefined ? myPoints : u.points;
        return { id: u.id, username: u.username, points, note: levelFor(points).name };
      })}
    />
  );
}

function LessonRating({ lessonId, me }: { lessonId: string; me?: string }) {
  const results = useLessonResults(lessonId);
  if (results.error) return <Failed />;
  if (!results.data) return <Loading />;
  return (
    <Rows
      me={me}
      rows={results.data.map((r) => ({
        id: r.uid,
        username: r.username,
        points: effective(r),
        note: r.completed ? "Сабақ аяқталды" : `${Object.keys(r.tasks).length} тапсырма орындалды`,
      }))}
    />
  );
}

function Failed() {
  return (
    <p role="alert" className="py-16 text-center text-muted">
      Рейтингті жүктеу мүмкін болмады. Бетті жаңартып көріңіз.
    </p>
  );
}

/** Медаль: кольцо с номером места и двумя лентами. */
function Medal({ place }: { place: number }) {
  const m = MEDALS[place];
  return (
    <svg viewBox="0 0 40 44" className="h-11 w-10" role="img" aria-label={`${place + 1}-орын`}>
      <path d="M12 2h7l-3 14h-7ZM28 2h-7l3 14h7Z" fill={m.ring} opacity=".55" />
      <circle cx="20" cy="27" r="14" fill={m.fill} stroke={m.ring} strokeWidth="2.5" />
      <text x="20" y="32" textAnchor="middle" fontSize="14" fontWeight="700" fill={m.text} fontFamily="Georgia, serif">
        {place + 1}
      </text>
    </svg>
  );
}

function Rows({ rows, me }: { rows: Row[]; me?: string }) {
  if (rows.length === 0) {
    return <EmptyState icon={<TrophyIcon size={24} />} title="Әлі ешкім жоқ" text="Бірінші болыңыз!" />;
  }

  return (
    <ol className="card divide-y divide-line overflow-hidden">
      {rows.map((u, i) => {
        const isMe = u.id === me;
        const top = i < 3;
        return (
          <li
            key={u.id}
            aria-current={isMe ? "true" : undefined}
            className={`flex items-center gap-4 px-4 py-3.5 sm:px-6 ${isMe ? "bg-gold/10" : top ? "bg-gold/[0.03]" : ""}`}
          >
            <span className="grid w-10 shrink-0 place-items-center">
              {top ? <Medal place={i} /> : <span className="font-serif text-lg font-semibold text-muted">{i + 1}</span>}
            </span>
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-serif font-semibold text-primary-dark dark:bg-white/8 dark:text-heading"
            >
              {u.username.trim().charAt(0).toLocaleUpperCase("kk") || "?"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {u.username}
                {isMe && <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-gold-text">сіз</span>}
              </span>
              <span className="flex items-center gap-1 text-sm text-muted">
                {u.note === "Сабақ аяқталды" && <CheckIcon size={14} className="text-success" />}
                {u.note}
              </span>
            </span>
            <span className="text-right whitespace-nowrap">
              <span className="font-serif text-xl font-semibold text-heading">{u.points}</span>
              <span className="ml-1 text-sm text-muted">ұпай</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
