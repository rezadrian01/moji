import { CONCERN_PHRASES, SLANG_MAP, URGENT_PHRASES } from './safetyPhrases';
import type { Entry, RiskLevel } from './types';

/**
 * Lowercase, tanda baca/emoji -> spasi, huruf yang sama berulang >= 3 kali -> 1
 * ("matiii" -> "mati"; dua huruf kembar seperti "aamiin"/"kopi" tidak disentuh),
 * lalu slang dipetakan per kata ke bentuk baku.
 */
export function normalizeText(text: string): string {
  const cleaned = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/(\p{L})\1{2,}/gu, '$1');
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((w) => SLANG_MAP[w] ?? w)
    .join(' ');
}

const normalizePhrases = (list: readonly string[]) => list.map((p) => ` ${normalizeText(p)} `);
const URGENT = normalizePhrases(URGENT_PHRASES);
const CONCERN = normalizePhrases(CONCERN_PHRASES);

export function checkLocalSafety(text: string | null): RiskLevel {
  if (!text) return 'none';
  const haystack = ` ${normalizeText(text)} `;
  if (URGENT.some((p) => haystack.includes(p))) return 'urgent';
  if (CONCERN.some((p) => haystack.includes(p))) return 'concern';
  return 'none';
}

const RANK: Record<RiskLevel, number> = { none: 0, concern: 1, urgent: 2 };
export function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RANK[a] >= RANK[b] ? a : b;
}

export const WORSENING_RULE = { window: 7, minLowest: 5, withinDays: 7, cooldownHours: 72 } as const;

const HOUR_MS = 3_600_000;

/** recent: catatan terbaru lebih dulu (DESC). */
export function isWorsening(recent: Entry[], now: Date, lastPromptAt: string | null): boolean {
  const { window, minLowest, withinDays, cooldownHours } = WORSENING_RULE;
  const last = recent.slice(0, window);
  if (last.length < minLowest) return false;
  const cutoff = now.getTime() - withinDays * 24 * HOUR_MS;
  if (last.some((e) => new Date(e.createdAt).getTime() < cutoff)) return false;
  if (last.filter((e) => e.mood === 1).length < minLowest) return false;
  if (lastPromptAt && now.getTime() - new Date(lastPromptAt).getTime() < cooldownHours * HOUR_MS) {
    return false;
  }
  return true;
}
