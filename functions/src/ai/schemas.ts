// JSON Schemas for Gemini structured output (responseJsonSchema).
// Server-side zod validation + guardrails still run after this; the model is not trusted.

const CONTEXT_IDS = ['akademik', 'interpersonal', 'internal', 'finansial', 'media', 'tak_terduga'];

export const ANALYZE_RESPONSE_SCHEMA: object = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'object',
      properties: {
        contexts: { type: 'array', items: { type: 'string', enum: CONTEXT_IDS } },
        experiences: { type: 'array', items: { type: 'string' } },
        copings: { type: 'array', items: { type: 'string' } },
      },
      required: ['contexts', 'experiences', 'copings'],
    },
    riskLevel: { type: 'string', enum: ['none', 'concern', 'urgent'] },
  },
  required: ['suggestions', 'riskLevel'],
};

export const INSIGHT_RESPONSE_SCHEMA: object = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    patternTexts: { type: 'object', additionalProperties: { type: 'string' } },
    questions: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
  },
  required: ['text', 'patternTexts', 'questions'],
};
