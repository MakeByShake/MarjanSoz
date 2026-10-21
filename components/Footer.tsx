import { Logo } from "./Logo";
import { OrnamentBand } from "./Ornament";

export function Footer() {
  return (
    <footer className="mt-auto bg-primary text-white">
      <OrnamentBand className="bg-gold" />
      <div className="mx-auto max-w-6xl px-4 py-8 text-center">
        <Logo outlined className="text-3xl" />
        <p className="mt-1 text-white/90">Қазақ халқының дана сөзі</p>
      </div>
    </footer>
  );
}
