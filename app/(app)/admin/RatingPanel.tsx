"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Loading } from "@/components/ui";
import { deleteResult, effective, setManualScore, useLessonResults, useLessons } from "@/lib/lessons";
import { normalize } from "@/lib/proverbs";
import { taskMax } from "@/lib/questions";
import type { Lesson, LessonResult } from "@/lib/types";
import { listUsers, type UserRow } from "@/lib/usersAdmin";
import { dangerBtn, Panel, smallBtn, StatusLine, Toggle, useAction } from "./shared";

type Row = { uid: string; username: string; result: (LessonResult & { id: string }) | null };

export function RatingPanel() {
  const lessons = useLessons(true);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const { busy, status, run } = useAction();
  const [deleting, setDeleting] = useState<Row | null>(null);

  const current = lessonId ?? lessons.data?.[0]?.id ?? null;
  const lesson = lessons.data?.find((l) => l.id === current) ?? null;
  const results = useLessonResults(current);

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const rows = useMemo<Row[]>(() => {
    const byUid = new Map((results.data ?? []).map((r) => [r.uid, r]));
    const withResult: Row[] = (results.data ?? []).map((r) => ({ uid: r.uid, username: r.username, result: r }));
    const without: Row[] = showAll
      ? (users ?? []).filter((u) => !byUid.has(u.id)).map((u) => ({ uid: u.id, username: u.username, result: null }))
      : [];
    const q = normalize(query);
    return [...withResult, ...without].filter((r) => !q || normalize(r.username).includes(q));
  }, [results.data, users, showAll, query]);

  if (lessons.error) return <p className="py-16 text-center text-muted">Сабақтарды жүктеу мүмкін болмады.</p>;
  if (!lessons.data) return <Loading />;
  if (lessons.data.length === 0) return <Panel title="Рейтинг"><p className="text-muted">Алдымен сабақ жасаңыз.</p></Panel>;

  const max = lesson ? lesson.tasks.reduce((s, t) => s + taskMax(t), 0) : 0;

  return (
    <Panel title="Сабақ бойынша рейтинг">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select value={current ?? ""} onChange={(e) => setLessonId(e.target.value)} aria-label="Сабақ" className="field sm:w-80">
          {lessons.data.map((l) => (
            <option key={l.id} value={l.id}>
              {l.icon} {l.title} {l.published ? "" : "(черновик)"}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Аты бойынша іздеу..."
          aria-label="Іздеу"
          className="field sm:flex-1"
        />
        <Toggle checked={showAll} onChange={setShowAll} label="Нәтижесі жоқтарды да көрсету" />
      </div>
      <p className="mb-3 text-sm text-muted">
        Ең жоғары балл: {max}. «Қолмен» бағанына балл жазсаңыз, ол оқушының жинағанының орнына есептеледі (жалпы рейтингке де).
        Бос қалдырсаңыз, жинаған балы қайтады.
      </p>
      <StatusLine status={status} />

      {results.data === null && !results.error ? (
        <Loading />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-muted">Бұл сабақты әлі ешкім өтпеген.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Оқушы</th>
                <th className="py-2 pr-2">Тапсырмалар</th>
                <th className="py-2 pr-2">Жинаған</th>
                <th className="py-2 pr-2">Қолмен</th>
                <th className="py-2 pr-2">Есепке</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r, i) => (
                <ResultRow
                  key={`${current}-${r.uid}`}
                  place={r.result ? i + 1 : null}
                  row={r}
                  lesson={lesson!}
                  busy={busy}
                  onManual={async (manual) => {
                    const ok = await run(
                      () => setManualScore(lesson!, r.uid, r.username, manual),
                      manual === null ? `${r.username}: қолмен қойылған балл алынды` : `${r.username}: ${manual} балл қойылды`,
                    );
                    if (ok) results.reload();
                  }}
                  onDelete={() => setDeleting(r)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `${deleting.username}: осы сабақтағы нәтижесін жоясыз ба? Оқушы сабақты қайтадан өте алады.` : ""}
        confirmLabel="Жою"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting || !lesson) return;
          const target = deleting;
          if (await run(() => deleteResult(lesson.id, target.uid), `${target.username}: нәтиже жойылды`)) results.reload();
        }}
      />
    </Panel>
  );
}

function ResultRow({
  place,
  row,
  lesson,
  busy,
  onManual,
  onDelete,
}: {
  place: number | null;
  row: Row;
  lesson: Lesson;
  busy: boolean;
  onManual: (v: number | null) => void;
  onDelete: () => void;
}) {
  const r = row.result;
  const [manual, setManual] = useState(r?.manual === null || r?.manual === undefined ? "" : String(r.manual));
  const original = r?.manual === null || r?.manual === undefined ? "" : String(r.manual);
  const changed = manual.trim() !== original && (manual.trim() === "" || Number.isFinite(Number(manual)));
  const done = r ? lesson.tasks.filter((t) => r.tasks[t.id] !== undefined).length : 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (changed) onManual(manual.trim() === "" ? null : Math.max(0, Math.round(Number(manual))));
  }

  return (
    <tr>
      <td className="py-2 pr-2 font-bold">{place ?? "—"}</td>
      <td className="py-2 pr-2 font-medium">
        {row.username}
        {r?.completed && <span className="ml-1" title="Барлық тапсырма өтілді">✅</span>}
      </td>
      <td className="py-2 pr-2">
        {done}/{lesson.tasks.length}
      </td>
      <td className="py-2 pr-2">
        {r ? r.score : "—"}
        {r ? ` / ${r.maxScore}` : ""}
      </td>
      <td className="py-2 pr-2">
        <form onSubmit={submit} className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="—"
            aria-label={`${row.username}: қолмен балл`}
            className="field w-20 px-2 py-1"
          />
          {changed && (
            <button type="submit" disabled={busy} className={smallBtn}>
              ✓
            </button>
          )}
        </form>
      </td>
      <td className="py-2 pr-2 font-bold text-primary dark:text-gold">{r ? effective(r) : 0}</td>
      <td className="py-2 text-right">
        {r && (
          <button type="button" disabled={busy} className={dangerBtn} onClick={onDelete} title="Нәтижені жою (оқушы қайта өте алады)">
            Жою
          </button>
        )}
      </td>
    </tr>
  );
}
