import { z } from "zod";
import { AI_LANGS, PROMPT_VERSION } from "@/lib/ai/config";
import { cacheGet, cacheSet, fingerprint, limitsAvailable, takeQuota } from "@/lib/ai/guard";
import { searchPrompt, tag } from "@/lib/ai/prompts";
import { getProvider, QuotaError } from "@/lib/ai/provider";
import { jsonError, type Reason } from "@/lib/ai/respond";
import { searchProverbs } from "@/lib/ai/search";
import { bearer, verifyIdToken } from "@/lib/firebaseRest";
import { normalize } from "@/lib/normalize";

/*
  POST /api/ai/search { query, lang } + Authorization: Bearer <ID-токен>
  Ученик описывает ситуацию — Маржан апай подбирает мақалы из нашей библиотеки и объясняет, почему они подходят.
  Ответ: { items: [{ id, why }], notice }. Без ИИ — мақалы по словам, без пояснений.
*/

export const maxDuration = 60;

const Body = z.object({
  query: z.string().trim().min(3).max(300),
  lang: z.enum(AI_LANGS),
});

const Picks = z.array(z.object({ id: z.string(), why: z.string().max(400) })).max(10);

type Item = { id: string; why: string };

const NOTICES: Record<Reason, string> = {
  demo: "Маржан апай әзірге қосылмаған — мақалдар сөздер бойынша табылды.",
  user: "Бүгінгі ИИ сұрақтарың таусылды — мақалдар сөздер бойынша табылды.",
  day: "Сайттың бүгінгі ИИ лимиті таусылды — мақалдар сөздер бойынша табылды.",
  minute: "Қазір сұрақ өте көп — мақалдар сөздер бойынша табылды. Бір минуттан кейін қайталаңыз.",
  quota: "ИИ лимиті уақытша таусылды — табылған мақалдар түсіндірмесіз көрсетілді.",
  error: "Маржан апай түсіндіре алмады — табылған мақалдар түсіндірмесіз көрсетілді.",
};

const reply = (items: Item[], reason: Reason | null) =>
  Response.json({ items, notice: reason ? NOTICES[reason] : null }, { headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const token = bearer(request);
  const uid = token ? await verifyIdToken(token).catch(() => null) : null;
  if (!uid) return jsonError(401, "Маржан апайды пайдалану үшін аккаунтқа кіріңіз.");

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Жағдайды толығырақ жазыңыз (кемінде 3 әріп).");
  const { query, lang } = parsed.data;

  const cacheKey = `ai:v${PROMPT_VERSION}:search:${lang}:${await fingerprint(normalize(query))}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return reply(JSON.parse(cached) as Item[], null);

  const provider = getProvider();
  let reason: Reason | null = !provider || !limitsAvailable ? "demo" : null;
  if (!reason) {
    const quota = await takeQuota(uid).catch(() => ({ ok: true }) as const);
    if (!quota.ok) reason = quota.reason;
  }
  const live = reason ? null : provider;

  let candidates;
  try {
    candidates = await searchProverbs(query, 15, live);
  } catch {
    return jsonError(502, "Базаны оқу мүмкін болмады. Сәлден соң қайталаңыз.");
  }
  const plain = candidates.slice(0, 6).map((p) => ({ id: p.id, why: "" }));
  if (!live || candidates.length === 0) return reply(plain, reason);

  try {
    const list = candidates.map((p) => `${p.id} | ${p.text} | ${p.explanation || "—"}`).join("\n");
    const text = await live.generate({
      system: searchPrompt(lang),
      prompt: `${tag("situation", query)}\n\n${tag("candidates", list)}`,
      json: true,
      signal: request.signal,
    });
    const known = new Set(candidates.map((p) => p.id));
    const seen = new Set<string>();
    const items = Picks.parse(JSON.parse(text)).filter((x) => known.has(x.id) && !seen.has(x.id) && seen.add(x.id));
    await cacheSet(cacheKey, JSON.stringify(items));
    return reply(items, null);
  } catch (e) {
    return reply(plain, e instanceof QuotaError ? "quota" : "error");
  }
}
