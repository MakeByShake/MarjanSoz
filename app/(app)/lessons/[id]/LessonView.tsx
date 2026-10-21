"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { OrnateCard } from "@/components/Ornament";
import { BusyLabel, Loading, PageHeader, ProgressBar } from "@/components/ui";
import { effective, saveTaskScore, taskPassed, useLesson, useMyResults } from "@/lib/lessons";
import { useLibrary } from "@/lib/proverbs";
import { type Answer, correctText, grade, orderWords, shuffle, taskMax, typeInfo } from "@/lib/questions";
import type { Lesson, LessonQuestion, LessonTask } from "@/lib/types";
import { useCurrentUser } from "@/lib/user";
import { QuestionView, type Prepared } from "./QuestionView";

type Phase =
  | { name: "overview" }
  | { name: "play"; task: LessonTask; items: Prepared[]; index: number; answers: Answer[] }
  | { name: "result"; task: LessonTask; items: Prepared[]; answers: Answer[]; score: number; saved: boolean };

/** Порядок вариантов, правых частей и слов перемешивается один раз при старте задания. */
function prepare(q: LessonQuestion): Prepared {
  const shape = typeInfo(q.type).shape;
  const filled = q.options.map((o, i) => ({ o, i })).filter((x) => x.o.trim());
  const keep = q.type === "truefalse";
  return {
    q,
    options: keep ? filled.map((x) => x.i) : shuffle(filled.map((x) => x.i)),
    rights: shape === "match" ? shuffle(q.pairs.map((_, i) => i)) : [],
    words: shape === "order" ? shuffle(orderWords(q).map((_, i) => i)) : [],
  };
}

