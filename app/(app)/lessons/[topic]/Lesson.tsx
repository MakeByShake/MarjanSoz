"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { OrnateCard } from "@/components/Ornament";
import { LoadError, Loading, PageHeader, ProgressBar } from "@/components/ui";
import { groupByTopic, topicMeta, useLibrary } from "@/lib/proverbs";
import { type Answer, buildTest, isCorrect, PASS_PERCENT, type Question } from "@/lib/quiz";
import type { Proverb } from "@/lib/types";
import { completeProverbs, POINTS_PER_PROVERB, resetTopic, useCurrentUser } from "@/lib/user";

const LESSON_SIZE = 3;
const LETTERS = ["А", "Ә", "Б", "В", "Г", "Ғ", "Д", "Е"];

type Result = { correct: number; total: number; percent: number; earned: number; mistakes: Question[] };

type Phase =
  | { name: "study" }
  | { name: "test"; lesson: Proverb[]; questions: Question[]; index: number; answers: Answer[] }
  | { name: "result"; lesson: Proverb[]; result: Result };

export function Lesson({ topic }: { topic: string }) {
  const user = useCurrentUser();
  const { proverbs, topics, loading, error } = useLibrary();
  const [phase, setPhase] = useState<Phase>({ name: "study" });
  const [confirmReset, setConfirmReset] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const meta = topicMeta(topics, topic);
  const groups = useMemo(() => groupByTopic(proverbs, topics), [proverbs, topics]);
  const topicProverbs = groups.get(topic) ?? [];
  const topicIds = topicProverbs.map((p) => p.id);
  const topicOrder = [...groups.keys()];
  const nextTopic = topicOrder[topicOrder.indexOf(topic) + 1];

  if (error) return <LoadError />;
  if (loading || !user) return <Loading />;

  const learned = new Set(user.completedProverbs);
  const done = topicIds.filter((id) => learned.has(id)).length;
  const unlearned = topicProverbs.filter((p) => !learned.has(p.id)).slice(0, LESSON_SIZE);

  const header = (
    <>
      <nav aria-label="Навигация" className="mb-4 text-sm text-muted">
        <Link href="/lessons" className="text-primary underline-offset-4 hover:underline dark:text-gold">
          Сабақтар
        </Link>{" "}
        / {meta.title}
      </nav>
      <PageHeader title={`${meta.icon} ${meta.title}`} />
      <div className="mx-auto mb-8 max-w-xl">
        <ProgressBar value={topicIds.length ? (done / topicIds.length) * 100 : 0} label="Тақырып прогресі" />
        <p className="mt-2 text-center text-sm text-muted">
          {done}/{topicIds.length} мақал үйренілді
        </p>
      </div>
    </>
  );

  if (topicProverbs.length === 0) {
    return (
      <>
        {header}
        <Message icon="😕" title="Мақалдар әлі қосылмаған" text="Бұл тақырыпқа мақалдар әлі қосылмаған. Кейінірек тексеріңіз.">
          <Link href="/lessons" className="btn-primary">
            Сабақтарға оралу
          </Link>
        </Message>
      </>
    );
  }

  if (phase.name === "test") {
    const q = phase.questions[phase.index];
    const isLast = phase.index === phase.questions.length - 1;
    const setAnswer = (a: Answer) =>
      setPhase({ ...phase, answers: phase.answers.map((old, i) => (i === phase.index ? a : old)) });

    const finish = async () => {
      const correct = phase.questions.filter((qq, i) => isCorrect(qq, phase.answers[i])).length;
      const total = phase.questions.length;
      const percent = Math.round((correct / total) * 100);
      let earned = 0;
      if (percent >= PASS_PERCENT) {
        setSaving(true);
        try {
          earned = await completeProverbs(user, phase.lesson.map((p) => p.id), topic, topicIds);
          setSaveError(false);
        } catch {
          setSaveError(true);
          return;
        } finally {
          setSaving(false);
        }
      }
      const mistakes = phase.questions.filter((qq, i) => !isCorrect(qq, phase.answers[i]));
      setPhase({ name: "result", lesson: phase.lesson, result: { correct, total, percent, earned, mistakes } });
    };

    return (
      <>
        {header}
        <OrnateCard className="mx-auto max-w-3xl">
          <p className="mb-4 text-center text-sm font-medium text-muted">
            Сұрақ {phase.index + 1} / {phase.questions.length}
          </p>
          <QuestionView key={phase.index} question={q} answer={phase.answers[phase.index]} onAnswer={setAnswer} />
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              className="btn-secondary"
              disabled={phase.index === 0}
              onClick={() => setPhase({ ...phase, index: phase.index - 1 })}
            >
              ← Алдыңғы
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={() => (isLast ? finish() : setPhase({ ...phase, index: phase.index + 1 }))}
            >
              {saving ? "Сақталуда..." : isLast ? "Тестті аяқтау" : "Келесі →"}
            </button>
          </div>
          {saveError && (
            <p role="alert" className="mt-4 text-center text-sm text-red-800 dark:text-red-200">
              Нәтижені сақтау мүмкін болмады. Интернетті тексеріп, қайта басыңыз.
            </p>
          )}
        </OrnateCard>
      </>
    );
  }

  if (phase.name === "result") {
    const { result } = phase;
    const passed = result.percent >= PASS_PERCENT;
    return (
      <>
        {header}
        <OrnateCard className="mx-auto max-w-3xl text-center">
          <div aria-hidden="true" className="text-5xl">
            {passed ? "🎉" : "📝"}
          </div>
          <h2 className="mt-2 font-serif text-2xl font-bold text-heading">{passed ? "Құттықтаймыз!" : "Қайталап көріңіз"}</h2>
          <p className="mt-2">
            Сіз {result.total} сұрақтың {result.correct}-іне дұрыс жауап бердіңіз
          </p>
          <p className="my-3 font-serif text-4xl font-bold text-heading">{result.percent}%</p>
          <p className="font-medium">+{result.earned} ұпай</p>
          {passed && <p className="mt-2 text-muted">Сіз бұл мақалдарды сәтті үйрендіңіз!</p>}
          {!passed && <p className="mt-2 text-muted">Өту үшін кемінде {PASS_PERCENT}% керек.</p>}

          {result.mistakes.length > 0 && (
            <div className="mt-6 text-left">
              <h3 className="mb-3 font-serif text-lg font-bold text-heading">Қателер:</h3>
              <ul className="space-y-3">
                {result.mistakes.map((m, i) => (
                  <li key={i} className="rounded-lg border border-line bg-bg p-4">
                    {m.kind === "match" ? (
                      <>
                        <p className="font-medium">Мақалдарды мағынасымен сәйкестендіру</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                          {m.pairs.map((p) => (
                            <li key={p.proverbId}>
                              <strong>{p.text}</strong> — {p.meaning}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">{m.prompt}</p>
                        <p className="mt-1 text-sm">
                          Дұрыс жауап: <strong>{m.answer}</strong>
                        </p>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {passed ? (
              done < topicIds.length ? (
                <button type="button" className="btn-primary" onClick={() => setPhase({ name: "study" })}>
                  Келесі мақалдар
                </button>
              ) : nextTopic ? (
                <Link href={`/lessons/${encodeURIComponent(nextTopic)}`} className="btn-primary">
                  Келесі тақырып
                </Link>
              ) : null
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const questions = buildTest(phase.lesson, proverbs);
                  setPhase({ name: "test", lesson: phase.lesson, questions, index: 0, answers: questions.map(() => undefined) });
                }}
              >
                Қайталау
              </button>
            )}
            <Link href="/lessons" className="btn-secondary">
              Сабақтарға оралу
            </Link>
          </div>
        </OrnateCard>
      </>
    );
  }

  if (unlearned.length === 0) {
    return (
      <>
        {header}
        <Message icon="🎉" title="Барлық мақалдар үйренілді!" text="Сіз бұл тақырыптың барлық мақалдарын сәтті үйрендіңіз.">
          {nextTopic && (
            <Link href={`/lessons/${encodeURIComponent(nextTopic)}`} className="btn-primary">
              Келесі тақырып
            </Link>
          )}
          <Link href="/lessons" className="btn-secondary">
            Сабақтарға оралу
          </Link>
          <button type="button" className="btn-secondary" onClick={() => setConfirmReset(true)}>
            Прогресті қайта бастау
          </button>
        </Message>
        <ConfirmDialog
          open={confirmReset}
          title="Шынымен бұл тақырыптың прогресін қайта бастағыңыз келе ме?"
          confirmLabel="Қайта бастау"
          onClose={() => setConfirmReset(false)}
          onConfirm={() => resetTopic(user, topic, topicIds)}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <h2 className="mb-4 text-center font-serif text-xl font-bold text-heading">Осы мақалдарды оқып, есте сақтаңыз</h2>
      <ol className="space-y-5">
        {unlearned.map((p, i) => (
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
      <div className="mt-8 text-center">
        <button
          type="button"
          className="btn-primary text-lg"
          onClick={() => {
            const questions = buildTest(unlearned, proverbs);
            setPhase({ name: "test", lesson: unlearned, questions, index: 0, answers: questions.map(() => undefined) });
          }}
        >
          Тестті бастау
        </button>
        <p className="mt-2 text-sm text-muted">
          Өту үшін {PASS_PERCENT}% жеткілікті, әр жаңа мақал үшін +{POINTS_PER_PROVERB} ұпай
        </p>
      </div>
    </>
  );
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

function QuestionView({ question, answer, onAnswer }: { question: Question; answer: Answer; onAnswer: (a: Answer) => void }) {
  if (question.kind === "choice") {
    return (
      <fieldset>
        <legend className="mb-2 w-full text-center font-serif text-lg font-bold text-heading">Дұрыс сөзді таңдаңыз:</legend>
        <p className="mb-6 text-center font-serif text-xl italic text-proverb">{question.prompt}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {question.options.map((o) => (
            <label
              key={o}
              className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-line bg-bg px-4 py-3 text-center font-medium transition hover:border-primary has-checked:border-primary has-checked:bg-primary has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-gold dark:hover:border-gold dark:has-checked:border-gold dark:has-checked:bg-gold dark:has-checked:text-bg"
            >
              <input
                type="radio"
                name="choice"
                value={o}
                checked={answer === o}
                onChange={() => onAnswer(o)}
                className="sr-only"
              />
              {o}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (question.kind === "completion") {
    return (
      <div className="text-center">
        <h3 className="mb-2 font-serif text-lg font-bold text-heading">Мақалдың жалғасын жазыңыз:</h3>
        <p className="mb-6 font-serif text-xl italic text-proverb">{question.prompt}</p>
        <label className="mx-auto block max-w-lg text-left">
          <span className="sr-only">Жауабыңыз</span>
          <input
            type="text"
            autoFocus
            autoComplete="off"
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="Жауапты енгізіңіз"
            className="field text-lg"
          />
        </label>
        <p className="mt-2 text-sm text-muted">Бас әріп пен тыныс белгілері есепке алынбайды</p>
      </div>
    );
  }

  const chosen = typeof answer === "object" ? answer : {};
  return (
    <div>
      <h3 className="mb-6 text-center font-serif text-lg font-bold text-heading">Мақалдарды мағынасымен сәйкестендіріңіз:</h3>
      <h4 className="mb-2 font-semibold">Мағыналар:</h4>
      <ul className="mb-6 space-y-2">
        {question.meanings.map((m, i) => (
          <li key={m} className="flex gap-3 rounded-xl border border-gold/50 bg-bg p-3">
            <span className="font-serif font-bold text-heading">{LETTERS[i]}</span>
            <span>{m}</span>
          </li>
        ))}
      </ul>
      <h4 className="mb-2 font-semibold">Мақалдар:</h4>
      <ol className="space-y-5">
        {question.pairs.map((p, i) => (
          <li key={p.proverbId} className="rounded-xl border border-line bg-bg p-4">
            <label htmlFor={`match-${p.proverbId}`} className="mb-2 block font-serif italic text-proverb">
              {i + 1}. «{p.text}»
            </label>
            <select
              id={`match-${p.proverbId}`}
              value={chosen[p.proverbId] ?? ""}
              onChange={(e) => onAnswer({ ...chosen, [p.proverbId]: e.target.value })}
              className="field"
            >
              <option value="" disabled>
                Мағынасын таңдаңыз
              </option>
              {question.meanings.map((m, j) => (
                <option key={m} value={m}>
                  {LETTERS[j]} — {m.length > 40 ? m.slice(0, 40) + "…" : m}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ol>
    </div>
  );
}
