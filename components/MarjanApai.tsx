"use client";

import { useEffect, useRef, useState } from "react";
import type { AiLang } from "@/lib/ai/config";
import { AiError, saveLang, savedLang, streamAI } from "@/lib/ai/client";
import type { Answer } from "@/lib/questions";
import { CloseIcon, SparklesIcon } from "./Icons";
import { LogoMark } from "./Logo";
import { Spinner } from "./ui";

/*
  Маржан апай: кнопка → панель с ответом ИИ. Ответ идёт потоком, язык выбирается (Қаз / Рус / Eng),
  запрос можно остановить. variant="dark" — для тёмной панели «Күннің мақалы».
*/

type Variant = "light" | "dark";
type Request = { path: "/api/ai/explain" | "/api/ai/mistake"; body: Record<string, unknown> };

export const LANGS: { id: AiLang; label: string }[] = [
  { id: "kk", label: "Қаз" },
  { id: "ru", label: "Рус" },
  { id: "en", label: "Eng" },
];

export function AiExplainButton({ kind, id, variant = "light" }: { kind: "proverb" | "balama"; id: string; variant?: Variant }) {
  return <AiPanel request={{ path: "/api/ai/explain", body: { kind, id } }} label="Маржан апай түсіндірсін" variant={variant} />;
}

export function AiMistakeButton({ lessonId, questionId, answer }: { lessonId: string; questionId: string; answer: Answer }) {
  return <AiPanel request={{ path: "/api/ai/mistake", body: { lessonId, questionId, answer } }} label="Неге қате?" variant="light" />;
}

function AiPanel({ request, label, variant }: { request: Request; label: string; variant: Variant }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<AiLang>("kk");
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const dark = variant === "dark";

  // Остановить запрос, если карточка исчезла (сменилась страница)
  useEffect(() => () => abort.current?.abort(), []);

  async function ask(nextLang: AiLang) {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setLang(nextLang);
    setText("");
    setNotice(null);
    setError("");
    setBusy(true);
    try {
      const reply = await streamAI(request.path, { ...request.body, lang: nextLang }, setText, ctrl.signal);
      if (!ctrl.signal.aborted) setNotice(reply.notice);
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof AiError ? e.message : "Маржан апай жауап бере алмады. Қайталап көріңіз.");
    } finally {
      if (abort.current === ctrl) setBusy(false);
    }
  }

  function start() {
    const l = savedLang();
    setOpen(true);
    ask(l);
  }

  function stop() {
    abort.current?.abort();
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={start}
        className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
          dark
            ? "border-gold/50 text-gold hover:bg-gold/10"
            : "border-gold/50 bg-gold/8 text-gold-text hover:border-gold hover:bg-gold/15"
        }`}
      >
        <SparklesIcon size={18} />
        {label}
      </button>
    );
  }

  return (
    <section
      aria-label="Маржан апай"
      aria-busy={busy}
      className={`rounded-2xl border text-left ${dark ? "border-white/15 bg-white/6 text-on-panel" : "border-gold/40 bg-bg text-text"}`}
    >
      <div className={`flex flex-wrap items-center gap-2 border-b px-4 py-2.5 ${dark ? "border-white/10" : "border-line"}`}>
        <LogoMark className="h-7 w-7 shrink-0" />
        <span className={`font-serif font-semibold ${dark ? "" : "text-heading"}`}>Маржан апай</span>
        <LangToggle
          value={lang}
          dark={dark}
          className="ml-auto"
          onChange={(l) => {
            saveLang(l);
            ask(l);
          }}
        />
        <button
          type="button"
          onClick={() => {
            stop();
            setOpen(false);
          }}
          aria-label="Жабу"
          className={`grid h-8 w-8 cursor-pointer place-items-center rounded-lg transition-colors ${dark ? "hover:bg-white/10" : "text-muted hover:bg-primary/8"}`}
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div aria-live="polite" className="px-4 py-3.5 text-[15px] leading-relaxed">
        {notice && <p className={`mb-2 text-sm ${dark ? "text-gold" : "text-gold-text"}`}>{notice}</p>}
        {error ? (
          <div role="alert" className="flex flex-wrap items-center gap-3">
            <span className={dark ? "text-red-200" : "text-red-800 dark:text-red-200"}>{error}</span>
            <button type="button" onClick={() => ask(lang)} className="cursor-pointer text-sm font-semibold underline underline-offset-4">
              Қайталау
            </button>
          </div>
        ) : text ? (
          <FormattedText text={text} dark={dark} />
        ) : busy ? (
          <p className={`flex items-center gap-2 ${dark ? "text-on-panel/75" : "text-muted"}`}>
            <Spinner className="h-4 w-4" />
            Маржан апай ойланып жатыр…
          </p>
        ) : null}
        {busy && (
          <button
            type="button"
            onClick={stop}
            className={`mt-3 cursor-pointer text-sm font-medium underline underline-offset-4 ${dark ? "text-on-panel/70" : "text-muted"}`}
          >
            Тоқтату
          </button>
        )}
      </div>
    </section>
  );
}

/** Қаз / Рус / Eng — язык ответа Маржан апай */
export function LangToggle({ value, onChange, dark = false, className = "" }: { value: AiLang; onChange: (l: AiLang) => void; dark?: boolean; className?: string }) {
  return (
    <div role="group" aria-label="Жауап тілі" className={`flex rounded-lg border p-0.5 text-xs ${dark ? "border-white/15" : "border-line"} ${className}`}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          aria-pressed={value === l.id}
          onClick={() => onChange(l.id)}
          className={`cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors ${
            value === l.id
              ? dark
                ? "bg-gold text-[#1a1608]"
                : "bg-primary text-white dark:bg-gold dark:text-[#1a1608]"
              : dark
                ? "text-on-panel/70 hover:text-on-panel"
                : "text-muted hover:text-heading"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

/** Ответ ИИ: строки «## Заголовок» — подзаголовки, **жирный** — выделение. HTML не вставляем. */
export function FormattedText({ text, dark = false }: { text: string; dark?: boolean }) {
  const blocks = text.split(/\n+/).filter((l) => l.trim());
  return (
    <div className="space-y-1.5">
      {blocks.map((line, i) => {
        const heading = line.match(/^#{1,4}\s*(.+)$/);
        if (heading) {
          return (
            <p key={i} className={`pt-1.5 text-xs font-semibold tracking-[0.14em] uppercase first:pt-0 ${dark ? "text-gold" : "text-gold-text"}`}>
              {heading[1].replace(/\*\*/g, "")}
            </p>
          );
        }
        return <p key={i}>{withBold(line.replace(/^[-•]\s+/, "• "))}</p>;
      })}
    </div>
  );
}

function withBold(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}
