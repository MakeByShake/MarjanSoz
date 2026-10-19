import type { ReactNode } from "react";

/** Полоса қошқар мүйіз. Декоративная, скрыта от скринридеров. */
export function OrnamentBand({ className = "bg-ornament" }: { className?: string }) {
  return <div aria-hidden="true" className={`ornament-band w-full ${className}`} />;
}

const CORNER_POSITION = {
  tl: "left-1.5 top-1.5",
  tr: "right-1.5 top-1.5 -scale-x-100",
  bl: "bottom-1.5 left-1.5 -scale-y-100",
  br: "bottom-1.5 right-1.5 -scale-100",
} as const;

/** Угол рамки: линия с завитком-рогом, как на страницах книги. */
function Corner({ position }: { position: keyof typeof CORNER_POSITION }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 36 36"
      className={`pointer-events-none absolute h-7 w-7 text-gold sm:h-9 sm:w-9 ${CORNER_POSITION[position]}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M2 34V12C2 6 6 2 12 2H34" />
      <path d="M8 20C8 13 13 8 20 8" />
      <path d="M20 8C25 8 26 14 22 15C19.5 15.6 18.4 13.4 20 12.4" />
      <path d="M8 20C8 25 14 26 15 22C15.6 19.5 13.4 18.4 12.4 20" />
    </svg>
  );
}

/** Карточка с орнаментальной рамкой. */
export function OrnateCard({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <Tag
      className={`relative rounded-2xl border border-line bg-card px-6 py-8 shadow-[0_4px_15px_rgb(0_0_0/0.08)] sm:px-10 ${className}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-xl border border-gold/40" />
      <Corner position="tl" />
      <Corner position="tr" />
      <Corner position="bl" />
      <Corner position="br" />
      <div className="relative">{children}</div>
    </Tag>
  );
}

/** Маленький ромб-разделитель между заголовком и текстом. */
export function Divider() {
  return (
    <div aria-hidden="true" className="my-4 flex items-center justify-center gap-3 text-gold">
      <span className="h-px w-12 bg-current opacity-60" />
      <svg viewBox="0 0 20 12" className="h-3 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M10 11V6C10 3 7 2 6 4C5.3 5.4 6.6 6.4 7.4 5.4M10 6C10 3 13 2 14 4C14.7 5.4 13.4 6.4 12.6 5.4" />
      </svg>
      <span className="h-px w-12 bg-current opacity-60" />
    </div>
  );
}
