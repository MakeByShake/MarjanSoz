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

export function Loading({ label = "Жүктелуде..." }: { label?: string }) {
  return (
    <p role="status" className="py-16 text-center text-muted">
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
