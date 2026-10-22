import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { AI_LIMITS } from "./config";

/*
  Кэш готовых ответов и лимиты — в Upstash Redis (переменные KV_REST_API_* или UPSTASH_REDIS_REST_* из Vercel).
  Без Redis: на компьютере разработчика ИИ работает без кэша и лимитов, на сайте — только ответы из базы.
*/

function makeRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

const redis = makeRedis();

/** Без Redis на сайте ИИ выключен: иначе бесплатную квоту не защитить. */
export const limitsAvailable = redis !== null || process.env.NODE_ENV !== "production";

const limiters = redis && {
  user: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(AI_LIMITS.perUserDaily, "1 d"), prefix: "ai:rl:user" }),
  day: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(AI_LIMITS.globalDaily, "1 d"), prefix: "ai:rl:day" }),
  minute: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(AI_LIMITS.globalPerMinute, "1 m"), prefix: "ai:rl:min" }),
};

export type LimitResult = { ok: true } | { ok: false; reason: "user" | "day" | "minute" };

/** Списывает один запрос к ИИ. Сначала общие лимиты сайта, потом личный лимит ученика. */
export async function takeQuota(uid: string): Promise<LimitResult> {
  if (!limiters) return { ok: true };
  if (!(await limiters.minute.limit("all")).success) return { ok: false, reason: "minute" };
  if (!(await limiters.day.limit("all")).success) return { ok: false, reason: "day" };
  if (!(await limiters.user.limit(uid)).success) return { ok: false, reason: "user" };
  return { ok: true };
}

export async function cacheGet(key: string): Promise<string | null> {
  if (!redis) return null;
  try {
    return await redis.get<string>(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string) {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: AI_LIMITS.cacheTtl });
  } catch {
    // Кэш не критичен: ответ ученик уже получил
  }
}

/** Короткий отпечаток текста для ключа кэша: если мақал в базе изменят, кэш обновится сам. */
export async function fingerprint(text: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}
