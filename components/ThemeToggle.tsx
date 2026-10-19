"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, getTheme, () => null);
  const next: Theme = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("marjansoz_theme", next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={next === "dark" ? "Қараңғы тақырыпқа ауысу" : "Жарық тақырыпқа ауысу"}
      title={next === "dark" ? "Қараңғы тақырып" : "Жарық тақырып"}
      className="grid h-10 w-10 place-items-center rounded-lg border border-white/30 text-lg text-white transition hover:bg-white/10"
    >
      <span aria-hidden="true">{theme === null ? "" : theme === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
