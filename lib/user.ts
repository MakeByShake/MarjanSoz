"use client";

import { FirebaseError, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  getAuth,
  type User as AuthUser,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { useEffect, useState, useSyncExternalStore } from "react";
import { app as firebaseApp, auth, db } from "./firebase";
import type { User, UserProfile } from "./types";

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

    // Email и время входа хранятся отдельно от публичного профиля: их видят только сам ученик и админ
    setDoc(
      doc(db(), "private", authUser.uid),
      { email: authUser.email ?? "", lastLogin: new Date().toISOString() },
      { merge: true },
    ).catch(() => {});

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
    bonus: p.bonus ?? 0,
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

const errorCode = (e: unknown) => (e instanceof FirebaseError ? e.code : "");

function authError(e: unknown): string {
  const code = errorCode(e);
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
    case "auth/password-does-not-meet-requirements":
      return "Құпия сөз тым әлсіз: кемінде 6 таңба болуы керек";
    case "auth/missing-password":
      return "Құпия сөзді жазыңыз";
    case "auth/missing-email":
      return "Электронды поштаны жазыңыз";
    case "auth/user-disabled":
      return "Бұл аккаунт бұғатталған. Әкімшіге хабарласыңыз";
    case "auth/operation-not-allowed":
      return "Email арқылы тіркелу өшірулі (Firebase Authentication баптауы). Әкімшіге хабарласыңыз";
    case "auth/too-many-requests":
      return "Тым көп әрекет. Біраз уақыттан кейін қайталаңыз";
    case "auth/network-request-failed":
      return "Интернет байланысын тексеріңіз";
    default:
      return `Қате орын алды (${code || "белгісіз қате"}). Қайталап көріңіз`;
  }
}

/** Ошибка базы при регистрации — с кодом, чтобы было понятно, что случилось. */
function storeError(e: unknown): string {
  const code = errorCode(e);
  switch (code) {
    case "permission-denied":
      return "Профильді сақтауға рұқсат берілмеді (permission-denied). Әкімшіге хабарласыңыз";
    case "unavailable":
    case "deadline-exceeded":
      return "Интернет байланысын тексеріп, қайталаңыз";
    default:
      return `Тіркелу кезінде қате орын алды (${code || (e instanceof Error ? e.message : "белгісіз қате")}). Қайталап көріңіз`;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(email: string, password: string): Promise<AuthResult> {
  if (!email) return { ok: false, error: "Электронды поштаны жазыңыз" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Электронды пошта дұрыс емес (мысалы: name@gmail.com)" };
  if (!password) return { ok: false, error: "Құпия сөзді жазыңыз" };
  try {
    await signInWithEmailAndPassword(auth(), email, password);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: authError(e) };
  }
}

/**
 * Ключ имени в usernames/{key}. Должен совпадать с .lower() в правилах Firestore,
 * а он переводит в нижний регистр только латиницу: «Пернегул».lower() == «Пернегул».
 * Поэтому toLowerCase() (который трогает и кириллицу) здесь нельзя.
 */
export const usernameKey = (name: string) => name.replace(/[A-Z]+/g, (m) => m.toLowerCase());

export async function register(
  input: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  },
  // Админ создаёт аккаунт через отдельный экземпляр Firebase, чтобы самому не выйти из своего
  app: FirebaseApp = firebaseApp(),
): Promise<AuthResult> {
  const authInstance = getAuth(app);
  const store = getFirestore(app);
  const { username, email, password, confirmPassword } = input;
  if (!username) return { ok: false, error: "Пайдаланушы атын жазыңыз" };
  if (username.length > 30) return { ok: false, error: "Пайдаланушы аты 30 таңбадан аспауы керек" };
  if (username.includes("/")) return { ok: false, error: "Пайдаланушы атында «/» белгісі болмауы керек" };
  if (!email) return { ok: false, error: "Электронды поштаны жазыңыз" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Электронды пошта дұрыс емес (мысалы: name@gmail.com)" };
  if (!password) return { ok: false, error: "Құпия сөзді жазыңыз" };
  if (password.length < 6) return { ok: false, error: "Құпия сөз кемінде 6 таңбадан тұруы керек" };
  if (!confirmPassword) return { ok: false, error: "Құпия сөзді қайта жазып растаңыз" };
  if (password !== confirmPassword) return { ok: false, error: "Құпия сөздер сәйкес емес" };

  try {
    // Проверяем и полный нижний регистр: «Айгүл» и «айгүл» не должны стать двумя разными учениками
    const keys = [...new Set([usernameKey(username), username.toLowerCase()])];
    const snaps = await Promise.all(keys.map((k) => getDoc(doc(store, "usernames", k))));
    if (snaps.some((s) => s.exists())) return { ok: false, error: "Бұл пайдаланушы аты бос емес, басқа ат таңдаңыз" };
  } catch (e) {
    return { ok: false, error: storeError(e) };
  }

  let cred;
  try {
    cred = await createUserWithEmailAndPassword(authInstance, email, password);
  } catch (e) {
    return { ok: false, error: authError(e) };
  }

  const uid = cred.user.uid;
  try {
    await updateProfile(cred.user, { displayName: username });
    // Имя и профиль создаются вместе: имя не может достаться двоим
    await runTransaction(store, async (tx) => {
      const nameRef = doc(store, "usernames", usernameKey(username));
      if ((await tx.get(nameRef)).exists()) throw new Error("taken");
      tx.set(nameRef, { uid });
      const profile: UserProfile = {
        username,
        points: 0,
        bonus: 0,
        createdAt: new Date().toISOString(),
      };
      tx.set(doc(store, "users", uid), profile);
    });
    await setDoc(doc(store, "private", uid), { email, lastLogin: "" }).catch(() => {});
    return { ok: true };
  } catch (e) {
    await deleteUser(cred.user).catch(() => {});
    if (e instanceof Error && e.message === "taken") return { ok: false, error: "Бұл пайдаланушы аты бос емес, басқа ат таңдаңыз" };
    return { ok: false, error: storeError(e) };
  }
}

export function logout() {
  return signOut(auth());
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
