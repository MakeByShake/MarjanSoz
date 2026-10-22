import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { AI_LIMITS, AI_MODELS } from "./config";

/*
  Провайдер ИИ (только сервер). Роуты знают только этот интерфейс,
  поэтому замена Gemini на другой API — это новая реализация AIProvider, без правки роутов.
*/

export type GenerateRequest = {
  /** Инструкции модели */
  system: string;
  /** Данные задачи (мақал, вопрос, ответ ученика) */
  prompt: string;
  maxTokens?: number;
  signal?: AbortSignal;
};

export interface AIProvider {
  readonly name: string;
  generate(req: GenerateRequest): Promise<string>;
  stream(req: GenerateRequest): AsyncIterable<string>;
}

/** Квота или лимит провайдера исчерпаны — роут покажет ответ из базы вместо ошибки. */
export class QuotaError extends Error {}

class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  private params(req: GenerateRequest) {
    return {
      model: AI_MODELS.text,
      contents: req.prompt,
      config: {
        systemInstruction: req.system,
        // Объяснения короткие: глубокое «размышление» не нужно и тратит квоту
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        maxOutputTokens: req.maxTokens ?? AI_LIMITS.maxOutputTokens,
        temperature: 0.4,
        abortSignal: req.signal,
      },
    };
  }

  async generate(req: GenerateRequest) {
    try {
      const res = await this.client.models.generateContent(this.params(req));
      return res.text ?? "";
    } catch (e) {
      throw wrap(e);
    }
  }

  async *stream(req: GenerateRequest) {
    try {
      const stream = await this.client.models.generateContentStream(this.params(req));
      for await (const chunk of stream) {
        if (chunk.text) yield chunk.text;
      }
    } catch (e) {
      throw wrap(e);
    }
  }
}

function wrap(e: unknown) {
  return e instanceof ApiError && e.status === 429 ? new QuotaError("quota") : e;
}

let cached: AIProvider | null | undefined;

/** null — ключа нет, ИИ работает в демо-режиме (ответы из базы). */
export function getProvider(): AIProvider | null {
  if (cached !== undefined) return cached;
  const key = process.env.GEMINI_API_KEY?.trim();
  cached = key ? new GeminiProvider(key) : null;
  return cached;
}
