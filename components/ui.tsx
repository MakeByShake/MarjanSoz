import type { ReactNode } from "react";
import { Rhomb } from "./Ornament";

/** Заголовок страницы в духе журнальной вёрстки: капитель, крупная антиква, подзаголовок. */
export function PageHeader({
  title,
  subtitle,
  kicker,
  aside,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  kicker?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {kicker && (
          <p className="kicker mb-2">
            <Rhomb />
            {kicker}
          </p>
        )}
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-heading sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-muted sm:text-lg">{subtitle}</p>}
      </div>
      {aside}
    </div>
  );
}

/** Заголовок раздела внутри страницы: капитель + антиква, справа — необязательная ссылка. */
export function SectionTitle({ id, kicker, title, action }: { id?: string; kicker?: ReactNode; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {kicker && (
          <p className="kicker mb-1.5">
            <Rhomb />
            {kicker}
          </p>
        )}
        <h2 id={id} className="font-serif text-2xl font-semibold tracking-tight text-heading">
          {title}
        </h2>
      </div>
      {action}
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
      className={`w-full overflow-hidden rounded-full bg-track ${large ? "h-2.5" : "h-1.5"}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${pct === 100 ? "bg-success" : "bg-primary dark:bg-gold"}`}
        style={{ width: `${pct}%` }}
      />
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

/** Пустое состояние: иконка в мягком круге, заголовок, пояснение. */
export function EmptyState({ icon, title, text, children }: { icon: ReactNode; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full border border-line bg-card text-gold-text">{icon}</span>
      <h2 className="mt-4 font-serif text-xl font-semibold text-heading">{title}</h2>
      {text && <p className="mt-1 text-muted">{text}</p>}
      {children && <div className="mt-6 flex flex-col gap-3 sm:flex-row">{children}</div>}
    </div>
  );
}
