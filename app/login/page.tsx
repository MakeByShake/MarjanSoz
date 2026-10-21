import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { OrnamentBand, Shanyrak } from "@/components/Ornament";
import { AuthForms } from "./AuthForms";

export const metadata: Metadata = { title: "Кіру" };

export default function Page() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Левая панель: знак, мақал, шаңырақ — на телефоне скрыта */}
      <aside className="relative isolate hidden flex-col justify-between overflow-hidden bg-panel p-12 text-on-panel lg:flex">
        <div aria-hidden="true" className="pattern-qoshqar absolute inset-0 -z-10 bg-gold/[0.07]" />
        <Shanyrak className="pointer-events-none absolute -bottom-40 -left-40 -z-10 h-[34rem] w-[34rem] text-gold/12" />
        <Logo outlined className="text-[30px]" />
        <figure className="max-w-md">
          <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">Халық даналығы</p>
          <blockquote className="mt-4 font-serif text-4xl leading-tight font-medium italic">«Өнер алды — қызыл тіл»</blockquote>
          <figcaption className="mt-4 border-l-2 border-gold/60 pl-4 text-on-panel/75">
            Сөз — өнердің ең биігі. Мақал-мәтелдерді оқып, мағынасын түсініп, тапсырмалармен бекітіңіз.
          </figcaption>
        </figure>
        <OrnamentBand kind="tumar" className="max-w-xs bg-gold/40" />
      </aside>

      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <AuthForms />
      </main>
    </div>
  );
}
