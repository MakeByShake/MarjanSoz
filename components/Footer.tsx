import Link from "next/link";
import { Logo } from "./Logo";
import { OrnamentBand, Shanyrak } from "./Ornament";

const LINKS = [
  { href: "/lessons", label: "Сабақтар" },
  { href: "/proverbs", label: "Мақалдар кітапханасы" },
  { href: "/balama", label: "Балама сөздер" },
  { href: "/apai", label: "Маржан апай" },
  { href: "/rating", label: "Рейтинг" },
];

export function Footer() {
  return (
    <footer className="mt-auto">
      <OrnamentBand className="bg-gold/45" />
      <div className="relative overflow-hidden bg-panel text-on-panel">
        <Shanyrak className="pointer-events-none absolute -right-24 -bottom-40 h-[26rem] w-[26rem] text-gold/10" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <Logo outlined className="text-[28px]" />
            <p className="mt-3 max-w-sm text-on-panel/75">Қазақ халқының дана сөзі — мақал-мәтелдерді оқып, түсініп, есте сақтауға арналған алаң.</p>
            <figure className="mt-6 border-l-2 border-gold/60 pl-4">
              <blockquote className="font-serif text-lg italic">«Өнер алды — қызыл тіл»</blockquote>
              <figcaption className="mt-1 text-sm text-on-panel/60">Халық мақалы</figcaption>
            </figure>
          </div>
          <nav aria-label="Подвал мәзірі">
            <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">Бөлімдер</p>
            <ul className="mt-4 space-y-2.5">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-on-panel/85 underline-offset-4 transition-colors hover:text-white hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="relative border-t border-white/10">
          <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-on-panel/60 sm:px-6">© MarjanSóz · Асыл сөздің қазынасы</p>
        </div>
      </div>
    </footer>
  );
}
