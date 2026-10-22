"use client";

import type { Answer } from "@/lib/questions";

/*
  Недавние ошибки ученика в уроках — только в этом браузере (localStorage), чтобы Маржан апай могла их разобрать.
  В базу не пишем: правила Firestore менять не нужно. Сервер всё равно берёт вопрос и правильный ответ из урока.
*/

export type SavedMistake = { lessonId: string; questionId: string; answer?: Answer; prompt: string; at: number };

const KEY = (uid: string) => `marjansoz_mistakes_${uid}`;
const MAX = 12;

export function recentMistakes(uid: string): SavedMistake[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY(uid)) ?? "[]") as SavedMistake[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** После задания: новые ошибки — в начало, исправленные вопросы этого задания — убираем. */
export function rememberMistakes(uid: string, lessonId: string, answered: string[], wrong: Omit<SavedMistake, "lessonId" | "at">[]) {
  const done = new Set(answered.map((q) => `${lessonId}/${q}`));
  const now = Date.now();
  const list = [
    ...wrong.map((m) => ({ ...m, lessonId, at: now })),
    ...recentMistakes(uid).filter((m) => !done.has(`${m.lessonId}/${m.questionId}`)),
  ].slice(0, MAX);
  try {
    localStorage.setItem(KEY(uid), JSON.stringify(list));
  } catch {}
}

export function clearMistakes(uid: string) {
  try {
    localStorage.removeItem(KEY(uid));
  } catch {}
}
