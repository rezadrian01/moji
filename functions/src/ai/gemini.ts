import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import type { Config } from '../config.js';

export type GenResult<T> = { ok: true; data: T } | { ok: false; reason: 'blocked' | 'invalid' | 'error' };

export interface GeminiClient {
  generateJson<T>(req: {
    system: string;
    user: string;
    responseSchema: object;
    validate: (x: unknown) => x is T;
  }): Promise<GenResult<T>>;
}

/** Minimal slice of the @google/genai client that we use; injectable for tests. */
export interface GenAiLike {
  models: {
    generateContent(params: { model: string; contents: string; config: Record<string, unknown> }): Promise<{
      text?: string;
      promptFeedback?: { blockReason?: string };
      candidates?: { finishReason?: string }[];
    }>;
  };
}

const BLOCKING_FINISH_REASONS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'IMAGE_SAFETY']);

// Feelings text must not be blocked wholesale (spec 7.3): lenient thresholds.
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export function createVertexGeminiClient(cfg: Config, sdk?: GenAiLike): GeminiClient {
  if (!cfg.projectId.trim()) {
    throw new Error('GOOGLE_CLOUD_PROJECT (or GCLOUD_PROJECT) is required to call Vertex AI');
  }
  const ai: GenAiLike =
    sdk ??
    (new GoogleGenAI({ vertexai: true, project: cfg.projectId, location: cfg.vertexLocation }) as unknown as GenAiLike);

  return {
    async generateJson<T>(req: {
      system: string;
      user: string;
      responseSchema: object;
      validate: (x: unknown) => x is T;
    }): Promise<GenResult<T>> {
      try {
        const res = await ai.models.generateContent({
          model: cfg.model,
          contents: req.user,
          config: {
            systemInstruction: req.system,
            responseMimeType: 'application/json',
            responseJsonSchema: req.responseSchema,
            safetySettings: SAFETY_SETTINGS,
          },
        });
        if (res.promptFeedback?.blockReason) return { ok: false, reason: 'blocked' };
        const finish = res.candidates?.[0]?.finishReason;
        if (finish && BLOCKING_FINISH_REASONS.has(finish)) return { ok: false, reason: 'blocked' };
        if (!res.text) {
          // No candidate at all, or a non-STOP finish with no text (e.g. OTHER): treat as
          // blocked so the analyze path keeps a conservative riskLevel.
          const noCandidate = !res.candidates || res.candidates.length === 0;
          return { ok: false, reason: noCandidate || (finish !== undefined && finish !== 'STOP') ? 'blocked' : 'invalid' };
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(res.text);
        } catch {
          return { ok: false, reason: 'invalid' };
        }
        return req.validate(parsed) ? { ok: true, data: parsed } : { ok: false, reason: 'invalid' };
      } catch {
        // Never surface or log the error: it may echo request content.
        return { ok: false, reason: 'error' };
      }
    },
  };
}
