"use client";

import { useSyncExternalStore } from "react";

/*
  Общий счётчик «сайт сейчас что-то сохраняет/удаляет». Пока он больше нуля,
  BusyIndicator показывает полосу сверху и плашку «Күте тұрыңыз...».
*/
let count = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Оборачивает действие: индикатор виден, пока промис не завершится. */
export async function track<T>(work: Promise<T> | (() => Promise<T>)): Promise<T> {
  count++;
  emit();
  try {
    return await (typeof work === "function" ? work() : work);
  } finally {
    count--;
    emit();
  }
}

export function useBusy() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => count > 0,
    () => false,
  );
}
