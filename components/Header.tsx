"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logout, useCurrentUser } from "@/lib/user";
import { ConfirmDialog } from "./ConfirmDialog";
import { CloseIcon, GearIcon, LogOutIcon, MenuIcon, UserIcon } from "./Icons";
import { Logo } from "./Logo";
import { OrnamentBand } from "./Ornament";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/dashboard", label: "Басты бет" },
  { href: "/lessons", label: "Сабақтар" },
  { href: "/proverbs", label: "Мақалдар" },
  { href: "/balama", label: "Балама сөздер" },
  { href: "/rating", label: "Рейтинг" },
];

const HEADER = "sticky top-0 z-40 border-b border-line bg-header backdrop-blur-md supports-[not(backdrop-filter:blur(0))]:bg-card";

export function Header() {
  const user = useCurrentUser();
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
  const current = (href: string) => (isActive(href) ? "page" : undefined);

  // Активный пункт отмечен золотой чертой снизу, а не заливкой
  const desktopLink = (href: string) =>
    `relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-[15px] font-medium transition-colors after:absolute after:inset-x-3 after:-bottom-3 after:h-0.5 after:rounded-full after:transition-colors ${
      isActive(href) ? "text-heading after:bg-gold" : "text-muted hover:text-heading after:bg-transparent"
    }`;
  const mobileLink = (href: string) =>
    `flex items-center gap-3 rounded-xl px-3 py-3 font-medium transition-colors ${
      isActive(href) ? "bg-primary/8 text-heading dark:bg-white/6" : "text-muted hover:bg-primary/5 hover:text-heading"
    }`;

  return (
    <header className={HEADER}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center rounded-lg text-[22px]">
          <Logo wordClassName="text-primary-dark dark:text-on-panel" />
        </Link>

        <nav aria-label="Негізгі мәзір" className="hidden items-center gap-0.5 lg:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={desktopLink(l.href)} aria-current={current(l.href)}>
              {l.label}
            </Link>
          ))}
          {user?.isAdmin && (
            <Link href="/admin" className={desktopLink("/admin")} aria-current={current("/admin")}>
              <GearIcon size={16} />
              Админ
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/profile"
            aria-current={current("/profile")}
            className={`hidden items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors sm:flex ${
              isActive("/profile")
                ? "border-primary/40 bg-primary/8 text-heading dark:border-gold/40"
                : "border-line text-text hover:border-primary/40 dark:hover:border-gold/40"
            }`}
          >
            <UserIcon size={17} />
            {user?.username?.split(/\s+/)[0] || "Профиль"}
          </Link>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label="Шығу"
            title="Шығу"
            className="hidden h-10 w-10 cursor-pointer place-items-center rounded-xl text-muted transition-colors hover:bg-primary/8 hover:text-heading lg:grid dark:hover:bg-white/8"
          >
            <LogOutIcon />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Мәзірді жабу" : "Мәзірді ашу"}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-heading transition-colors hover:bg-primary/8 lg:hidden"
          >
            {menuOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" aria-label="Мобильді мәзір" className="border-t border-line px-4 pb-5 pt-3 lg:hidden">
          <ul className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={mobileLink(l.href)} aria-current={current(l.href)}>
                  {l.label}
                </Link>
              </li>
            ))}
            {user?.isAdmin && (
              <li>
                <Link href="/admin" className={mobileLink("/admin")} aria-current={current("/admin")}>
                  <GearIcon size={18} />
                  Админ
                </Link>
              </li>
            )}
            <li className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <Link href="/profile" className="btn-secondary" aria-current={current("/profile")}>
                <UserIcon size={18} />
                Профиль
              </Link>
              <button type="button" onClick={() => setConfirmOpen(true)} className="btn-secondary">
                <LogOutIcon size={18} />
                Шығу
              </button>
            </li>
          </ul>
        </nav>
      )}

      <OrnamentBand className="pointer-events-none absolute inset-x-0 -bottom-[11px] bg-gold/45" />

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
    <header className={HEADER}>
      <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
        <Logo className="text-[22px]" wordClassName="text-primary-dark dark:text-on-panel" />
      </div>
      <OrnamentBand className="pointer-events-none absolute inset-x-0 -bottom-[11px] bg-gold/45" />
    </header>
  );
}
