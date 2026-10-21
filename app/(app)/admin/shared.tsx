"use client";

import { FirebaseError } from "firebase/app";
import { useState, type ReactNode } from "react";
import type { useLibrary } from "@/lib/proverbs";
import { ShownError } from "@/lib/usersAdmin";

export type LibraryState = ReturnType<typeof useLibrary>;

export type Status = { kind: "ok" | "error"; text: string } | null;

export { ShownError };

function errorText(e: unknown) {
  if (e instanceof ShownError) return e.message;
  const code = e instanceof FirebaseError ? e.code : "";
  if (code.endsWith("permission-denied")) {
    return "Firestore ережелері рұқсат бермеді. Firebase Console → Firestore → Rules бөліміне жобадағы жаңа firestore.rules файлын қойып, Publish басыңыз.";
  }
  if (code.endsWith("unavailable") || code.endsWith("network-request-failed")) return "Интернет байланысын тексеріңіз.";
  if (code) return `Қате: ${code}`;
  return "Сақтау мүмкін болмады. Интернетті және әкімші құқығын тексеріңіз.";
}

/** Выполняет запись в базу и показывает результат одной строкой. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setStatus(null);
    try {
      await action();
      setStatus({ kind: "ok", text: success });
      return true;
    } catch (e) {
      setStatus({ kind: "error", text: errorText(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, status, run, setStatus };
}

export function StatusLine({ status }: { status: Status }) {
  return (
    <p aria-live="polite" className="min-h-6 text-sm">
      {status && (
        <span className={status.kind === "ok" ? "text-primary dark:text-gold" : "text-red-800 dark:text-red-200"}>
          {status.kind === "ok" ? "✅ " : "⚠️ "}
          {status.text}
        </span>
      )}
    </p>
  );
}

export function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-bold text-heading">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TextField({
  label,
  value,
  onChange,
  multiline,
  required,
  hint,
  lang,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  required?: boolean;
  hint?: string;
  lang?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          rows={3}
          lang={lang}
          placeholder={placeholder}
          className="field resize-y"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          lang={lang}
          placeholder={placeholder}
          className="field"
        />
      )}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-track transition peer-checked:bg-success peer-focus-visible:outline-3 peer-focus-visible:outline-gold after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
      />
      {label}
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  className = "",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="field"
      />
    </label>
  );
}

export const smallBtn = "btn-secondary min-h-9 px-3 py-1 text-sm";
export const dangerBtn =
  "inline-flex min-h-9 items-center rounded-lg border border-red-700/50 px-3 py-1 text-sm text-red-800 transition hover:bg-red-700/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-200";
