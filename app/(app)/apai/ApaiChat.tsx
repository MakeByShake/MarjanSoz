"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRightIcon, NotebookIcon, RefreshIcon, SendIcon } from "@/components/Icons";
import { LogoMark } from "@/components/Logo";
import { FormattedText, LangToggle } from "@/components/MarjanApai";
import { Rhomb } from "@/components/Ornament";
import { ProgressBar, Spinner } from "@/components/ui";
import type { AiLang } from "@/lib/ai/config";
import { AiError, saveLang, savedLang, streamAI } from "@/lib/ai/client";
import { clearMistakes, recentMistakes, type SavedMistake } from "@/lib/ai/mistakes";
import { useLessons, useMyResults } from "@/lib/lessons";
import { levelFor, useCurrentUser } from "@/lib/user";

/*
  Чат с Маржан апай: поиск мақалов по ситуации, объяснения, разбор ошибок и советы по урокам.
  Переписка живёт только на этой странице; успеваемость и мақалы сервер каждый раз берёт из базы.
*/

type Message = { id: number; role: "user" | "model"; text: string; notice?: string | null };

const SUGGESTIONS = [
  "Досым уәдесін орындамады. Қандай мақал айтуға болады?",
  "«Өнер алды — қызыл тіл» нені білдіреді?",
  "Еңбек туралы 3 мақал тауып берші",
  "Менің үлгерімім қалай? Қай сабақты қайталайын?",
];

const MISTAKES_PROMPT = "Соңғы сабақтардағы қателерімді талдап берші";
const MAX_MESSAGE = 600;

const noop = () => () => {};

/** Значение из localStorage/адресной строки без рассинхрона с серверной разметкой */
function useBrowserValue<T>(read: () => T, server: T) {
  return useSyncExternalStore(noop, read, () => server);
}

