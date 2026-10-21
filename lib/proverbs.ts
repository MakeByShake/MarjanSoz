"use client";

import { doc, getDoc } from "firebase/firestore";
import { useSyncExternalStore } from "react";
import { db } from "./firebase";
import type { Proverb, Topic } from "./types";

/*
  Как мақалы лежат в Firestore (дёшево по лимиту чтений на бесплатном тарифе):
    meta/library        { version, chunks: string[], topics: Topic[] }
    proverbChunks/{id}  { items: Proverb[] }   до CHUNK_SIZE мақалов в документе
  Браузер хранит копию в localStorage и перечитывает пачки только при смене version.
  Обычный визит = 1 чтение (meta), а не тысячи.
*/
export const CHUNK_SIZE = 1000;
const CACHE_KEY = "marjansoz_library";

/** seedVersion — какая версия мақалов из data/proverbs.json уже залита в базу (см. lib/topics.ts). */
export type LibraryMeta = { version: number; chunks: string[]; topics: Topic[]; seedVersion?: number };
export type IndexedProverb = Proverb & { search: string; chunk: string };
export type Library = { version: number; chunks: string[]; topics: Topic[]; proverbs: IndexedProverb[]; seedVersion: number };

type State = { library: Library | null; loading: boolean; error: boolean };

let state: State = { library: null, loading: true, error: false };
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

export function normalize(value: string): string {
  return value
    .toLocaleLowerCase("kk")
    .replace(/[«»"“”.,!?;:()—–-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Cached = { version: number; topics: Topic[]; chunks: Record<string, Proverb[]> };

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch {
    return null;
  }
}

function writeCache(c: Cached) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    // Переполнение localStorage не критично: просто не будет кеша
  }
}

function build(version: number, topics: Topic[], chunks: Record<string, Proverb[]>, order: string[], seedVersion = 0): Library {
  const proverbs = order.flatMap((chunk) =>
    (chunks[chunk] ?? []).map((p) => ({
      ...p,
      chunk,
      search: normalize(`${p.text} ${p.explanation} ${p.translation_ru ?? ""}`),
    })),
  );
  return { version, chunks: order, topics: [...topics].sort((a, b) => a.order - b.order), proverbs, seedVersion };
}

async function fetchLibrary(): Promise<Library> {
  const metaSnap = await getDoc(doc(db(), "meta", "library"));
  const meta: LibraryMeta = metaSnap.exists()
    ? (metaSnap.data() as LibraryMeta)
    : { version: 0, chunks: [], topics: [] };

  const cached = readCache();
  if (cached && cached.version === meta.version) {
    return build(meta.version, meta.topics, cached.chunks, meta.chunks, meta.seedVersion);
  }

  const chunks: Record<string, Proverb[]> = {};
  await Promise.all(
    meta.chunks.map(async (id) => {
      const snap = await getDoc(doc(db(), "proverbChunks", id));
      chunks[id] = snap.exists() ? (snap.data().items as Proverb[]) : [];
    }),
  );
  writeCache({ version: meta.version, topics: meta.topics, chunks });
  return build(meta.version, meta.topics, chunks, meta.chunks, meta.seedVersion);
}

/** Загружает (или перезагружает после правок в админке) мақалы и темы. */
export function loadLibrary(force = false): Promise<void> {
  if (pending && !force) return pending;
  if (force) setState({ ...state, loading: true });
  pending = fetchLibrary()
    .then((library) => setState({ library, loading: false, error: false }))
    .catch(() => {
      pending = null;
      setState({ library: state.library, loading: false, error: true });
    });
  return pending;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  loadLibrary();
  return () => listeners.delete(listener);
}

const SERVER_STATE: State = { library: null, loading: true, error: false };

export function useLibrary() {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  return {
    proverbs: s.library?.proverbs ?? EMPTY,
    topics: s.library?.topics ?? NO_TOPICS,
    version: s.library?.version ?? 0,
    seedVersion: s.library?.seedVersion ?? 0,
    chunks: s.library?.chunks ?? NO_CHUNKS,
    loading: s.loading && !s.library,
    error: s.error && !s.library,
  };
}

const EMPTY: IndexedProverb[] = [];
const NO_TOPICS: Topic[] = [];
const NO_CHUNKS: string[] = [];

/** Мақалы по темам; порядок тем как в админке, пустые темы тоже показываются. */
export function groupByTopic<T extends Proverb>(proverbs: T[], topics: Topic[]): Map<string, T[]> {
  const groups = new Map<string, T[]>(topics.map((t) => [t.id, []]));
  for (const p of proverbs) {
    const list = groups.get(p.topic);
    if (list) list.push(p);
    else groups.set(p.topic, [p]);
  }
  return groups;
}

export function topicMeta(topics: Topic[], id: string): Topic {
  return topics.find((t) => t.id === id) ?? { id, title: id, description: "Мақалдар жинағы", icon: "📜", order: 999 };
}

/** Один и тот же мақал весь день, новый каждый день. */
export function proverbOfTheDay<T>(proverbs: T[], date = new Date()): T | undefined {
  if (proverbs.length === 0) return undefined;
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return proverbs[day % proverbs.length];
}
