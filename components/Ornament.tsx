import type { ReactNode } from "react";

/**
 * Казахские орнаменты — каждый на своём месте:
 * сынық мүйіз — края шапки и подвала, тұмар — края тёмных панелей,
 * қошқар мүйіз — уголки карточек, шаңырақ — крупный знак в героях.
 * Все декоративные и скрыты от скринридеров.
 */
export function OrnamentBand({ kind = "synyq", className = "bg-ornament" }: { kind?: "synyq" | "tumar"; className?: string }) {
  return <div aria-hidden="true" className={`band-${kind} w-full ${className}`} />;
}

/** Шаңырақ: кольцо с крестовой решёткой күлдіреуіш и лучами-уықтами. */
export function Shanyrak({ className = "" }: { className?: string }) {
  const uyks = Array.from({ length: 32 }, (_, i) => (i * Math.PI) / 16);
  return (
    <svg aria-hidden="true" viewBox="-60 -60 120 120" className={className} fill="none" stroke="currentColor">
      <g strokeWidth="1.2" strokeLinecap="round">
        {uyks.map((a) => (
          <line
            key={a}
            x1={(Math.cos(a) * 45).toFixed(2)}
            y1={(Math.sin(a) * 45).toFixed(2)}
            x2={(Math.cos(a) * 59).toFixed(2)}
            y2={(Math.sin(a) * 59).toFixed(2)}
          />
        ))}
      </g>
      <circle r="44" strokeWidth="2" />
      <circle r="38.5" strokeWidth="1" />
      {/* Күлдіреуіш: по две пары перекрещенных планок, как в тундуке юрты */}
      <g strokeWidth="1.6">
        <path d="M-11.5-36.7V36.7M-6.5-37.9V37.9M6.5-37.9V37.9M11.5-36.7V36.7" />
        <path d="M-36.7-11.5H36.7M-37.9-6.5H37.9M-37.9 6.5H37.9M-36.7 11.5H36.7" />
      </g>
    </svg>
  );
}

const CORNER_POSITION = {
  tl: "left-2 top-2",
  br: "bottom-2 right-2 -scale-100",
} as const;

/** Угол рамки: тонкая линия, переходящая в завиток қошқар мүйіз. */
function Corner({ position }: { position: keyof typeof CORNER_POSITION }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 36 36"
      className={`pointer-events-none absolute h-8 w-8 text-gold/70 ${CORNER_POSITION[position]}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      <path d="M2 30V10C2 5.6 5.6 2 10 2H30" />
      <path d="M8 16C8 11.6 11.6 8 16 8C20 8 21 12.5 18 13.4C16 14 15 12 16.4 11.2" />
    </svg>
  );
}

/** Карточка с двумя орнаментальными уголками (по диагонали — легче, чем рамка целиком). */
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
    <Tag className={`card relative px-6 py-8 sm:px-10 ${className}`}>
      <Corner position="tl" />
      <Corner position="br" />
      <div className="relative">{children}</div>
    </Tag>
  );
}

/** Разделитель с тұмаром — треугольным оберегом — между тонкими линиями. */
export function Divider({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`my-5 flex items-center justify-center gap-3 text-gold ${className}`}>
      <span className="h-px w-14 bg-current opacity-50" />
      <svg viewBox="0 0 24 14" className="h-3.5 w-6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M12 1.5 19 11H5Z" />
        <path d="M12 6.2 14.4 9.5H9.6Z" fill="currentColor" stroke="none" />
        <path d="M1 11h3M20 11h3" />
      </svg>
      <span className="h-px w-14 bg-current opacity-50" />
    </div>
  );
}

/** Ромб-маркер для надписей-капителей (.kicker). */
export function Rhomb({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 10 10" className={`h-2 w-2 ${className}`} fill="currentColor">
      <path d="M5 0 10 5 5 10 0 5Z" />
    </svg>
  );
}
