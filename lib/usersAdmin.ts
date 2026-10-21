"use client";

import { getAuth, signOut } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs, limit, query, setDoc, where, writeBatch } from "firebase/firestore";
import { auth, db, secondaryApp } from "./firebase";
import type { UserProfile } from "./types";
import { register, type AuthResult } from "./user";

export type UserRow = UserProfile & { id: string; isAdmin: boolean };

/** Все пользователи (до 1000) с отметкой «админ». */
export async function listUsers(): Promise<UserRow[]> {
  const [users, admins] = await Promise.all([
    getDocs(query(collection(db(), "users"), limit(1000))),
    getDocs(collection(db(), "admins")),
  ]);
  const adminIds = new Set(admins.docs.map((d) => d.id));
  return users.docs
    .map((d) => {
      const p = d.data() as Partial<UserProfile>;
      return {
        id: d.id,
        username: p.username ?? "—",
        points: p.points ?? 0,
        bonus: p.bonus ?? 0,
        createdAt: p.createdAt ?? "",
        isAdmin: adminIds.has(d.id),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function setAdmin(uid: string, value: boolean) {
  const ref = doc(db(), "admins", uid);
  if (value) await setDoc(ref, { addedAt: new Date().toISOString(), by: auth().currentUser?.uid ?? "" });
  else await deleteDoc(ref);
}

/** Создаёт аккаунт ученика: email + пароль + имя. Админ остаётся в своём аккаунте. */
export async function createUser(input: { username: string; email: string; password: string }): Promise<AuthResult> {
  const app = secondaryApp();
  try {
    return await register({ ...input, confirmPassword: input.password }, app);
  } finally {
    await signOut(getAuth(app)).catch(() => {});
  }
}

/**
 * Удаляет пользователя. Аккаунт входа (Firebase Auth) удаляет сервер /api/admin/delete-user,
 * если на хостинге задан FIREBASE_SERVICE_ACCOUNT. Без него удаляются только данные в Firestore.
 */
export async function deleteUserEverywhere(uid: string, username: string): Promise<{ authDeleted: boolean }> {
  const token = await auth().currentUser?.getIdToken();
  const res = await fetch("/api/admin/delete-user", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ uid }),
  }).catch(() => null);
  if (res?.ok) return { authDeleted: true };
  // 501 — на сервере нет ключа, 404/сеть — нет сервера: удаляем данные сами
  if (res && res.status !== 501 && res.status !== 404) throw new Error(await res.text());

  const results = await getDocs(query(collection(db(), "results"), where("uid", "==", uid)));
  const batch = writeBatch(db());
  results.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db(), "users", uid));
  batch.delete(doc(db(), "usernames", username.toLowerCase()));
  batch.delete(doc(db(), "admins", uid));
  await batch.commit();
  return { authDeleted: false };
}
