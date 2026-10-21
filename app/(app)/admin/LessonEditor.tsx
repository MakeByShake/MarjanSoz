"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Loading } from "@/components/ui";
import { saveLesson, useLesson } from "@/lib/lessons";
import { autoQuestions, emptyQuestion, emptyTask, problem, QUESTION_TYPES, taskMax } from "@/lib/questions";
import type { Lesson, LessonQuestion, LessonTask } from "@/lib/types";
import { LibraryPicker } from "./LibraryPicker";
import { QuestionEditor, type Libraries } from "./QuestionEditor";
import { dangerBtn, NumberField, Panel, smallBtn, TextField, Toggle } from "./shared";

type SaveState = "saved" | "dirty" | "saving" | "error";

const SAVE_LABEL: Record<SaveState, string> = {
  saved: "✓ Сақталды",
  dirty: "… Өзгерістер бар",
  saving: "Сақталуда...",
  error: "⚠️ Сақталмады — қайталанады",
};

function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function LessonEditor({ id, libs, onBack }: { id: string; libs: Libraries; onBack: () => void }) {
  const loaded = useLesson(id);
  if (loaded.error) return <p className="py-16 text-center text-muted">Сабақты жүктеу мүмкін болмады.</p>;
  if (!loaded.data) return <Loading />;
  if (!loaded.data.lesson) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-muted">Сабақ табылмады.</p>
        <button type="button" className="btn-secondary" onClick={onBack}>
          ← Артқа
        </button>
      </div>
    );
  }
  return <Editor initial={loaded.data.lesson} libs={libs} onBack={onBack} />;
}

