"use client";

import { useBusy } from "@/lib/busy";
import { Spinner } from "./ui";

/** Полоса сверху и плашка внизу, пока идёт сохранение или удаление. Появляются с задержкой (.busy-delay), чтобы короткие действия не мигали. */
export function BusyIndicator() {
  if (!useBusy()) return null;
  return (
    <div className="busy-delay">
      <div aria-hidden="true" className="busy-bar fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-gold/20">
        <div className="h-full w-1/3 rounded-full bg-gold" />
      </div>
      <div
        role="status"
        className="fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm font-medium shadow-lg"
      >
        <Spinner className="h-4 w-4 text-primary dark:text-gold" />
        Күте тұрыңыз...
      </div>
    </div>
  );
}
