import type { ReactNode } from "react";
import { Divider } from "./Ornament";

export function PageHeader({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-8 text-center">
      <h1 className="font-serif text-3xl font-bold text-heading sm:text-4xl">{title}</h1>
      <Divider />
      {subtitle && <p className="text-muted">{subtitle}</p>}
    </div>
  );
}

export function ProgressBar({ value, label, large }: { value: number; label: string; large?: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full overflow-hidden rounded-full bg-track ${large ? "h-3" : "h-2"}`}
    >
      <div className="h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Крутящийся значок загрузки. Цвет берёт от текста (currentColor). */
export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={`shrink-0 animate-spin ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Текст кнопки во время действия: значок + надпись. */
export function BusyLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner className="h-4 w-4" />
      {children}
    </span>
  );
}

export function Loading({ label = "Жүктелуде..." }: { label?: string }) {
  return (
    <p role="status" className="flex flex-col items-center gap-3 py-16 text-center text-muted">
      <Spinner className="h-8 w-8 text-primary dark:text-gold" />
      {label}
    </p>
  );
}

export function LoadError() {
  return (
    <p role="alert" className="py-16 text-center text-muted">
      Мақалдарды жүктеу мүмкін болмады. Бетті жаңартып көріңіз.
    </p>
  );
}
