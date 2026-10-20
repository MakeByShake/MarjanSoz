"use client";

import { useState, type ReactNode } from "react";
import type { useLibrary } from "@/lib/proverbs";

export type LibraryState = ReturnType<typeof useLibrary>;

export type Status = { kind: "ok" | "error"; text: string } | null;

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
    } catch {
      setStatus({ kind: "error", text: "Сақтау мүмкін болмады. Интернетті және әкімші құқығын тексеріңіз." });
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
