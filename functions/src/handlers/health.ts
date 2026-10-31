import type { HandlerResult } from '../router.js';

export function handleHealth(): HandlerResult {
  return { status: 200, body: { valid: true } };
}
