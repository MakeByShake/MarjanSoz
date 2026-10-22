import { normalize } from "@/lib/normalize";
import type { BalamaWord, Proverb } from "@/lib/types";
import { allBalama, allProverbs } from "./data";
import type { AIProvider } from "./provider";

/*
  Поиск мақалов «по ситуации»: смысловые векторы (data/proverb-vectors.json, scripts/embed-proverbs.mjs)
  плюс обычный поиск по словам — для мақалов, добавленных после расчёта векторов, и на случай, если ИИ недоступен.
*/

type VectorFile = { model: string; dims: number; ids: string[]; vectors: string };
type Index = { dims: number; ids: string[]; vectors: Float32Array };

let index: Promise<Index | null> | null = null;

function loadIndex(): Promise<Index | null> {
  index ??= import("@/data/proverb-vectors.json")
    .then((m) => {
      const file = m.default as VectorFile;
      const bytes = Buffer.from(file.vectors, "base64");
      const raw = new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const vectors = new Float32Array(raw.length);
      // int8 → float с повторной нормировкой каждого вектора
      for (let i = 0; i < file.ids.length; i++) {
        const row = raw.subarray(i * file.dims, (i + 1) * file.dims);
        let norm = 0;
        for (const v of row) norm += v * v;
        norm = Math.sqrt(norm) || 1;
        for (let j = 0; j < file.dims; j++) vectors[i * file.dims + j] = row[j] / norm;
      }
      return file.ids.length ? { dims: file.dims, ids: file.ids, vectors } : null;
    })
    .catch(() => null);
  return index;
}

/** Основы слов запроса: казахские слова меняют окончания, поэтому сравниваем начало слова. */
function stems(text: string) {
  return [...new Set(normalize(text).split(" ").filter((w) => w.length >= 3))].map((w) => w.slice(0, Math.max(3, Math.min(w.length - 1, 6))));
}

function keywordScore(haystack: string, keys: string[]) {
  if (!keys.length) return 0;
  const words = normalize(haystack).split(" ");
  return keys.filter((k) => words.some((w) => w.startsWith(k))).length / keys.length;
}

/**
 * Мақалы, ближе всего подходящие к запросу. С провайдером — по смыслу, без него — только по словам.
 * Ошибку ИИ (квота) не пробрасываем: тогда ищем по словам.
 */
export async function searchProverbs(query: string, limit: number, provider: AIProvider | null): Promise<Proverb[]> {
  const byId = await allProverbs();
  const scores = new Map<string, number>();

  const idx = provider ? await loadIndex() : null;
  if (idx && provider) {
    try {
      const q = await provider.embedQuery(query, idx.dims);
      for (let i = 0; i < idx.ids.length; i++) {
        let dot = 0;
        const off = i * idx.dims;
        for (let j = 0; j < idx.dims; j++) dot += q[j] * idx.vectors[off + j];
        scores.set(idx.ids[i], dot);
      }
    } catch {
      scores.clear();
    }
  }

  // Слова: небольшая добавка к смыслу; для мақалов без вектора — единственный сигнал
  const keys = stems(query);
  const semantic = scores.size > 0;
  for (const p of byId.values()) {
    const kw = keywordScore(`${p.text} ${p.explanation} ${p.translation_ru}`, keys);
    if (!kw && semantic) continue;
    scores.set(p.id, (scores.get(p.id) ?? (semantic ? 0.45 : 0)) + kw * (semantic ? 0.08 : 1));
  }

  return [...scores.entries()]
    .filter(([id, s]) => s > 0 && byId.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => byId.get(id)!);
}

/** Балама сөздер, в которых встречаются слова запроса (их немного, векторы не нужны). */
export async function searchBalama(query: string, limit: number): Promise<BalamaWord[]> {
  const keys = stems(query);
  if (!keys.length) return [];
  return (await allBalama())
    .map((w) => ({ w, s: keywordScore(w.text, keys) * 2 + keywordScore(w.definition, keys) }))
    .filter((x) => x.s >= 0.5)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.w);
}
