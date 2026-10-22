"use client";

import { auth } from "@/lib/firebase";
import type { AiLang } from "./config";

/*
  Браузерная часть: запрос к /api/ai/* с токеном входа и чтение ответа по мере генерации.
*/

export type AiReply = { notice: string | null };

export class AiError extends Error {}

export async function streamAI(
  path: "/api/ai/explain" | "/api/ai/mistake",
  body: Record<string, unknown> & { lang: AiLang },
  onText: (text: string) => void,
  signal: AbortSignal,
): Promise<AiReply> {
  const token = await auth().currentUser?.getIdToken();
  if (!token) throw new AiError("Маржан ұстазды пайдалану үшін аккаунтқа кіріңіз.");

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
    throw new AiError(data?.error ?? "Маржан ұстаз жауап бере алмады. Қайталап көріңіз.");
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
