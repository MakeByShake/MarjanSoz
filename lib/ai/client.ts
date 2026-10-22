"use client";

import { auth } from "@/lib/firebase";
import type { AiLang } from "./config";

/*
  Браузерная часть: запрос к /api/ai/* с токеном входа и чтение ответа по мере генерации.
*/

export type AiReply = { notice: string | null };

export class AiError extends Error {}

async function idToken() {
  const token = await auth().currentUser?.getIdToken();
  if (!token) throw new AiError("Маржан апайды пайдалану үшін аккаунтқа кіріңіз.");
  return token;
}

export async function streamAI(
  path: "/api/ai/explain" | "/api/ai/mistake" | "/api/ai/chat",
  body: Record<string, unknown> & { lang: AiLang },
  onText: (text: string) => void,
  signal: AbortSignal,
): Promise<AiReply> {
  const token = await idToken();

  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (signal.aborted) throw e;
    throw new AiError("Интернет байланысын тексеріп, қайталаңыз.");
  }
  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new AiError(data?.error ?? "Маржан апай жауап бере алмады. Қайталап көріңіз.");
  }

  const notice = res.headers.get("X-AI-Notice");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onText(text);
  }
  return { notice: notice ? decodeURIComponent(notice) : null };
}

export type SituationPick = { id: string; why: string };

/** Поиск мақалов по ситуации: id из нашей библиотеки и пояснение, почему подходит. */
export async function searchSituation(query: string, lang: AiLang, signal: AbortSignal): Promise<{ items: SituationPick[]; notice: string | null }> {
  const token = await idToken();
  let res: Response;
  try {
    res = await fetch("/api/ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, lang }),
      signal,
    });
  } catch (e) {
    if (signal.aborted) throw e;
    throw new AiError("Интернет байланысын тексеріп, қайталаңыз.");
  }
  const data = (await res.json().catch(() => null)) as { items?: SituationPick[]; notice?: string | null; error?: string } | null;
  if (!res.ok || !data?.items) throw new AiError(data?.error ?? "Маржан апай жауап бере алмады. Қайталап көріңіз.");
  return { items: data.items, notice: data.notice ?? null };
}

const LANG_KEY = "marjansoz_ai_lang";

export function savedLang(): AiLang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "ru" || v === "en") return v;
  } catch {}
  return "kk";
}

export function saveLang(lang: AiLang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {}
}
