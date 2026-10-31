import { CONCERN_PHRASES, SLANG_MAP, URGENT_PHRASES } from './safetyPhrases';
import type { Entry, RiskLevel } from './types';

const collapseRepeats = (w: string) => w.replace(/(\p{L})\1+/gu, '$1');

// Kunci slang ikut di-collapse supaya cocok dengan token yang sudah di-collapse
// ("nggak" -> "ngak", "gaada" -> "gada").
const SLANG: Record<string, string> = Object.fromEntries(
  Object.entries(SLANG_MAP).map(([k, v]) => [collapseRepeats(k), v]),
);

/**
 * Lowercase, tanda baca/emoji -> spasi, huruf yang sama berulang >= 2 kali -> 1
 * ("matiii"/"matii" -> "mati"), lalu slang dipetakan per kata ke bentuk baku.
 * Collapse >= 2 berlaku sama untuk daftar frasa, jadi kata berhuruf kembar
 * ("aamiin" -> "amin") tetap konsisten di kedua sisi.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => {
      const c = collapseRepeats(w);
      return SLANG[c] ?? c;
    })
    .join(' ');
}

const normalizePhrases = (list: readonly string[]) => list.map((p) => ` ${normalizeText(p)} `);
const URGENT = normalizePhrases(URGENT_PHRASES);
const CONCERN = normalizePhrases(CONCERN_PHRASES);

// Idiom tidak berbahaya yang memuat "mati": dibuang sebelum pencocokan.
const BENIGN_IDIOMS = [' mati gaya ', ' mati suri ', ' mati kutu '];
// Pemicu keinginan mati; "lebih baik" dihitung dua token.
const WISH_TRIGGERS = new Set(['ingin', 'mau', 'mending', 'baik', 'kapan', 'andai']);
const NOT_DEATH_WISH_AFTER = new Set(['lampu', 'listrik', 'gaya', 'suri', 'kutu']);

function stripBenignIdioms(haystack: string): string {
  return BENIGN_IDIOMS.reduce((h, idiom) => h.split(idiom).join(' '), haystack);
}

/** Pemicu + 0-2 kata + "mati", dan kata setelah "mati" bukan idiom benda/keadaan. */
function hasDeathWishProximity(tokens: string[]): boolean {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!WISH_TRIGGERS.has(t)) continue;
    if (t === 'baik' && tokens[i - 1] !== 'lebih') continue;
    for (let j = i + 1; j <= i + 3 && j < tokens.length; j++) {
      if (tokens[j] === 'mati' && !NOT_DEATH_WISH_AFTER.has(tokens[j + 1] ?? '')) return true;
    }
  }
  return false;
}

export function checkLocalSafety(text: string | null): RiskLevel {
  if (!text) return 'none';
  const haystack = stripBenignIdioms(` ${normalizeText(text)} `);
  if (URGENT.some((p) => haystack.includes(p))) return 'urgent';
  if (hasDeathWishProximity(haystack.split(' ').filter(Boolean))) return 'urgent';
  if (CONCERN.some((p) => haystack.includes(p))) return 'concern';
  return 'none';
}

const RANK: Record<RiskLevel, number> = { none: 0, concern: 1, urgent: 2 };
export function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RANK[a] >= RANK[b] ? a : b;
}

export const WORSENING_RULE = { window: 7, minLowest: 5, withinDays: 7, cooldownHours: 72 } as const;

const HOUR_MS = 3_600_000;

/**
 * recent: catatan terbaru lebih dulu (DESC). Hanya catatan dalam 7 hari terakhir
 * yang dihitung; ambil sampai 7 terbaru dari itu. lastPromptAt yang tidak bisa
 * di-parse diperlakukan sebagai belum pernah ada prompt.
 */
export function isWorsening(recent: Entry[], now: Date, lastPromptAt: string | null): boolean {
  const { window, minLowest, withinDays, cooldownHours } = WORSENING_RULE;
  const cutoff = now.getTime() - withinDays * 24 * HOUR_MS;
  const inWindow = recent
    .filter((e) => new Date(e.createdAt).getTime() >= cutoff)
    .slice(0, window);
  if (inWindow.filter((e) => e.mood === 1).length < minLowest) return false;
  const prompted = lastPromptAt ? new Date(lastPromptAt).getTime() : NaN;
  if (!Number.isNaN(prompted) && now.getTime() - prompted < cooldownHours * HOUR_MS) return false;
  return true;
}
