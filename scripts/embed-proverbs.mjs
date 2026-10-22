/*
  Смысловые векторы мақалов для поиска «по ситуации» (Маржан апай).
  Запуск после добавления мақалов в базу:  node --env-file=.env.local scripts/embed-proverbs.mjs
  Берёт библиотеку из Firestore (или data/proverbs.json), считает векторы Gemini и пишет data/proverb-vectors.json.
  Уже посчитанные мақалы с тем же текстом пропускает, файл сохраняется после каждой сотни.
  Бесплатный лимит — 1000 мақалов в сутки: если он кончился, запустите скрипт завтра, он продолжит.
  Мақалы без вектора сайт всё равно находит по словам.
*/
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-embedding-2";
const DIMS = 768;
const OUT = new URL("../data/proverb-vectors.json", import.meta.url);
const FIRESTORE = "https://firestore.googleapis.com/v1/projects/marjansoz/databases/(default)/documents";

const key = process.env.GEMINI_API_KEY?.trim();
if (!key) throw new Error("GEMINI_API_KEY жоқ (.env.local)");
const ai = new GoogleGenAI({ apiKey: key });

function decode(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(decode);
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, decode(x)]));
  return null;
}
async function doc(path) {
  const res = await fetch(`${FIRESTORE}/${path}`);
  if (!res.ok) return null;
  return decode({ mapValue: await res.json() });
}

async function library() {
  const meta = await doc("meta/library").catch(() => null);
  if (meta?.chunks?.length) {
    const chunks = await Promise.all(meta.chunks.map((c) => doc(`proverbChunks/${c}`)));
    const items = chunks.flatMap((c) => c?.items ?? []);
    if (items.length) return items;
  }
  console.log("Firestore қолжетімсіз — data/proverbs.json қолданылады");
  return JSON.parse(readFileSync(new URL("../data/proverbs.json", import.meta.url), "utf8"));
}

/** Текст для вектора: мақал + толкование + перевод — так находятся и казахские, и русские запросы */
const docText = (p) => [p.text, p.explanation, p.translation_ru].filter(Boolean).join("\n");
/** gemini-embedding-2: задача пишется в самом тексте (как в lib/ai/provider.ts для запросов) */
const docInput = (p) => `title: none | text: ${docText(p)}`;
const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 10);

const proverbs = (await library()).map((p) => ({ ...p, id: String(p.id) }));
const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;
const oldVec = new Map();
if (old?.model === MODEL && old.dims === DIMS) {
  const bytes = Buffer.from(old.vectors, "base64");
  old.ids.forEach((id, i) => oldVec.set(`${id}:${old.hashes[i]}`, bytes.subarray(i * DIMS, (i + 1) * DIMS)));
}

const todo = proverbs.filter((p) => !oldVec.has(`${p.id}:${hash(docText(p))}`));
console.log(`Барлығы ${proverbs.length}, жаңа/өзгерген ${todo.length}`);

const fresh = new Map();
outer: for (let i = 0; i < todo.length; i += 100) {
  const batch = todo.slice(i, i + 100);
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await ai.models.embedContent({
        model: MODEL,
        // Каждый текст — отдельный Content, иначе embedding-2 склеит их в один вектор
        contents: batch.map((p) => ({ role: "user", parts: [{ text: docInput(p) }] })),
        config: { outputDimensionality: DIMS },
      });
      res.embeddings.forEach((e, j) => fresh.set(batch[j].id, quantize(e.values)));
      break;
    } catch (e) {
      if (String(e.message).includes("PerDay")) {
        console.log("Бүгінгі тегін лимит таусылды — ертең қайта іске қосыңыз, жалғастырады.");
        break outer;
      }
      if (attempt >= 6) throw e;
      console.log(`Күту (${e.status ?? e.message})…`);
      await new Promise((r) => setTimeout(r, 20000 * (attempt + 1)));
    }
  }
  save();
  console.log(`${Math.min(i + 100, todo.length)} / ${todo.length}`);
}

/** Нормируем и сжимаем в int8: 768 байт на мақал */
function quantize(values) {
  const norm = Math.hypot(...values) || 1;
  return Buffer.from(Int8Array.from(values, (v) => Math.max(-127, Math.min(127, Math.round((v / norm) * 127 * 8)))).buffer);
}

function save() {
  const ids = [];
  const hashes = [];
  const parts = [];
  for (const p of proverbs) {
    const h = hash(docText(p));
    const vec = fresh.get(p.id) ?? oldVec.get(`${p.id}:${h}`);
    if (!vec) continue;
    ids.push(p.id);
    hashes.push(h);
    parts.push(vec);
  }
  writeFileSync(OUT, JSON.stringify({ model: MODEL, dims: DIMS, ids, hashes, vectors: Buffer.concat(parts).toString("base64") }));
  return ids.length;
}

console.log(`Жазылды: ${save()} / ${proverbs.length} вектор → data/proverb-vectors.json`);
