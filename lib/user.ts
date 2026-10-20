"use client";

import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as AuthUser,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState, useSyncExternalStore } from "react";
import { auth, db } from "./firebase";
import type { User, UserProfile } from "./types";

/** Очки всегда = выученные мақалы × 10. Это же проверяют правила Firestore. */
export const POINTS_PER_PROVERB = 10;

// undefined — ещё не известно, null — не вошёл
let current: User | null | undefined = undefined;
const listeners = new Set<() => void>();
let started = false;

function set(next: User | null) {
  current = next;
  listeners.forEach((l) => l());
}

function start() {
  if (started) return;
  started = true;
  let stopProfile: (() => void) | null = null;

  onAuthStateChanged(auth(), async (authUser) => {
    stopProfile?.();
    stopProfile = null;
    if (!authUser) return set(null);

    const isAdmin = await getDoc(doc(db(), "admins", authUser.uid))
      .then((s) => s.exists())
      .catch(() => false);

    stopProfile = onSnapshot(
      doc(db(), "users", authUser.uid),
      (snap) => {
        // Профиля нет только если регистрация оборвалась на середине
        if (!snap.exists()) return set(null);
        set(toUser(authUser, snap.data() as UserProfile, isAdmin));
      },
      () => set(null),
    );
  });
}

function toUser(authUser: AuthUser, p: UserProfile, isAdmin: boolean): User {
  return {
    id: authUser.uid,
    email: authUser.email ?? "",
    isAdmin,
    username: p.username,
    points: p.points ?? 0,
    completedProverbs: p.completedProverbs ?? [],
    completedTopics: p.completedTopics ?? [],
    createdAt: p.createdAt ?? "",
  };
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** undefined — загрузка, null — не вошёл, User — вошёл. Один аккаунт на всех устройствах. */
export function useCurrentUser(): User | null | undefined {
  return useSyncExternalStore(subscribe, () => current, () => undefined);
}

export type AuthResult = { ok: true } | { ok: false; error: string };

function authError(e: unknown): string {
  const code = e instanceof FirebaseError ? e.code : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Қате электронды пошта немесе құпия сөз";
    case "auth/email-already-in-use":
      return "Бұл электронды пошта бос емес";
    case "auth/invalid-email":
      return "Электронды пошта дұрыс емес";
    case "auth/weak-password":
      return "Құпия сөз кемінде 6 таңбадан тұруы керек";
    case "auth/too-many-requests":
      return "Тым көп әрекет. Біраз уақыттан кейін қайталаңыз";
    case "auth/network-request-failed":
      return "Интернет байланысын тексеріңіз";
    default:
      return "Қате орын алды. Қайталап көріңіз";
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  if (!email || !password) return { ok: false, error: "Барлық өрістерді толтырыңыз" };
  try {
    await signInWithEmailAndPassword(auth(), email, password);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: authError(e) };
  }
}

// toLowerCase() совпадает с .lower() в правилах Firestore
const usernameKey = (name: string) => name.toLowerCase();

export async function register(input: {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthResult> {
  const { username, email, password, confirmPassword } = input;
  if (!username || !email || !password || !confirmPassword) {
    return { ok: false, error: "Барлық өрістерді толтырыңыз" };
  }
  if (username.length > 30 || username.includes("/")) {
    return { ok: false, error: "Пайдаланушы аты 30 таңбадан аспауы керек, «/» белгісіз" };
  }
  if (password !== confirmPassword) return { ok: false, error: "Құпия сөздер сәйкес емес" };
  if (password.length < 6) return { ok: false, error: "Құпия сөз кемінде 6 таңбадан тұруы керек" };

  try {
    const taken = await getDoc(doc(db(), "usernames", usernameKey(username)));
    if (taken.exists()) return { ok: false, error: "Бұл пайдаланушы аты бос емес" };
  } catch {
    return { ok: false, error: "Интернет байланысын тексеріңіз" };
  }

  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth(), email, password);
  } catch (e) {
    return { ok: false, error: authError(e) };
  }

  const uid = cred.user.uid;
  try {
    await updateProfile(cred.user, { displayName: username });
    // Имя и профиль создаются вместе: имя не может достаться двоим
    await runTransaction(db(), async (tx) => {
      const nameRef = doc(db(), "usernames", usernameKey(username));
      if ((await tx.get(nameRef)).exists()) throw new Error("taken");
      tx.set(nameRef, { uid });
      const profile: UserProfile = {
        username,
        points: 0,
        completedProverbs: [],
        completedTopics: [],
        createdAt: new Date().toISOString(),
      };
      tx.set(doc(db(), "users", uid), profile);
    });
    return { ok: true };
  } catch (e) {
    await deleteUser(cred.user).catch(() => {});
    if (e instanceof Error && e.message === "taken") return { ok: false, error: "Бұл пайдаланушы аты бос емес" };
    return { ok: false, error: "Тіркелу кезінде қате орын алды. Қайталап көріңіз" };
  }
}

export function logout() {
  return signOut(auth());
}

async function saveProgress(user: User, completedProverbs: string[], completedTopics: string[]) {
  await updateDoc(doc(db(), "users", user.id), {
    completedProverbs,
    completedTopics,
    points: completedProverbs.length * POINTS_PER_PROVERB,
  });
}

/** Отмечает мақалы выученными. Возвращает, сколько очков добавилось. */
export async function completeProverbs(user: User, proverbIds: string[], topic: string, topicIds: string[]) {
  const done = new Set(user.completedProverbs);
  const fresh = proverbIds.filter((id) => !done.has(id));
  fresh.forEach((id) => done.add(id));
  const topics = new Set(user.completedTopics);
  if (topicIds.every((id) => done.has(id))) topics.add(topic);
  await saveProgress(user, [...done], [...topics]);
  return fresh.length * POINTS_PER_PROVERB;
}

export async function resetTopic(user: User, topic: string, topicIds: string[]) {
  const ids = new Set(topicIds);
  await saveProgress(
    user,
    user.completedProverbs.filter((id) => !ids.has(id)),
    user.completedTopics.filter((t) => t !== topic),
  );
}

export type RatingRow = { id: string; username: string; points: number };

/** Топ-50 общего рейтинга всех пользователей. */
export function useRating() {
  const [rows, setRows] = useState<RatingRow[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    getDocs(query(collection(db(), "users"), orderBy("points", "desc"), limit(50)))
      .then((snap) =>
        setRows(snap.docs.map((d) => ({ id: d.id, username: d.data().username, points: d.data().points ?? 0 }))),
      )
      .catch(() => setError(true));
  }, []);
  return { rows, error };
}

const LEVELS = [
  { level: 5, min: 500, name: "Мақал шебері" },
  { level: 4, min: 350, name: "Жетілдіруші" },
  { level: 3, min: 200, name: "Орта деңгей" },
  { level: 2, min: 100, name: "Бастаушы" },
  { level: 1, min: 0, name: "Жаңадан бастаған" },
];

export function levelFor(points: number) {
  return LEVELS.find((l) => points >= l.min) ?? LEVELS[LEVELS.length - 1];
}