export function ApaiChat() {
  const user = useCurrentUser();
  const lessons = useLessons(false);
  const results = useMyResults(user?.id);

  const storedLang = useBrowserValue(savedLang, "kk" as AiLang);
  const [pickedLang, setPickedLang] = useState<AiLang | null>(null);
  const lang = pickedLang ?? storedLang;

  // Ошибки из уроков (в этом браузере). Снимок — строка, чтобы не перечитывать без нужды
  const [mistakesVersion, setMistakesVersion] = useState(0);
  const mistakesRaw = useBrowserValue(() => (user ? JSON.stringify(recentMistakes(user.id)) : "[]"), "[]");
  const mistakes = useMemo(() => JSON.parse(mistakesRaw) as SavedMistake[], [mistakesRaw]);
  void mistakesVersion;

  const prefill = useBrowserValue(() => new URLSearchParams(location.search).get("q") ?? "", "");

  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; retry: string; withMistakes: boolean } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const useMistakes = useRef(false);
  const nextId = useRef(1);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, error]);

  const total = lessons.data?.length ?? 0;
  const done = (lessons.data ?? []).filter((l) => results.data?.get(l.id)?.completed).length;
  const nextLesson = (lessons.data ?? []).find((l) => !results.data?.get(l.id)?.completed);
  const firstName = user?.username.split(/\s+/)[0] ?? "";

  const greeting = [
    `Сәлем${firstName ? `, ${firstName}` : ""}! Мен — **Маржан апай**.`,
    "Жағдайыңды жазсаң — сәйкес мақал табамын. Түсініксіз мақал не балама сөз болса — түсіндіремін. Сабақтағы қателеріңді де бірге талдаймыз.",
    lessons.data && results.data
      ? done > 0
        ? `Сен ${total} сабақтың ${done}-ін аяқтадың — жарайсың!${nextLesson ? ` Келесісі: «${nextLesson.title}».` : ""}`
        : total > 0
          ? "Әлі бірде-бір сабақ аяқталмаған — бірге бастайық!"
          : ""
      : "",
    mistakes.length > 0 ? `Соңғы сабақтарда ${mistakes.length} қате бар — талдап көрейік пе?` : "",
  ]
    .filter(Boolean)
    .join("\n");

  async function send(raw: string, withMistakes = false) {
    const text = raw.trim().slice(0, MAX_MESSAGE);
    if (!text || busy) return;
    if (withMistakes || /қате|ошиб|mistake/i.test(text)) useMistakes.current = true;

    const ctrl = new AbortController();
    abort.current = ctrl;
    const userMsg: Message = { id: nextId.current++, role: "user", text };
    const replyId = nextId.current++;
    const history = [...messages.filter((m) => m.text), userMsg];
    setMessages([...history, { id: replyId, role: "model", text: "" }]);
    setError(null);
    setBusy(true);

    const update = (patch: Partial<Message>) => setMessages((list) => list.map((m) => (m.id === replyId ? { ...m, ...patch } : m)));
    try {
      const reply = await streamAI(
        "/api/ai/chat",
        {
          messages: history.map(({ role, text }) => ({ role, text })).slice(-10),
          lang,
          ...(useMistakes.current && mistakes.length
            ? { mistakes: mistakes.slice(0, 5).map(({ lessonId, questionId, answer }) => ({ lessonId, questionId, answer })) }
            : {}),
        },
        (t) => update({ text: t }),
        ctrl.signal,
      );
      if (!ctrl.signal.aborted) update({ notice: reply.notice });
    } catch (e) {
      if (!ctrl.signal.aborted) {
        // Неудачный вопрос убираем из переписки — его можно отправить ещё раз
        setMessages((list) => list.filter((m) => m.id !== replyId && m.id !== userMsg.id));
        setError({ text: e instanceof AiError ? e.message : "Маржан апай жауап бере алмады.", retry: text, withMistakes });
      }
    } finally {
      if (abort.current === ctrl) setBusy(false);
    }
  }

  function stop() {
    abort.current?.abort();
    setBusy(false);
    setMessages((list) => list.filter((m) => m.text));
  }

  function restart() {
    stop();
    setMessages([]);
    setError(null);
    useMistakes.current = false;
  }

  const fresh = messages.length === 0;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section aria-label="Маржан апаймен әңгіме" className="card flex h-[min(78dvh,760px)] min-h-[30rem] flex-col overflow-hidden">
        <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <span className="relative">
            <LogoMark className="h-10 w-10" />
            <span aria-hidden="true" className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
          </span>
          <div className="min-w-0">
            <p className="font-serif text-lg leading-tight font-semibold text-heading">Маржан апай</p>
            <p className="text-xs text-muted">{busy ? "Жазып жатыр…" : "Мақал-мәтел ұстазы"}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle
              value={lang}
              onChange={(l) => {
                saveLang(l);
                setPickedLang(l);
              }}
            />
            {!fresh && (
              <button
                type="button"
                onClick={restart}
                title="Жаңа әңгіме"
                aria-label="Жаңа әңгіме"
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-primary/8 hover:text-heading"
              >
                <RefreshIcon size={18} />
              </button>
            )}
          </div>
        </header>

        <div ref={scroller} aria-live="polite" className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
          <Bubble role="model" text={greeting} />

          {fresh && (
            <div className="flex flex-wrap gap-2 pl-11">
              {mistakes.length > 0 && (
                <Suggestion onClick={() => send(MISTAKES_PROMPT, true)} accent>
                  Қателерімді талдайық
                </Suggestion>
              )}
              {SUGGESTIONS.map((s) => (
                <Suggestion key={s} onClick={() => send(s)}>
                  {s}
                </Suggestion>
              ))}
            </div>
          )}

          {messages.map((m) =>
            m.role === "model" && !m.text ? (
              <div key={m.id} className="flex items-center gap-3 pl-1 text-sm text-muted">
                <LogoMark className="h-8 w-8 shrink-0" />
                <Spinner className="h-4 w-4" />
                Маржан апай ойланып жатыр…
              </div>
            ) : (
              <Bubble key={m.id} role={m.role} text={m.text} notice={m.notice} />
            ),
          )}

          {error && (
            <div role="alert" className="ml-11 flex flex-wrap items-center gap-3 rounded-xl border border-clay/40 bg-clay/8 px-4 py-3 text-sm">
              <span className="text-red-800 dark:text-red-200">{error.text}</span>
              <button
                type="button"
                onClick={() => send(error.retry, error.withMistakes)}
                className="cursor-pointer font-semibold underline underline-offset-4"
              >
                Қайталау
              </button>
            </div>
          )}
        </div>

        <Composer key={prefill} initial={prefill} busy={busy} onSend={send} onStop={stop} />
      </section>

      <aside className="space-y-5">
        <ProgressCard
          loading={!lessons.data || !results.data}
          points={user?.points ?? 0}
          done={done}
          total={total}
          next={nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null}
        />
        <MistakesCard
          mistakes={mistakes}
          busy={busy}
          onReview={() => send(MISTAKES_PROMPT, true)}
          onClear={() => {
            if (!user) return;
            clearMistakes(user.id);
            setMistakesVersion((v) => v + 1);
          }}
        />
        <p className="px-1 text-xs leading-relaxed text-muted">
          Маржан апай — жасанды интеллект, кейде қателесуі мүмкін. Мақалдарды тек сайт кітапханасынан ұсынады. Күніне 20 сұраққа дейін.
        </p>
      </aside>
    </div>
  );
}

