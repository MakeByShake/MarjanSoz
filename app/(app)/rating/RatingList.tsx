"use client";

import { useState } from "react";
import { Loading } from "@/components/ui";
import { effective, useLessonResults, useLessons } from "@/lib/lessons";
import { levelFor, useCurrentUser, useRating } from "@/lib/user";

const MEDALS = ["🥇", "🥈", "🥉"];

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
            <option value="">🏆 Жалпы рейтинг</option>
            {lessons.data.map((l) => (
              <option key={l.id} value={l.id}>
                {l.icon} {l.title}
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
        note: r.completed ? "Сабақ аяқталды ✅" : `${Object.keys(r.tasks).length} тапсырма орындалды`,
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

function Rows({ rows, me }: { rows: Row[]; me?: string }) {
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
    <ol className="space-y-3">
      {rows.map((u, i) => {
        const isMe = u.id === me;
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
              <span className="block text-sm text-muted">{u.note}</span>
            </span>
            <span className="whitespace-nowrap font-bold text-primary dark:text-gold">{u.points} ұпай</span>
          </li>
        );
      })}
    </ol>
  );
}
