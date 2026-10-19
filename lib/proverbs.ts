"use client";

import { useEffect, useState } from "react";
import type { Proverb } from "./types";

/** Статический JSON, который Next собирает из data/proverbs.json (app/data/proverbs.json/route.ts). */
const PROVERBS_URL = "/data/proverbs.json";

export type IndexedProverb = Proverb & { search: string };

let cache: IndexedProverb[] | null = null;
let pending: Promise<IndexedProverb[]> | null = null;

export function normalize(value: string): string {
  return value
    .toLocaleLowerCase("kk")
    .replace(/[«»"“”.,!?;:()—–-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Загружает мақалы один раз за сессию и заранее готовит строку для поиска. */
export function loadProverbs(): Promise<IndexedProverb[]> {
  if (cache) return Promise.resolve(cache);
  pending ??= fetch(PROVERBS_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<Proverb[]>;
    })
    .then((list) => {
      cache = list.map((p) => ({
        ...p,
        search: normalize(`${p.text} ${p.explanation} ${p.translation_ru ?? ""}`),
      }));
      return cache;
    })
    .catch((err) => {
      pending = null;
      throw err;
    });
  return pending;
}

type State = { proverbs: IndexedProverb[]; loading: boolean; error: boolean };

export function useProverbs(): State {
  const [state, setState] = useState<State>(() =>
    cache ? { proverbs: cache, loading: false, error: false } : { proverbs: [], loading: true, error: false },
  );

  useEffect(() => {
    if (cache) return;
    let alive = true;
    loadProverbs()
      .then((proverbs) => alive && setState({ proverbs, loading: false, error: false }))
      .catch(() => alive && setState({ proverbs: [], loading: false, error: true }));
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

/** Темы в порядке первого появления в данных. */
export function groupByTopic(proverbs: Proverb[]): Map<string, Proverb[]> {
  const groups = new Map<string, Proverb[]>();
  for (const p of proverbs) {
    const list = groups.get(p.topic);
    if (list) list.push(p);
    else groups.set(p.topic, [p]);
  }
  return groups;
}

/** Один и тот же мақал весь день, новый каждый день. */
export function proverbOfTheDay<T>(proverbs: T[], date = new Date()): T | undefined {
  if (proverbs.length === 0) return undefined;
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return proverbs[day % proverbs.length];
}