function Bubble({ role, text, notice }: { role: "user" | "model"; text: string; notice?: string | null }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 whitespace-pre-line text-white dark:bg-primary/80">{text}</p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <LogoMark className="mt-0.5 h-8 w-8 shrink-0" />
      <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-line bg-bg px-4 py-3 text-[15px] leading-relaxed">
        {notice && <p className="mb-2 text-sm text-gold-text">{notice}</p>}
        <FormattedText text={text} />
      </div>
    </div>
  );
}

function Suggestion({ children, onClick, accent }: { children: ReactNode; onClick: () => void; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-left text-sm transition-colors ${
        accent
          ? "border-gold/60 bg-gold/10 font-medium text-gold-text hover:bg-gold/18"
          : "border-line bg-card text-text hover:border-primary/40 hover:bg-primary/5"
      }`}
    >
      {children}
    </button>
  );
}

function Composer({ initial, busy, onSend, onStop }: { initial: string; busy: boolean; onSend: (text: string) => void; onStop: () => void }) {
  const [text, setText] = useState(initial);
  const submit = () => {
    if (!text.trim() || busy) return;
    onSend(text);
    setText("");
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 border-t border-line bg-card px-3 py-3 sm:px-4"
    >
      <label className="flex-1">
        <span className="sr-only">Маржан апайға хабарлама</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          rows={Math.min(4, Math.max(1, text.split("\n").length))}
          maxLength={MAX_MESSAGE}
          placeholder="Сұрағыңды не жағдайыңды жаз…"
          className="field max-h-40 min-h-12 resize-none py-3 leading-snug"
        />
      </label>
      {busy ? (
        <button type="button" onClick={onStop} className="btn-secondary h-12 shrink-0 px-4">
          Тоқтату
        </button>
      ) : (
        <button type="submit" disabled={!text.trim()} aria-label="Жіберу" className="btn-primary h-12 w-12 shrink-0 px-0">
          <SendIcon size={20} />
        </button>
      )}
    </form>
  );
}

function ProgressCard({
  loading,
  points,
  done,
  total,
  next,
}: {
  loading: boolean;
  points: number;
  done: number;
  total: number;
  next: { id: string; title: string } | null;
}) {
  const level = levelFor(points);
  return (
    <section aria-labelledby="progress-title" className="card p-5">
      <h2 id="progress-title" className="kicker mb-3">
        <Rhomb />
        Сенің жолың
      </h2>
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Spinner className="h-4 w-4" />
          Жүктелуде…
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <p className="font-serif text-3xl font-semibold text-heading">{points}</p>
            <p className="text-sm text-muted">{level.name}</p>
          </div>
          <p className="mb-4 text-xs text-muted">ұпай</p>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted">Сабақтар</span>
            <span className="font-medium">
              {done} / {total}
            </span>
          </div>
          <ProgressBar value={total ? (done / total) * 100 : 0} label="Аяқталған сабақтар" />
          {next && (
            <Link
              href={`/lessons/${next.id}`}
              className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="min-w-0">
                <span className="block text-xs text-muted">Келесі сабақ</span>
                <span className="block truncate font-medium text-heading">{next.title}</span>
              </span>
              <ArrowRightIcon size={16} className="shrink-0 text-muted" />
            </Link>
          )}
        </>
      )}
    </section>
  );
}

function MistakesCard({ mistakes, busy, onReview, onClear }: { mistakes: SavedMistake[]; busy: boolean; onReview: () => void; onClear: () => void }) {
  return (
    <section aria-labelledby="mistakes-title" className="card p-5">
      <h2 id="mistakes-title" className="kicker mb-3">
        <Rhomb />
        Қателермен жұмыс
      </h2>
      {mistakes.length === 0 ? (
        <p className="flex items-start gap-3 text-sm text-muted">
          <NotebookIcon size={22} className="mt-0.5 shrink-0 text-gold-text" />
          Сабақтағы қателерің осында жиналады — Маржан апай оларды бірге талдап береді.
        </p>
      ) : (
        <>
          <ul className="mb-4 space-y-2">
            {mistakes.slice(0, 3).map((m) => (
              <li key={`${m.lessonId}/${m.questionId}`} className="line-clamp-2 border-l-2 border-clay/60 pl-3 font-serif text-sm text-proverb italic">
                {m.prompt}
              </li>
            ))}
          </ul>
          {mistakes.length > 3 && <p className="mb-3 text-xs text-muted">тағы {mistakes.length - 3} қате</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onReview} disabled={busy} className="btn-primary min-h-10 px-4 text-sm">
              Талдауды бастау
            </button>
            <button type="button" onClick={onClear} className="cursor-pointer text-sm text-muted underline underline-offset-4 hover:text-heading">
              Тазалау
            </button>
          </div>
        </>
      )}
    </section>
  );
}
