"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, BadgeCheckIcon, CheckIcon, CloseIcon, CompassIcon, RefreshIcon } from "@/components/Icons";
import { AiMistakeButton } from "@/components/MarjanApai";
import { Divider, OrnateCard } from "@/components/Ornament";
import { BusyLabel, EmptyState, Loading, PageHeader, ProgressBar, SectionTitle } from "@/components/ui";
import { effective, saveTaskScore, taskPassed, useLesson, useMyResults } from "@/lib/lessons";
import { rememberMistakes } from "@/lib/ai/mistakes";
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
      <EmptyState icon={<CompassIcon size={24} />} title="Сабақ табылмады" text="Мүмкін, ол әлі жарияланбаған.">
        <Link href="/lessons" className="btn-primary">
          Сабақтарға оралу
        </Link>
      </EmptyState>
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
    // Ошибки запоминаем для Маржан апай (раздел «Маржан апай» → «Қателерімді талдайық»)
    rememberMistakes(
      user!.id,
      lesson!.id,
      items.map((it) => it.q.id),
      items.flatMap((it, i) => (grade(it.q, answers[i]) < it.q.points ? [{ questionId: it.q.id, answer: answers[i], prompt: it.q.text || it.q.prompt }] : [])),
    );
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
      <nav aria-label="Навигация" className="mb-5 text-sm">
        <Link href="/lessons" className="inline-flex items-center gap-1.5 font-medium text-muted transition-colors hover:text-heading">
          <ArrowLeftIcon size={16} />
          Барлық сабақтар
        </Link>
      </nav>
      <PageHeader
        kicker="Сабақ"
        title={lesson.title}
        subtitle={lesson.description}
        aside={
          <div className="w-full sm:w-64">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-muted">Прогресс</span>
              <span className="font-medium">
                {score}/{max} балл
              </span>
            </div>
            <ProgressBar value={max ? (Math.min(score, max) / max) * 100 : 0} label="Сабақ прогресі" />
            {result?.manual !== null && result?.manual !== undefined && <p className="mt-1.5 text-xs text-muted">Мұғалім қойған балл</p>}
          </div>
        }
      />
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
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <p className="font-serif text-lg font-semibold text-heading">{phase.task.title}</p>
            <p className="shrink-0 text-sm font-medium text-muted">
              {phase.index + 1} / {phase.items.length} · {item.q.points} балл
            </p>
          </div>
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
              {phase.index === 0 ? <CloseIcon size={18} /> : <ArrowLeftIcon size={18} />}
              {phase.index === 0 ? "Шығу" : "Алдыңғы"}
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={() => (isLast ? finish(phase.task, phase.items, phase.answers) : setPhase({ ...phase, index: phase.index + 1 }))}
            >
              {saving ? (
                <BusyLabel>Сақталуда...</BusyLabel>
              ) : isLast ? (
                <>
                  <CheckIcon size={18} />
                  Аяқтау
                </>
              ) : (
                <>
                  Келесі
                  <ArrowRightIcon size={18} />
                </>
              )}
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
    const mistakes = phase.items
      .map((it, i) => ({ it, answer: phase.answers[i], got: grade(it.q, phase.answers[i]) }))
      .filter((m) => m.got < m.it.q.points);
    const next = nextTask(lesson, phase.task.id);
    return (
      <>
        {header}
        <OrnateCard className="mx-auto max-w-3xl text-center">
          <span
            aria-hidden="true"
            className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${passed ? "bg-success/12 text-success" : "bg-gold/15 text-gold-text"}`}
          >
            {passed ? <BadgeCheckIcon size={32} /> : <RefreshIcon size={30} />}
          </span>
          <h2 className="mt-4 font-serif text-2xl font-semibold text-heading">{passed ? "Құттықтаймыз!" : "Қайталап көріңіз"}</h2>
          <p className="my-3 font-serif text-5xl font-semibold text-heading">
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
              <Divider />
              <h3 className="mb-3 font-serif text-lg font-semibold text-heading">Қателермен жұмыс</h3>
              <ul className="space-y-3">
                {mistakes.map(({ it, answer, got }) => (
                  <li key={it.q.id} className="rounded-xl border border-line border-l-2 border-l-clay/60 bg-bg p-4">
                    <p className="font-medium">{it.q.prompt}</p>
                    {it.q.text && <p className="mt-1 font-serif italic text-proverb">{it.q.text}</p>}
                    <p className="mt-2 whitespace-pre-line text-sm">
                      Дұрыс жауап: <strong>{correctText(it.q)}</strong>
                    </p>
                    {got > 0 && <p className="text-xs text-muted">Жартылай: {got}/{it.q.points} балл</p>}
                    <div className="mt-3">
                      <AiMistakeButton lessonId={lesson.id} questionId={it.q.id} answer={answer} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {passed && next ? (
              <button type="button" className="btn-primary" onClick={() => start(next)}>
                Келесі тапсырма
                <ArrowRightIcon size={18} />
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => start(phase.task)}>
                <RefreshIcon size={18} />
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
        <section aria-labelledby="study-title" className="mb-12">
          <SectionTitle id="study-title" kicker="Алдымен оқыңыз" title="Осы мақалдарды есте сақтаңыз" />
          <ol className="grid gap-4 md:grid-cols-2">
            {study.map((p, i) => (
              <li key={p.id} className="card relative p-6 pl-16">
                <span aria-hidden="true" className="absolute top-5 left-5 font-serif text-2xl font-semibold text-gold-text/80">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="font-serif text-xl leading-snug font-medium text-proverb italic">«{p.text}»</p>
                <p className="mt-3">{p.explanation}</p>
                {p.translation_ru && (
                  <p lang="ru" className="mt-2 text-sm text-muted">
                    {p.translation_ru}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="tasks-title">
        <SectionTitle id="tasks-title" kicker="Тексеріс" title="Тапсырмалар" />
        {lesson.tasks.length === 0 && <p className="text-muted">Тапсырмалар әлі қосылмаған.</p>}
        <ol className="card divide-y divide-line overflow-hidden">
          {lesson.tasks.map((t, i) => {
            const best = result?.tasks[t.id];
            const passed = taskPassed(lesson, t.id, best);
            const empty = t.questions.length === 0;
            return (
              <li key={t.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:px-6">
                <span
                  aria-hidden="true"
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-serif font-semibold ${
                    passed ? "bg-success text-white" : "border border-line bg-bg text-muted"
                  }`}
                >
                  {passed ? <CheckIcon size={18} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{t.title}</h3>
                  {t.instruction && <p className="text-sm text-muted">{t.instruction}</p>}
                  <p className="mt-0.5 text-sm text-muted">
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
          <p className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-success/40 bg-success/10 p-4 font-serif text-lg font-semibold text-success">
            <BadgeCheckIcon size={22} />
            Сабақ толық аяқталды!
          </p>
        )}
      </section>
    </>
  );
}

function nextTask(lesson: Lesson, taskId: string) {
  const i = lesson.tasks.findIndex((t) => t.id === taskId);
  return lesson.tasks.slice(i + 1).find((t) => t.questions.length > 0);
}
