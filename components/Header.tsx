"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logout, useCurrentUser } from "@/lib/user";
import { ConfirmDialog } from "./ConfirmDialog";
import { OrnamentBand } from "./Ornament";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/dashboard", label: "Басты бет" },
  { href: "/lessons", label: "Сабақтар" },
  { href: "/proverbs", label: "Мақалдар" },
  { href: "/balama", label: "Балама сөздер" },
  { href: "/rating", label: "Рейтинг" },
];

export function Header() {
  const user = useCurrentUser();
  const links = user?.isAdmin ? [...LINKS, { href: "/admin", label: "⚙️ Админ" }] : LINKS;
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Закрываем мобильное меню при переходе на другую страницу и по Esc
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const linkClass = (href: string) =>
    `block rounded-lg px-3 py-2 text-white transition hover:bg-primary-dark ${
      isActive(href) ? "bg-primary-dark font-semibold" : ""
    }`;

  return (
    <header className="sticky top-0 z-40 bg-primary text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-serif text-2xl font-bold">
          <span aria-hidden="true" className="text-gold">❖</span>
          MarjanSóz
        </Link>

        <nav aria-label="Негізгі мәзір" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)} aria-current={isActive(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/profile"
            className={`hidden rounded-lg border border-white/30 px-3 py-2 transition hover:bg-white/10 sm:block ${
              isActive("/profile") ? "bg-primary-dark" : "bg-white/10"
            }`}
            aria-current={isActive("/profile") ? "page" : undefined}
          >
            <span aria-hidden="true">👤 </span>Профиль
          </Link>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="hidden rounded-lg border border-white px-3 py-2 transition hover:bg-white/10 lg:block"
          >
            Шығу
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Мәзірді жабу" : "Мәзірді ашу"}
            className="grid h-10 w-10 place-items-center rounded-lg text-2xl transition hover:bg-white/10 lg:hidden"
          >
            <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" aria-label="Мобильді мәзір" className="border-t border-white/20 bg-primary px-4 pb-4 pt-2 lg:hidden">
          <ul className="flex flex-col gap-1">
            {[...links, { href: "/profile", label: "👤 Профиль" }].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass(l.href)} aria-current={isActive(l.href) ? "page" : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="mt-2 w-full rounded-lg border border-white px-3 py-2 text-left transition hover:bg-white/10"
              >
                Шығу
              </button>
            </li>
          </ul>
        </nav>
      )}

      <OrnamentBand className="bg-gold" />

      <ConfirmDialog
        open={confirmOpen}
        title="Шынымен аккаунттан шығасыз ба?"
        confirmLabel="Шығу"
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await logout();
          router.replace("/login");
        }}
      />
    </header>
  );
}

/** Пока на динамических страницах не известен адрес: та же шапка без меню. */
export function HeaderFallback() {
  return (
    <header className="sticky top-0 z-40 bg-primary text-white shadow-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
        <span className="flex items-center gap-2 font-serif text-2xl font-bold">
          <span aria-hidden="true" className="text-gold">❖</span>
          MarjanSóz
        </span>
      </div>
      <OrnamentBand className="bg-gold" />
    </header>
  );
}
