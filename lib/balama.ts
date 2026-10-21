"use client";

import { doc, getDoc, runTransaction } from "firebase/firestore";
import { useSyncExternalStore } from "react";
import seed from "@/data/balama.json";
import { db } from "./firebase";
import type { BalamaWord } from "./types";

/*
  Балама сөздер лежат одним документом meta/balama { version, items }.
  Пока админ ничего не сохранил, показываем стартовый список из data/balama.json.
*/

const ref = () => doc(db(), "meta", "balama");

export const SEED_BALAMA: BalamaWord[] = seed.map((w) => ({ ...w, id: String(w.id) }));

type State = { words: BalamaWord[]; saved: boolean; loading: boolean; error: boolean };

let state: State = { words: SEED_BALAMA, saved: false, loading: true, error: false };
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

export function loadBalama(force = false): Promise<void> {
  if (pending && !force) return pending;
  pending = getDoc(ref())
    .then((snap) => {
      const items = snap.exists() ? (snap.data().items as BalamaWord[]) : SEED_BALAMA;
      setState({ words: items, saved: snap.exists(), loading: false, error: false });
    })
    .catch(() => {
      pending = null;
      setState({ ...state, loading: false, error: true });
    });
  return pending;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  loadBalama();
  return () => listeners.delete(listener);
}

const SERVER: State = { words: SEED_BALAMA, saved: false, loading: true, error: false };

export function useBalama() {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}

export const newBalamaId = () => Math.random().toString(36).slice(2, 10);

/** Меняет весь список в транзакции (список небольшой, один документ). */
export async function editBalama(edit: (items: BalamaWord[]) => BalamaWord[]) {
  await runTransaction(db(), async (tx) => {
    const snap = await tx.get(ref());
    const items = snap.exists() ? (snap.data().items as BalamaWord[]) : SEED_BALAMA;
    const version = snap.exists() ? (snap.data().version as number) : 0;
    tx.set(ref(), { items: edit(items), version: version + 1 });
  });
  await loadBalama(true);
}

export type BalamaImportRow = { text: string; definition: string; icon: string };

export function parseBalamaImport(json: unknown): { rows: BalamaImportRow[] } | { error: string } {
  if (!Array.isArray(json)) return { error: "Файлда балама сөздер тізімі (массив) болуы керек" };
  const rows: BalamaImportRow[] = [];
  for (let i = 0; i < json.length; i++) {
    const r = json[i] as Record<string, unknown>;
    const text = typeof r?.text === "string" ? r.text.trim() : "";
    const definition = typeof r?.definition === "string" ? r.definition.trim() : "";
    if (!text || !definition) return { error: `${i + 1}-жолда text немесе definition жоқ` };
    rows.push({ text, definition, icon: typeof r.icon === "string" && r.icon.trim() ? r.icon.trim() : "🎭" });
  }
  return { rows };
}
