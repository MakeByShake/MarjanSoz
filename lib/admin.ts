"use client";

import { collection, doc, runTransaction, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { CHUNK_SIZE, loadLibrary, normalize, type LibraryMeta } from "./proverbs";
import type { Proverb, Topic } from "./types";

/*
  Все правки админки идут транзакциями и увеличивают meta/library.version,
  чтобы браузеры пользователей перечитали мақалы. Права проверяют правила Firestore (коллекция admins).
*/

const metaRef = () => doc(db(), "meta", "library");
const chunkRef = (id: string) => doc(db(), "proverbChunks", id);
const newId = () => doc(collection(db(), "proverbChunks")).id;

const EMPTY_META: LibraryMeta = { version: 0, chunks: [], topics: [] };

export type ProverbInput = Omit<Proverb, "id">;

async function afterWrite() {
  await loadLibrary(true);
}

export async function saveTopic(topic: Topic) {
  await runTransaction(db(), async (tx) => {
    const snap = await tx.get(metaRef());
    const meta = snap.exists() ? (snap.data() as LibraryMeta) : EMPTY_META;
    const exists = meta.topics.some((t) => t.id === topic.id);
    const topics = exists ? meta.topics.map((t) => (t.id === topic.id ? topic : t)) : [...meta.topics, topic];
    tx.set(metaRef(), { ...meta, topics, version: meta.version + 1 });
  });
  await afterWrite();
}

export async function deleteTopic(id: string) {
  await runTransaction(db(), async (tx) => {
    const snap = await tx.get(metaRef());
    if (!snap.exists()) return;
    const meta = snap.data() as LibraryMeta;
    tx.set(metaRef(), { ...meta, topics: meta.topics.filter((t) => t.id !== id), version: meta.version + 1 });
  });
  await afterWrite();
}

export async function addProverb(input: ProverbInput) {
  await runTransaction(db(), async (tx) => {
    const snap = await tx.get(metaRef());
    const meta = snap.exists() ? (snap.data() as LibraryMeta) : EMPTY_META;
    const last = meta.chunks[meta.chunks.length - 1];
    const lastItems: Proverb[] = last ? ((await tx.get(chunkRef(last))).data()?.items ?? []) : [];

    const proverb: Proverb = { id: newId(), ...input };
    if (last && lastItems.length < CHUNK_SIZE) {
      tx.set(chunkRef(last), { items: [...lastItems, proverb] });
      tx.set(metaRef(), { ...meta, version: meta.version + 1 });
    } else {
      const id = newId();
      tx.set(chunkRef(id), { items: [proverb] });
      tx.set(metaRef(), { ...meta, chunks: [...meta.chunks, id], version: meta.version + 1 });
    }
  });
  await afterWrite();
}

async function editChunk(chunk: string, edit: (items: Proverb[]) => Proverb[]) {
  await runTransaction(db(), async (tx) => {
    const snap = await tx.get(metaRef());
    const meta = snap.data() as LibraryMeta;
    const items: Proverb[] = (await tx.get(chunkRef(chunk))).data()?.items ?? [];
    tx.set(chunkRef(chunk), { items: edit(items) });
    tx.set(metaRef(), { ...meta, version: meta.version + 1 });
  });
  await afterWrite();
}

export function updateProverb(chunk: string, proverb: Proverb) {
  return editChunk(chunk, (items) => items.map((p) => (p.id === proverb.id ? proverb : p)));
}

export function deleteProverb(chunk: string, id: string) {
  return editChunk(chunk, (items) => items.filter((p) => p.id !== id));
}

/**
 * Записывает весь список мақалов заново, пачками по CHUNK_SIZE.
 * Используется импортом JSON: и для «добавить», и для «заменить всё».
 */
export async function replaceAllProverbs(
  proverbs: Proverb[],
  topics: Topic[],
  oldChunks: string[],
  version: number,
  seedVersion = 0,
) {
  const chunkIds: string[] = [];
  const batch = writeBatch(db());
  for (let i = 0; i < proverbs.length; i += CHUNK_SIZE) {
    const id = newId();
    chunkIds.push(id);
    batch.set(chunkRef(id), { items: proverbs.slice(i, i + CHUNK_SIZE) });
  }
  oldChunks.forEach((id) => batch.delete(chunkRef(id)));
  const meta: LibraryMeta = { version: version + 1, chunks: chunkIds, topics, seedVersion };
  batch.set(metaRef(), meta);
  await batch.commit();
  await afterWrite();
}

export type ImportRow = Partial<Proverb> & { text: string; topic: string; explanation: string };

const textKey = (t: string) => normalize(t);

/** Проверяет файл импорта. Возвращает ошибку на казахском или нормализованные строки. */
export function parseImport(json: unknown): { rows: ImportRow[] } | { error: string } {
  if (!Array.isArray(json)) return { error: "Файлда мақалдар тізімі (массив) болуы керек" };
  const rows: ImportRow[] = [];
  for (let i = 0; i < json.length; i++) {
    const r = json[i] as Record<string, unknown>;
    const text = typeof r?.text === "string" ? r.text.trim() : "";
    const topic = typeof r?.topic === "string" ? r.topic.trim() : "";
    const explanation = typeof r?.explanation === "string" ? r.explanation.trim() : "";
    if (!text || !topic) {
      return { error: `${i + 1}-жолда text немесе topic жоқ` };
    }
    rows.push({
      id: r.id === undefined || r.id === null ? undefined : String(r.id),
      text,
      topic,
      explanation,
      translation_ru: typeof r.translation_ru === "string" ? r.translation_ru.trim() : "",
    });
  }
  return { rows };
}

/**
 * Собирает итоговый список и темы для импорта. Новые темы создаются автоматически.
 * При добавлении мақалы, которые уже есть в базе (тот же текст), пропускаются.
 */
export function prepareImport(
  rows: ImportRow[],
  existing: Proverb[],
  topics: Topic[],
  mode: "append" | "replace",
  knownTopics: Topic[] = [],
) {
  const base = mode === "append" ? existing.map(({ id, text, translation_ru, topic, explanation }) => ({ id, text, translation_ru, topic, explanation })) : [];
  const used = new Set(base.map((p) => p.id));
  const texts = new Set(base.map((p) => textKey(p.text)));
  const fresh = rows.filter((r) => {
    const k = textKey(r.text);
    if (texts.has(k)) return false;
    texts.add(k);
    return true;
  });
  const added: Proverb[] = fresh.map((r) => {
    const id = r.id && !used.has(r.id) ? r.id : newId();
    used.add(id);
    return { id, text: r.text, topic: r.topic, explanation: r.explanation, translation_ru: r.translation_ru ?? "" };
  });

  const nextTopics = [...topics];
  let order = Math.max(0, ...topics.map((t) => t.order));
  for (const p of added) {
    if (!nextTopics.some((t) => t.id === p.topic)) {
      const known = knownTopics.find((t) => t.id === p.topic);
      nextTopics.push(known ? { ...known, order: ++order } : { id: p.topic, title: p.topic, description: "Мақалдар жинағы", icon: "📜", order: ++order });
    }
  }
  return { proverbs: [...base, ...added], added: added.length, topics: nextTopics, newTopics: nextTopics.length - topics.length };
}

/**
 * Доливает в базу мақалы из data/proverbs.json: недостающие добавляет, а у уже существующих
 * заполняет пустые толкование и перевод. Правки админа не трогает. Вызывается один раз на версию.
 */
export async function syncSeed(
  seed: Proverb[],
  seedTopics: Topic[],
  current: { proverbs: Proverb[]; topics: Topic[]; chunks: string[]; version: number },
  seedVersion: number,
) {
  const byText = new Map(current.proverbs.map((p) => [textKey(p.text), p]));
  const merged: Proverb[] = current.proverbs.map(({ id, text, translation_ru, topic, explanation }) => {
    const s = seed.find((x) => x.id === id) ?? null;
    return {
      id,
      text,
      topic,
      explanation: explanation || s?.explanation || "",
      translation_ru: translation_ru || s?.translation_ru || "",
    };
  });
  const index = new Map(merged.map((p, i) => [textKey(p.text), i]));
  const used = new Set(merged.map((p) => p.id));
  let added = 0;
  for (const s of seed) {
    const k = textKey(s.text);
    const at = index.get(k);
    if (at !== undefined) {
      const p = merged[at];
      merged[at] = { ...p, explanation: p.explanation || s.explanation, translation_ru: p.translation_ru || s.translation_ru };
      continue;
    }
    if (byText.has(k)) continue;
    const id = used.has(s.id) ? newId() : s.id;
    used.add(id);
    index.set(k, merged.length);
    merged.push({ ...s, id });
    added++;
  }
  const topics = [...current.topics];
  for (const t of seedTopics) if (!topics.some((x) => x.id === t.id)) topics.push(t);
  await replaceAllProverbs(merged, topics, current.chunks, current.version, seedVersion);
  return added;
}