function Editor({ initial, libs, onBack }: { initial: Lesson; libs: Libraries; onBack: () => void }) {
  const [lesson, setLesson] = useState(initial);
  const [save, setSave] = useState<SaveState>("saved");
  const [openTasks, setOpenTasks] = useState<Set<string>>(() => new Set(initial.tasks.map((t) => t.id)));
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [pickingStudy, setPickingStudy] = useState(false);
  const [deletingTask, setDeletingTask] = useState<LessonTask | null>(null);

  const update = (fn: (l: Lesson) => Lesson) => {
    setLesson(fn);
    setSave("dirty");
  };
  const set = <K extends keyof Lesson>(k: K, v: Lesson[K]) => update((l) => ({ ...l, [k]: v }));
  const setTask = (taskId: string, fn: (t: LessonTask) => LessonTask) =>
    update((l) => ({ ...l, tasks: l.tasks.map((t) => (t.id === taskId ? fn(t) : t)) }));

  // Автосохранение через 1.2 с после последней правки
  useEffect(() => {
    if (save !== "dirty" && save !== "error") return;
    const timer = setTimeout(
      async () => {
        setSave("saving");
        try {
          await saveLesson(lesson);
          setSave((s) => (s === "saving" ? "saved" : s));
        } catch {
          setSave("error");
        }
      },
      save === "error" ? 5000 : 1200,
    );
    return () => clearTimeout(timer);
  }, [lesson, save]);

  useEffect(() => {
    if (save === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save]);

  async function saveNow() {
    setSave("saving");
    try {
      await saveLesson(lesson);
      setSave((st) => (st === "saving" ? "saved" : st));
    } catch {
      setSave("error");
    }
  }

  async function back() {
    if (save !== "saved") {
      try {
        await saveLesson(lesson);
      } catch {
        setSave("error");
        return;
      }
    }
    onBack();
  }

  const byId = useMemo(() => new Map(libs.proverbs.map((p) => [p.id, p])), [libs.proverbs]);
  const study = lesson.proverbIds.map((pid) => byId.get(pid)).filter((p) => p !== undefined);
  const totalPoints = lesson.tasks.reduce((s, t) => s + taskMax(t), 0);
  const totalQuestions = lesson.tasks.reduce((s, t) => s + t.questions.length, 0);

  function addQuestions(taskId: string, questions: LessonQuestion[]) {
    setTask(taskId, (t) => ({ ...t, questions: [...t.questions, ...questions] }));
    if (questions.length === 1) setOpenQuestion(questions[0].id);
    setAddingTo(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-secondary" onClick={back}>
          ← Артқа
        </button>
        <h2 className="min-w-0 flex-1 truncate font-serif text-2xl font-bold text-heading">
          {lesson.icon} {lesson.title || "Атаусыз сабақ"}
        </h2>
        <span aria-live="polite" className={`text-sm ${save === "error" ? "text-red-800 dark:text-red-200" : "text-muted"}`}>
          {SAVE_LABEL[save]}
        </span>
        <a href={`/lessons/${lesson.id}`} target="_blank" rel="noreferrer" className={smallBtn}>
          👁 Алдын ала көру
        </a>
        <button type="button" className="btn-primary min-h-9 px-4 py-1 text-sm" onClick={saveNow} disabled={save === "saving"}>
          💾 Сақтау
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Тапсырмалар", value: lesson.tasks.length },
          { label: "Сұрақтар", value: totalQuestions },
          { label: "Барлық балл", value: totalPoints },
          { label: "Оқу мақалдары", value: study.length },
        ].map((s) => (
          <li key={s.label} className="rounded-2xl border border-line bg-card p-4 shadow-sm">
            <span className="block text-sm text-muted">{s.label}</span>
            <span className="font-serif text-2xl font-bold text-heading">{s.value}</span>
          </li>
        ))}
      </ul>

      <Panel title="Сабақ баптаулары">
        <div className="space-y-3">
          <TextField label="Атауы" value={lesson.title} onChange={(v) => set("title", v)} required />
          <TextField label="Сипаттамасы" value={lesson.description} onChange={(v) => set("description", v)} multiline />
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label="Белгіше (эмодзи)" value={lesson.icon} onChange={(v) => set("icon", v)} />
            <NumberField label="Реті" min={0} value={lesson.order} onChange={(v) => set("order", v)} />
            <NumberField
              label="Өту балы (%)"
              min={0}
              max={100}
              value={lesson.passPercent}
              onChange={(v) => set("passPercent", Math.min(100, Math.max(0, v)))}
            />
          </div>
          <Toggle
            checked={lesson.published}
            onChange={(v) => set("published", v)}
            label={lesson.published ? "Жарияланған — оқушылар көреді" : "Черновик — тек әкімшілер көреді"}
          />
        </div>
      </Panel>

      <Panel
        title={`Оқу мақалдары (${libs.loading ? lesson.proverbIds.length : study.length})`}
        action={
          <button type="button" className={smallBtn} onClick={() => setPickingStudy(true)}>
            ＋ Мақал қосу
          </button>
        }
      >
        <p className="mb-3 text-sm text-muted">Оқушы тапсырмалардан бұрын осы мақалдарды оқиды. Міндетті емес.</p>
        <ol className="space-y-2">
          {study.map((p, i) => (
            <li key={p.id} className="flex items-start gap-2 rounded-lg border border-line bg-bg p-3">
              <span className="flex flex-col text-sm">
                <button type="button" aria-label="Жоғары" disabled={i === 0} onClick={() => set("proverbIds", move(lesson.proverbIds, lesson.proverbIds.indexOf(p.id), -1))} className="disabled:opacity-30">
                  ▲
                </button>
                <button type="button" aria-label="Төмен" disabled={i === study.length - 1} onClick={() => set("proverbIds", move(lesson.proverbIds, lesson.proverbIds.indexOf(p.id), 1))} className="disabled:opacity-30">
                  ▼
                </button>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif italic text-proverb">«{p.text}»</p>
                <p className="line-clamp-1 text-sm text-muted">{p.explanation}</p>
              </div>
              <button
                type="button"
                className={dangerBtn}
                aria-label="Алып тастау"
                onClick={() => set("proverbIds", lesson.proverbIds.filter((x) => x !== p.id))}
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
        {libs.loading && lesson.proverbIds.length > 0 && <p className="text-sm text-muted">⏳ Мақалдар жүктелуде...</p>}
      </Panel>

      <Panel
        title="Сабақ тапсырмалары"
        action={
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              const task = emptyTask();
              update((l) => ({ ...l, tasks: [...l.tasks, task] }));
              setOpenTasks((s) => new Set(s).add(task.id));
            }}
          >
            ＋ Тапсырма қосу
          </button>
        }
      >
        {lesson.tasks.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-line p-8 text-center">
            <p className="mb-4 text-muted">Сұрақтар әлі жоқ.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                const task = { ...emptyTask(), title: "1-тапсырма" };
                update((l) => ({ ...l, tasks: [task] }));
                setOpenTasks(new Set([task.id]));
                setAddingTo(task.id);
              }}
            >
              ＋ Сұрақ қосу
            </button>
          </div>
        )}
        <ol className="space-y-4">
          {lesson.tasks.map((task, ti) => {
            const open = openTasks.has(task.id);
            const issues = task.questions.filter((q) => problem(q)).length;
            const toggleOpen = () =>
              setOpenTasks((s) => {
                const next = new Set(s);
                if (next.has(task.id)) next.delete(task.id);
                else next.add(task.id);
                return next;
              });
            return (
              <li key={task.id} className="rounded-2xl border-2 border-dashed border-line">
                <div className="flex flex-wrap items-center gap-2 p-4">
                  <span className="flex flex-col text-sm">
                    <button type="button" aria-label="Жоғары" disabled={ti === 0} onClick={() => set("tasks", move(lesson.tasks, ti, -1))} className="disabled:opacity-30">
                      ▲
                    </button>
                    <button type="button" aria-label="Төмен" disabled={ti === lesson.tasks.length - 1} onClick={() => set("tasks", move(lesson.tasks, ti, 1))} className="disabled:opacity-30">
                      ▼
                    </button>
                  </span>
                  <button type="button" onClick={toggleOpen} className="min-w-0 flex-1 text-left">
                    <span className="font-semibold">{task.title || "Атаусыз тапсырма"}</span>{" "}
                    <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-white dark:bg-gold dark:text-bg">
                      {task.questions.length} сұрақ
                    </span>{" "}
                    <span className="text-sm text-muted">{taskMax(task)} балл</span>
                    {issues > 0 && <span className="ml-2 text-xs text-red-800 dark:text-red-200">⚠️ {issues} сұрақ толық емес</span>}
                  </button>
                  <button type="button" className={smallBtn} onClick={toggleOpen} aria-expanded={open}>
                    {open ? "Жасыру" : "Ашу"}
                  </button>
                  <button type="button" className={dangerBtn} onClick={() => setDeletingTask(task)} aria-label="Тапсырманы жою">
                    🗑
                  </button>
                </div>

                {open && (
                  <div className="space-y-4 border-t border-line p-4">
                    <TextField label="Тапсырма атауы" value={task.title} onChange={(v) => setTask(task.id, (t) => ({ ...t, title: v }))} />
                    <TextField
                      label="Нұсқаулық (оқушыға көрінеді)"
                      value={task.instruction}
                      onChange={(v) => setTask(task.id, (t) => ({ ...t, instruction: v }))}
                      multiline
                    />
                    <Toggle checked={task.shuffle} onChange={(v) => setTask(task.id, (t) => ({ ...t, shuffle: v }))} label="Сұрақтарды араластыру" />

                    <h3 className="pt-2 font-serif text-lg font-bold text-heading">Сұрақтар ({task.questions.length})</h3>
                    <ol className="space-y-3">
                      {task.questions.map((q, qi) => (
                        <QuestionEditor
                          key={q.id}
                          q={q}
                          index={qi}
                          total={task.questions.length}
                          open={openQuestion === q.id}
                          onToggle={() => setOpenQuestion((o) => (o === q.id ? null : q.id))}
                          onChange={(next) => setTask(task.id, (t) => ({ ...t, questions: t.questions.map((x) => (x.id === q.id ? next : x)) }))}
                          onDelete={() => setTask(task.id, (t) => ({ ...t, questions: t.questions.filter((x) => x.id !== q.id) }))}
                          onMove={(dir) => setTask(task.id, (t) => ({ ...t, questions: move(t.questions, qi, dir) }))}
                          libs={libs}
                        />
                      ))}
                    </ol>

                    {addingTo === task.id ? (
                      <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 dark:border-gold/40 dark:bg-gold/5">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-serif text-lg font-bold text-heading">Сұрақ түрін таңдаңыз</h4>
                          <button type="button" aria-label="Жабу" onClick={() => setAddingTo(null)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-track">
                            ✕
                          </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {QUESTION_TYPES.map((t) => (
                            <button
                              key={t.type}
                              type="button"
                              onClick={() => addQuestions(task.id, [emptyQuestion(t.type)])}
                              className="flex items-start gap-3 rounded-xl border border-line bg-card p-3 text-left transition hover:border-primary dark:hover:border-gold"
                            >
                              <span aria-hidden="true" className="text-2xl">
                                {t.icon}
                              </span>
                              <span>
                                <span className="block font-semibold">{t.title}</span>
                                <span className="block text-sm text-muted">{t.hint}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn-primary" onClick={() => setAddingTo(task.id)}>
                          ＋ Сұрақ қосу
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={study.length === 0}
                          title={study.length === 0 ? "Алдымен «Оқу мақалдары» бөліміне мақал қосыңыз" : undefined}
                          onClick={() => addQuestions(task.id, autoQuestions(study, libs.proverbs))}
                        >
                          ⚡ Оқу мақалдарынан авто-сұрақтар
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </Panel>

      <div className="sticky bottom-4 z-30 flex items-center justify-end gap-3 rounded-2xl border border-line bg-card/95 p-3 shadow-lg backdrop-blur">
        <span aria-live="polite" className={`text-sm ${save === "error" ? "text-red-800 dark:text-red-200" : "text-muted"}`}>
          {SAVE_LABEL[save]}
        </span>
        <button type="button" className="btn-primary" onClick={saveNow} disabled={save === "saving"}>
          💾 Сақтау
        </button>
      </div>

      {pickingStudy && (
        <LibraryPicker
          open
          multiple
          kinds={["proverb"]}
          chosen={new Set(lesson.proverbIds)}
          onClose={() => setPickingStudy(false)}
          onPick={(p) => update((l) => (l.proverbIds.includes(p.item.id) ? l : { ...l, proverbIds: [...l.proverbIds, p.item.id] }))}
          proverbs={libs.proverbs}
          balama={libs.balama}
          topics={libs.topics}
          loading={libs.loading}
        />
      )}

      <ConfirmDialog
        open={deletingTask !== null}
        title={deletingTask ? `«${deletingTask.title}» тапсырмасын (${deletingTask.questions.length} сұрақ) жоясыз ба?` : ""}
        confirmLabel="Жою"
        onClose={() => setDeletingTask(null)}
        onConfirm={() => {
          if (deletingTask) update((l) => ({ ...l, tasks: l.tasks.filter((t) => t.id !== deletingTask.id) }));
        }}
      />
    </div>
  );
}
