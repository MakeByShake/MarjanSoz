"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { User } from "./types";

// Те же ключи, что и в старом сайте, чтобы сохранённые аккаунты и прогресс не потерялись
const CURRENT_KEY = "marjansoz_currentUser";
const USERS_KEY = "marjansoz_users";

export const POINTS_PER_PROVERB = 10;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CURRENT_KEY || e.key === USERS_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function withDefaults(user: User): User {
  return {
    ...user,
    points: user.points ?? 0,
    completedProverbs: user.completedProverbs ?? [],
    completedTopics: user.completedTopics ?? [],
    achievements: user.achievements ?? [],
  };
}

export function getUsers(): User[] {
  return parse<User[]>(read(USERS_KEY), []);
}

/**
 * undefined — ещё на сервере / до гидрации, null — не вошёл, User — вошёл.
 */
export function useCurrentUser(): User | null | undefined {
  const raw = useSyncExternalStore<string | null | undefined>(
    subscribe,
    () => read(CURRENT_KEY),
    () => undefined,
  );
  return useMemo(() => {
    if (raw === undefined) return undefined;
    const user = parse<User | null>(raw, null);
    return user ? withDefaults(user) : null;
  }, [raw]);
}

export function useUsers(): User[] {
  const raw = useSyncExternalStore(subscribe, () => read(USERS_KEY), () => null);
  return useMemo(() => parse<User[]>(raw, []), [raw]);
}

/** Сохраняет текущего пользователя и синхронизирует его запись в общем списке (для рейтинга). */
export function saveCurrentUser(user: User) {
  localStorage.setItem(CURRENT_KEY, JSON.stringify(user));
  const users = getUsers();
  const index = users.findIndex((u) => u.id === user.id);
  if (index !== -1) {
    users[index] = user;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  emit();
}

export function logout() {
  localStorage.removeItem(CURRENT_KEY);
  emit();
}

export type AuthResult = { ok: true } | { ok: false; error: string };

export function login(username: string, password: string): AuthResult {
  if (!username || !password) return { ok: false, error: "Барлық өрістерді толтырыңыз" };
  const user = getUsers().find((u) => u.username === username && u.password === password);
  if (!user) return { ok: false, error: "Қате пайдаланушы аты немесе құпия сөз" };
  saveCurrentUser(withDefaults(user));
  return { ok: true };
}

export function register(input: {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}): AuthResult {
  const { username, email, password, confirmPassword } = input;
  if (!username || !email || !password || !confirmPassword) {
    return { ok: false, error: "Барлық өрістерді толтырыңыз" };
  }
  if (password !== confirmPassword) return { ok: false, error: "Құпия сөздер сәйкес емес" };
  if (password.length < 6) return { ok: false, error: "Құпия сөз кемінде 6 таңбадан тұруы керек" };

  const users = getUsers();
  if (users.some((u) => u.username === username)) return { ok: false, error: "Бұл пайдаланушы аты бос емес" };
  if (users.some((u) => u.email === email)) return { ok: false, error: "Бұл электронды пошта бос емес" };

  const user: User = {
    id: Date.now(),
    username,
    email,
    // Пароль хранится открыто в localStorage, как в старом сайте. Это демо, не настоящая защита.
    password,
    createdAt: new Date().toISOString(),
    level: 1,
    points: 0,
    completedProverbs: [],
    completedTopics: [],
    achievements: [],
  };
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  saveCurrentUser(user);
  return { ok: true };
}

/** Отмечает мақалы выученными; очки начисляются только за новые. */
export function completeProverbs(user: User, proverbIds: number[], topic: string, topicIds: number[]): User {
  const done = new Set(user.completedProverbs);
  const fresh = proverbIds.filter((id) => !done.has(id));
  fresh.forEach((id) => done.add(id));

  const completedTopics = new Set(user.completedTopics);
  if (topicIds.every((id) => done.has(id))) completedTopics.add(topic);

  const points = user.points + fresh.length * POINTS_PER_PROVERB;
  const next: User = {
    ...user,
    completedProverbs: [...done],
    completedTopics: [...completedTopics],
    points,
    level: levelFor(points).level,
  };
  saveCurrentUser(next);
  return next;
}

export function resetTopic(user: User, topic: string, topicIds: number[]) {
  const ids = new Set(topicIds);
  const removed = user.completedProverbs.filter((id) => ids.has(id)).length;
  const points = Math.max(0, user.points - removed * POINTS_PER_PROVERB);
  saveCurrentUser({
    ...user,
    completedProverbs: user.completedProverbs.filter((id) => !ids.has(id)),
    completedTopics: (user.completedTopics ?? []).filter((t) => t !== topic),
    points,
    level: levelFor(points).level,
  });
}

const LEVELS = [
  { level: 5, min: 500, name: "Мақал шебері" },
  { level: 4, min: 350, name: "Жетілдіруші" },
  { level: 3, min: 200, name: "Орта деңгей" },
  { level: 2, min: 100, name: "Бастаушы" },
  { level: 1, min: 0, name: "Жаңадан бастаған" },
];

/** Один расчёт уровня для профиля и рейтинга (раньше они считались по-разному). */
export function levelFor(points: number) {
  return LEVELS.find((l) => points >= l.min) ?? LEVELS[LEVELS.length - 1];
}
