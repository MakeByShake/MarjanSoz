import { useId } from "react";

/**
 * Белгі: сөз бұлты (сөз) → ішінде бақалшақ (қазына) → маржан (асыл сөз),
 * түбінде қошқар мүйіз өрнегі. app/icon.svg — осы белгінің көшірмесі.
 * `outlined` — бирюза фонда (шапка, подвал) бұлттың шетін ашық сызықпен белгілейді.
 */
export function LogoMark({ className = "", outlined = false }: { className?: string; outlined?: boolean }) {
  // Бір бетте бірнеше белгі болуы мүмкін — градиент id-лері қайталанбасын
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`p${id}`} cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor="#fffbe8" />
          <stop offset=".22" stopColor="#f3e3ad" />
          <stop offset=".6" stopColor="#d4af37" />
          <stop offset="1" stopColor="#8f701a" />
        </radialGradient>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a8c89" />
          <stop offset="1" stopColor="#2d4d4b" />
        </linearGradient>
      </defs>
      <path
        d="M23.2 86.9A48 48 0 1 1 39.7 99.5L14 111Z"
        fill={`url(#b${id})`}
        stroke={outlined ? "rgb(249 245 240 / 0.55)" : "none"}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <g transform="translate(0,-3)">
        <path
          d="M60 88L28.8 70A8.6 8.6 0 0 1 38.8 58.9A8.6 8.6 0 0 1 52.5 52.8A8.6 8.6 0 0 1 67.5 52.8A8.6 8.6 0 0 1 81.2 58.9A8.6 8.6 0 0 1 91.2 70Z"
          fill="#f9f5f0"
          stroke="#f9f5f0"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M56.5 83.1L40 60.5M58.8 82.1L52.9 54.7M61.2 82.1L67.1 54.7M63.5 83.1L80 60.5"
          stroke="#5a8c89"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M60 89c-5 0-11-.6-14.5 2.6c-2.4 2.3-1 5.6 1.9 5.4c2-.2 2.6-2.6 1-3.4M60 89c5 0 11-.6 14.5 2.6c2.4 2.3 1 5.6-1.9 5.4c-2-.2-2.6-2.6-1-3.4"
          fill="none"
          stroke="#d4af37"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="60" cy="40" r="12" fill={`url(#p${id})`} />
        <circle cx="55.8" cy="35.6" r="3" fill="#fff" opacity=".9" />
        <path d="M80 22l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" fill="#d4af37" />
      </g>
    </svg>
  );
}

/** Толық логотип: белгі + «MarjanSóz», мұнда «ó» — маржан, екпіні — жұлдызша. */
export function Logo({
  className = "",
  wordClassName = "",
  outlined = false,
}: {
  className?: string;
  wordClassName?: string;
  outlined?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-[0.32em] ${className}`} role="img" aria-label="MarjanSóz">
      <LogoMark outlined={outlined} className="h-[1.55em] w-auto shrink-0 overflow-visible" />
      <span aria-hidden="true" className={`font-logo font-bold leading-none tracking-tight whitespace-nowrap ${wordClassName}`}>
        Marjan
        <span className="text-gold">
          S<span className="logo-pearl" />z
        </span>
      </span>
    </span>
  );
}