export function LessonView({ id }: { id: string }) {
  const user = useCurrentUser();
  const loaded = useLesson(id);
  const results = useMyResults(user?.id);
  const { proverbs } = useLibrary();
  const [phase, setPhase] = useState<Phase>({ name: "overview" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const byId = useMemo(() => new Map(proverbs.map((p) => [p.id, p])), [proverbs]);

  if (loaded.error) return <p className="py-16 text-center text-muted">Сабақты жүктеу мүмкін болмады.</p>;
  if (!loaded.data || !user) return <Loading />;
  const lesson = loaded.data.lesson;
  if (!lesson) {
    return (
      <Message icon="😕" title="Сабақ табылмады" text="Мүмкін, ол әлі жарияланбаған.">
        <Link href="/lessons" className="btn-primary">
          Сабақтарға оралу
        </Link>
      </Message>
    );
  }

  const result = results.data?.get(lesson.id);
  const max = lesson.tasks.reduce((s, t) => s + taskMax(t), 0);
  const score = result ? effective(result) : 0;
  const study = lesson.proverbIds.map((pid) => byId.get(pid)).filter((p) => p !== undefined);

  function start(task: LessonTask) {
    const questions = task.shuffle ? shuffle(task.questions) : task.questions;
    const items = questions.map(prepare);
    setSaveError(false);
    setPhase({ name: "play", task, items, index: 0, answers: items.map(() => undefined) });
    window.scrollTo({ top: 0 });
  }

  async function finish(task: LessonTask, items: Prepared[], answers: Answer[]) {
    const earned = items.reduce((s, it, i) => s + grade(it.q, answers[i]), 0);
    setSaving(true);
    let saved = true;
    try {
      await saveTaskScore(user!, lesson!, task.id, earned);
      results.reload();
    } catch {
      saved = false;
    } finally {
      setSaving(false);
    }
    setSaveError(!saved);
    setPhase({ name: "result", task, items, answers, score: earned, saved });
    window.scrollTo({ top: 0 });
  }

  const header = (
    <>
      <nav aria-label="Навигация" className="mb-4 text-sm text-muted">
        <Link href="/lessons" className="text-primary underline-offset-4 hover:underline dark:text-gold">
          Сабақтар
        </Link>{" "}
        / {lesson.title}
      </nav>
      <PageHeader title={`${lesson.icon} ${lesson.title}`} subtitle={lesson.description} />
      <div className="mx-auto mb-8 max-w-xl">
        <ProgressBar value={max ? (Math.min(score, max) / max) * 100 : 0} label="Сабақ прогресі" />
        <p className="mt-2 text-center text-sm text-muted">
          {score}/{max} балл{result?.manual !== null && result?.manual !== undefined ? " (мұғалім қойған)" : ""}
        </p>
      </div>
    </>
  );

  if (phase.name === "play") {
    const item = phase.items[phase.index];
    const isLast = phase.index === phase.items.length - 1;
    const setAnswer = (a: Answer) => setPhase({ ...phase, answers: phase.answers.map((old, i) => (i === phase.index ? a : old)) });
    return (
      <>
        {header}
        <OrnateCard className="mx-auto max-w-3xl">
          <p className="mb-1 text-center font-serif text-lg font-bold text-heading">{phase.task.title}</p>
          <p className="mb-4 text-center text-sm font-medium text-muted">
            Сұрақ {phase.index + 1} / {phase.items.length} · {item.q.points} балл
          </p>
          <ProgressBar value={((phase.index + 1) / phase.items.length) * 100} label="Тапсырма прогресі" />
          <div className="mt-6">
            <QuestionView key={`${phase.task.id}-${phase.index}`} item={item} answer={phase.answers[phase.index]} onAnswer={setAnswer} />
          </div>
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => (phase.index === 0 ? setPhase({ name: "overview" }) : setPhase({ ...phase, index: phase.index - 1 }))}
            >
              {phase.index === 0 ? "✕ Шығу" : "← Алдыңғы"}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={() => (isLast ? finish(phase.task, phase.items, phase.answers) : setPhase({ ...phase, index: phase.index + 1 }))}
            >
              {saving ? <BusyLabel>Сақталуда...</BusyLabel> : isLast ? "Аяқтау" : "Келесі →"}
            </button>
          </div>
        </OrnateCard>
      </>
    );
  }

  if (phase.name === "result") {
    const taskMaxPoints = taskMax(phase.task);
    const percent = taskMaxPoints ? Math.round((phase.score / taskMaxPoints) * 100) : 0;
    const passed = taskPassed(lesson, phase.task.id, phase.score);
    const best = result?.tasks[phase.task.id];
    const mistakes = phase.items.map((it, i) => ({ it, got: grade(it.q, phase.answers[i]) })).filter((m) => m.got < m.it.q.points);
    const next = nextTask(lesson, phase.task.id);
    return (
      <>
        {header}
        <OrnateCard className="mx-auto max-w-3xl text-center">
          <div aria-hidden="true" className="text-5xl">
            {passed ? "🎉" : "📝"}
          </div>
          <h2 className="mt-2 font-serif text-2xl font-bold text-heading">{passed ? "Құттықтаймыз!" : "Қайталап көріңіз"}</h2>
          <p className="my-3 font-serif text-4xl font-bold text-heading">
            {phase.score} / {taskMaxPoints} балл
          </p>
          <p className="text-muted">
            {percent}% · өту үшін {lesson.passPercent}% керек
            {best !== undefined && ` · ең жақсы нәтиже: ${best}`}
          </p>
          {saveError && (
            <p role="alert" className="mt-3 text-sm text-red-800 dark:text-red-200">
              Нәтижені сақтау мүмкін болмады. Интернетті тексеріп, қайта өтіңіз.
            </p>
          )}

          {mistakes.length > 0 && (
            <div className="mt-6 text-left">
              <h3 className="mb-3 font-serif text-lg font-bold text-heading">Қателер:</h3>
              <ul className="space-y-3">
                {mistakes.map(({ it, got }) => (
                  <li key={it.q.id} className="rounded-lg border border-line bg-bg p-4">
                    <p className="font-medium">{it.q.prompt}</p>
                    {it.q.text && <p className="mt-1 font-serif italic text-proverb">{it.q.text}</p>}
                    <p className="mt-2 whitespace-pre-line text-sm">
                      Дұрыс жауап: <strong>{correctText(it.q)}</strong>
                    </p>
                    {got > 0 && <p className="text-xs text-muted">Жартылай: {got}/{it.q.points} балл</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {passed && next ? (
              <button type="button" className="btn-primary" onClick={() => start(next)}>
                Келесі тапсырма →
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => start(phase.task)}>
                Қайталау
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={() => setPhase({ name: "overview" })}>
              Сабаққа оралу
            </button>
          </div>
        </OrnateCard>
      </>
    );
  }

  return (
    <>
      {header}
      {study.length > 0 && (
        <section aria-labelledby="study-title" className="mb-10">
          <h2 id="study-title" className="mb-4 text-center font-serif text-xl font-bold text-heading">
            Осы мақалдарды оқып, есте сақтаңыз
          </h2>
          <ol className="space-y-5">
            {study.map((p, i) => (
              <li key={p.id}>
                <OrnateCard>
                  <span
                    aria-hidden="true"
                    className="mb-3 inline-grid h-9 w-9 place-items-center rounded-full bg-primary font-bold text-white dark:bg-gold dark:text-bg"
                  >
                    {i + 1}
                  </span>
                  <p className="font-serif text-xl italic text-proverb sm:text-2xl">«{p.text}»</p>
                  <p className="mt-3">{p.explanation}</p>
                  {p.translation_ru && (
                    <p lang="ru" className="mt-2 text-sm text-muted">
                      {p.translation_ru}
                    </p>
                  )}
                </OrnateCard>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="tasks-title">
        <h2 id="tasks-title" className="mb-4 text-center font-serif text-xl font-bold text-heading">
          Тапсырмалар
        </h2>
        {lesson.tasks.length === 0 && <p className="text-center text-muted">Тапсырмалар әлі қосылмаған.</p>}
        <ol className="mx-auto max-w-3xl space-y-4">
          {lesson.tasks.map((t, i) => {
            const best = result?.tasks[t.id];
            const passed = taskPassed(lesson, t.id, best);
            const empty = t.questions.length === 0;
            return (
              <li key={t.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-5 shadow-sm sm:flex-row sm:items-center">
                <span
                  aria-hidden="true"
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold ${
                    passed ? "bg-success text-white" : "bg-track"
                  }`}
                >
                  {passed ? "✓" : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{t.title}</h3>
                  {t.instruction && <p className="text-sm text-muted">{t.instruction}</p>}
                  <p className="text-sm text-muted">
                    {t.questions.length} сұрақ · {best ?? 0}/{taskMax(t)} балл
                  </p>
                </div>
                <button type="button" className={passed ? "btn-secondary" : "btn-primary"} disabled={empty} onClick={() => start(t)}>
                  {best === undefined ? "Бастау" : passed ? "Қайта өту" : "Қайталау"}
                </button>
              </li>
            );
          })}
        </ol>
        {result?.completed && (
          <p className="mt-6 text-center font-serif text-lg font-bold text-heading">🎉 Сабақ толық аяқталды!</p>
        )}
      </section>
    </>
  );
}

function nextTask(lesson: Lesson, taskId: string) {
  const i = lesson.tasks.findIndex((t) => t.id === taskId);
  return lesson.tasks.slice(i + 1).find((t) => t.questions.length > 0);
}

function Message({ icon, title, text, children }: { icon: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <OrnateCard className="mx-auto max-w-2xl text-center">
      <div aria-hidden="true" className="text-5xl">
        {icon}
      </div>
      <h2 className="mt-3 font-serif text-2xl font-bold text-heading">{title}</h2>
      <p className="mt-2 text-muted">{text}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">{children}</div>
    </OrnateCard>
  );
}
