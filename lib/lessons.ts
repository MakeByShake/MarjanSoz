"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { db } from "./firebase";
import { emptyTask, taskMax } from "./questions";
import type { Lesson, LessonResult, User } from "./types";

/*
  lessons/{id}              весь урок одним документом (задания и вопросы внутри)
  results/{lessonId}_{uid}  лучший результат ученика по уроку
  users/{uid}.points        сумма результатов (manual ?? score) + bonus, пересчитывается после каждого сохранения
  Черновики (published = false) видит только админ.
*/

const lessonsCol = () => collection(db(), "lessons");
const resultsCol = () => collection(db(), "results");
export const resultId = (lessonId: string, uid: string) => `${lessonId}_${uid}`;

export const DEFAULT_PASS = 70;

function toLesson(id: string, data: Partial<Lesson>): Lesson {
  return {
    id,
    title: data.title ?? "",
    description: data.description ?? "",
    icon: data.icon ?? "📚",
    order: data.order ?? 0,
    published: data.published ?? false,
    passPercent: data.passPercent ?? DEFAULT_PASS,
    proverbIds: data.proverbIds ?? [],
    // Вопросы, сохранённые до появления full/hidden, получают пустые значения
    tasks: (data.tasks ?? []).map((t) => ({
      ...t,
      questions: (t.questions ?? []).map((q) => ({ ...q, full: q.full ?? "", hidden: q.hidden ?? [] })),
    })),
    updatedAt: data.updatedAt ?? "",
  };
}

type Loaded<T> = { data: T | null; error: boolean; reload: () => void };

function useLoad<T>(load: (() => Promise<T>) | null, deps: unknown[]): Loaded<T> {
  const [state, setState] = useState<{ data: T | null; error: boolean }>({ data: null, error: false });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!load) return;
    let alive = true;
    load()
      .then((data) => alive && setState({ data, error: false }))
      .catch(() => alive && setState({ data: null, error: true }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/** Уроки по порядку. includeDrafts — только для админа. */
export function useLessons(includeDrafts: boolean) {
  return useLoad(async () => {
    const q = includeDrafts ? lessonsCol() : query(lessonsCol(), where("published", "==", true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => toLesson(d.id, d.data())).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  }, [includeDrafts]);
}

/** data.lesson = null — урока нет (или это черновик, а вы не админ). */
export function useLesson(id: string) {
  return useLoad(async () => {
    try {
      const snap = await getDoc(doc(db(), "lessons", id));
      return { lesson: snap.exists() ? toLesson(snap.id, snap.data()) : null };
    } catch {
      return { lesson: null };
    }
  }, [id]);
}

export async function createLesson(order: number): Promise<string> {
  const ref = doc(lessonsCol());
  await saveLesson(toLesson(ref.id, { title: "Жаңа сабақ", order, tasks: [{ ...emptyTask(), title: "1-тапсырма" }] }));
  return ref.id;
}

export async function saveLesson(lesson: Lesson) {
  const { id, ...data } = lesson;
  await setDoc(doc(db(), "lessons", id), { ...data, updatedAt: new Date().toISOString() });
}

/** Удаляет урок и его результаты, затем пересчитывает очки затронутых учеников. */
export async function deleteLesson(id: string) {
  const snap = await getDocs(query(resultsCol(), where("lessonId", "==", id)));
  const uids = snap.docs.map((d) => d.data().uid as string);
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db());
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db(), "lessons", id));
  await Promise.all([...new Set(uids)].map((uid) => recomputePoints(uid).catch(() => {})));
}

/* ---------- Результаты ---------- */

export const effective = (r: Pick<LessonResult, "manual" | "score">) => r.manual ?? r.score;

const passMark = (max: number, percent: number) => Math.ceil((max * percent) / 100);

export function taskPassed(lesson: Lesson, taskId: string, score: number | undefined) {
  const task = lesson.tasks.find((t) => t.id === taskId);
  if (!task || score === undefined) return false;
  return score >= passMark(taskMax(task), lesson.passPercent);
}

/** Сохраняет балл за задание, если он лучше прежнего. */
export async function saveTaskScore(user: User, lesson: Lesson, taskId: string, score: number) {
  const ref = doc(db(), "results", resultId(lesson.id, user.id));
  await runTransaction(db(), async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists() ? (snap.data() as LessonResult) : null;
    const tasks: Record<string, number> = {};
    for (const t of lesson.tasks) {
      const old = prev?.tasks?.[t.id];
      const best = t.id === taskId ? Math.max(old ?? 0, score) : old;
      if (best !== undefined) tasks[t.id] = Math.min(best, taskMax(t));
    }
    const result: LessonResult = {
      uid: user.id,
      username: user.username,
      lessonId: lesson.id,
      tasks,
      score: Object.values(tasks).reduce((s, v) => s + v, 0),
      maxScore: lesson.tasks.reduce((s, t) => s + taskMax(t), 0),
      completed: lesson.tasks.length > 0 && lesson.tasks.every((t) => taskPassed(lesson, t.id, tasks[t.id])),
      manual: prev?.manual ?? null,
      updatedAt: new Date().toISOString(),
    };
    tx.set(ref, result);
  });
  await recomputePoints(user.id);
}

/** Общие очки = сумма по урокам + бонус админа. */
export async function recomputePoints(uid: string) {
  const [results, profile] = await Promise.all([
    getDocs(query(resultsCol(), where("uid", "==", uid))),
    getDoc(doc(db(), "users", uid)),
  ]);
  if (!profile.exists()) return;
  const sum = results.docs.reduce((s, d) => s + effective(d.data() as LessonResult), 0);
  await updateDoc(doc(db(), "users", uid), { points: Math.max(0, sum + (Number(profile.data().bonus) || 0)) });
}

export function useLessonResults(lessonId: string | null) {
  return useLoad(
    lessonId
      ? async () => {
          const snap = await getDocs(query(resultsCol(), where("lessonId", "==", lessonId)));
          return snap.docs.map((d) => ({ id: d.id, ...(d.data() as LessonResult) })).sort((a, b) => effective(b) - effective(a));
        }
      : null,
    [lessonId],
  );
}

export function useMyResults(uid: string | undefined) {
  return useLoad(
    uid
      ? async () => {
          const snap = await getDocs(query(resultsCol(), where("uid", "==", uid)));
          return new Map(snap.docs.map((d) => [d.data().lessonId as string, d.data() as LessonResult]));
        }
      : null,
    [uid],
  );
}

/* ---------- Ручные баллы (админ) ---------- */

/** Ставит ученику балл за урок вручную (null — вернуть заработанный). Создаёт результат, если его нет. */
export async function setManualScore(lesson: Lesson, uid: string, username: string, manual: number | null) {
  const ref = doc(db(), "results", resultId(lesson.id, uid));
  await runTransaction(db(), async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      tx.update(ref, { manual, updatedAt: new Date().toISOString() });
    } else {
      const result: LessonResult = {
        uid,
        username,
        lessonId: lesson.id,
        tasks: {},
        score: 0,
        maxScore: lesson.tasks.reduce((s, t) => s + taskMax(t), 0),
        completed: false,
        manual,
        updatedAt: new Date().toISOString(),
      };
      tx.set(ref, result);
    }
  });
  await recomputePoints(uid);
}

export async function deleteResult(lessonId: string, uid: string) {
  await deleteDoc(doc(db(), "results", resultId(lessonId, uid)));
  await recomputePoints(uid);
}

export async function setBonus(uid: string, bonus: number) {
  await updateDoc(doc(db(), "users", uid), { bonus });
  await recomputePoints(uid);
}
