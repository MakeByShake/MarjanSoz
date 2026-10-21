"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "./Icons";

/** Короткий переключатель «‹ 4 / 20 ›» — для строки над списком. page начинается с 1. */
export function PagerCompact({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  const btn =
    "grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-line bg-card transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:border-gold/50";
  return (
    <nav aria-label="Беттер (қысқа)" className="flex items-center gap-2 text-sm">
      <button type="button" className={btn} disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Алдыңғы бет">
        <ArrowLeftIcon size={16} />
      </button>
      <span className="min-w-16 text-center tabular-nums">
        <span className="font-semibold text-heading">{page}</span>
        <span className="text-muted"> / {pages}</span>
      </span>
      <button type="button" className={btn} disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Келесі бет">
        <ArrowRightIcon size={16} />
      </button>
    </nav>
  );
}

/** Нумерованные страницы: ‹ 1 … 4 5 6 … 20 ›. page начинается с 1. */
export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  const [jump, setJump] = useState("");
  if (pages <= 1) return null;

  function go(e: FormEvent) {
    e.preventDefault();
    const n = Math.round(Number(jump));
    if (n >= 1 && n <= pages) onPage(n);
    setJump("");
  }
  const nums = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const list = [...nums].sort((a, b) => a - b);
  const btn = "grid h-10 min-w-10 cursor-pointer place-items-center rounded-xl border bg-card px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <nav aria-label="Беттер" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      <button type="button" className={`${btn} border-line`} disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Алдыңғы бет">
        <ArrowLeftIcon size={16} />
      </button>
      {list.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - list[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
          <button
            type="button"
            onClick={() => onPage(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${btn} ${
              n === page ? "border-primary bg-primary font-semibold text-white dark:border-gold dark:bg-gold dark:text-bg" : "border-line hover:border-primary/50 dark:hover:border-gold/50"
            }`}
          >
            {n}
          </button>
        </span>
      ))}
      <button type="button" className={`${btn} border-line`} disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Келесі бет">
        <ArrowRightIcon size={16} />
      </button>
      {pages > 5 && (
        <form onSubmit={go} className="ml-2 flex items-center gap-1.5 text-sm">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={pages}
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            placeholder={`1–${pages}`}
            aria-label="Бет нөмірі"
            className="h-10 w-20 rounded-xl border border-line bg-card px-2 text-center"
          />
          <button type="submit" className={`${btn} border-line hover:border-primary dark:hover:border-gold`} disabled={!jump}>
            Өту
          </button>
        </form>
      )}
    </nav>
  );
}
