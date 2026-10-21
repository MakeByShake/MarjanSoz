"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Loading } from "@/components/ui";
import { createLesson, deleteLesson, useLessons } from "@/lib/lessons";
import { taskMax } from "@/lib/questions";
import type { Lesson } from "@/lib/types";
import { LessonEditor } from "./LessonEditor";
import type { Libraries } from "./QuestionEditor";
import { dangerBtn, Panel, smallBtn, StatusLine, useAction } from "./shared";

export function LessonsPanel({ libs }: { libs: Libraries }) {
  const lessons = useLessons(true);
  const { busy, status, run } = useAction();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Lesson | null>(null);

  if (editing) {
    return (
      <LessonEditor
        id={editing}
        libs={libs}
        onBack={() => {
          setEditing(null);
          lessons.reload();
        }}
      />
    );
  }

  if (lessons.error) return <p className="py-16 text-center text-muted">Сабақтарды жүктеу мүмкін болмады.</p>;
  if (!lessons.data) return <Loading />;
  const list = lessons.data;

  return (
    <div className="space-y-6">
      <Panel
        title={`Сабақтар (${list.length})`}
        action={
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={async () => {
              let id = "";
              const ok = await run(async () => {
                id = await createLesson(Math.max(0, ...list.map((l) => l.order)) + 1);
              }, "Сабақ құрылды");
              if (ok) setEditing(id);
            }}
          >
            ＋ Сабақ қосу
          </button>
        }
      >
        <p className="mb-4 text-sm text-muted">
          Сабақ = оқу мақалдары + тапсырмалар. Әр тапсырманың ішінде түрлі сұрақтар болады. Жаңа сабақ алдымен жасырын
          (черновик) болады — дайын болғанда «Жариялау» қосыңыз.
        </p>
        <StatusLine status={status} />
        {list.length === 0 && <p className="text-muted">Сабақтар әлі жоқ.</p>}
        <ul className="divide-y divide-line">
          {list.map((l) => {
            const questions = l.tasks.reduce((s, t) => s + t.questions.length, 0);
            const points = l.tasks.reduce((s, t) => s + taskMax(t), 0);
            return (
              <li key={l.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                <span aria-hidden="true" className="text-3xl">
                  {l.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {l.title}{" "}
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        l.published ? "bg-success/15 text-success" : "bg-track text-muted"
                      }`}
                    >
                      {l.published ? "Жарияланған" : "Черновик"}
                    </span>
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded-full bg-primary px-2.5 py-0.5 font-medium text-white dark:bg-gold dark:text-bg">
                      {questions} сұрақ
                    </span>
                    <span className="rounded-full border border-line px-2.5 py-0.5">{l.tasks.length} тапсырма</span>
                    <span className="rounded-full border border-line px-2.5 py-0.5">{points} балл</span>
                    <span className="rounded-full border border-line px-2.5 py-0.5">{l.proverbIds.length} оқу мақалы</span>
                    <span className="px-1 py-0.5 text-muted">№{l.order}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a href={`/lessons/${l.id}`} target="_blank" rel="noreferrer" className={smallBtn}>
                    👁 Көру
                  </a>
                  <button type="button" className={smallBtn} onClick={() => setEditing(l.id)}>
                    Өңдеу
                  </button>
                  <button type="button" className={dangerBtn} onClick={() => setDeleting(l)}>
                    Жою
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `«${deleting.title}» сабағын жоясыз ба? Оқушылардың осы сабақтағы нәтижелері де жойылады.` : ""}
        confirmLabel="Жою"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting && (await run(() => deleteLesson(deleting.id), "Сабақ жойылды"))) lessons.reload();
        }}
      />
    </div>
  );
}
