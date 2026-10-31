import type { createAiClient } from '../../ai/client';
import type { AnalyzeEntryRequest, TagOption } from '../../ai/contract';
import { toLocalIso } from '../../db/db';
import type { Db } from '../../db/db';
import { getEntry, listEntries, updateEntry } from '../../db/entriesRepo';
import { addPendingSafety } from '../../db/pendingSafetyRepo';
import { getSettings, updateSettings } from '../../db/settingsRepo';
import { checkLocalSafety, isWorsening, maxRisk, WORSENING_RULE } from '../../domain/safety';
import { CONTEXTS, COPINGS, EXPERIENCES } from '../../domain/taxonomy';
import { noteInviteProblem } from '../ai/inviteProblem';
import type { Entry, RiskLevel, Suggestions } from '../../domain/types';

export interface PostSaveDeps {
  db: Db;
  ai: Pick<ReturnType<typeof createAiClient>, 'analyzeEntry'>;
  /** Dibaca ulang saat respons AI datang. */
  aiAllowed: () => Promise<boolean>;
  /** AppState.currentState === 'active' */
  isAppActive: () => boolean;
  showSupport: (level: Exclude<RiskLevel, 'none'>, entryId: string) => void;
  now: () => Date;
}

const OPTIONS: AnalyzeEntryRequest['options'] = {
  contexts: CONTEXTS.map((c) => ({ id: c.id, label: c.label })),
  experiences: EXPERIENCES.flatMap((d) => d.tags.map((t) => ({ id: t.id, label: t.label }))),
  copings: COPINGS.map((c) => ({ id: c.id, label: c.label })),
};

const RANK: Record<RiskLevel, number> = { none: 0, concern: 1, urgent: 2 };
const isHigher = (level: RiskLevel, than: RiskLevel) => RANK[level] > RANK[than];

const DAY_MS = 24 * 3_600_000;

/** Sama dengan batas `text` di functions/src/contract.ts (unit UTF-16). */
export const MAX_ANALYZE_TEXT_LENGTH = 20000;

/** Bagian akhir teks dipertahankan; surrogate yang terpotong separuh di awal dibuang. */
function keepEnd(text: string): string {
  if (text.length <= MAX_ANALYZE_TEXT_LENGTH) return text;
  const cut = text.slice(-MAX_ANALYZE_TEXT_LENGTH);
  return /^[\uDC00-\uDFFF]/.test(cut) ? cut.slice(1) : cut;
}

/** null jika catatan tidak punya teks (kosong/whitespace): AI tidak dipanggil. */
export function buildAnalyzeRequest(entry: Entry): AnalyzeEntryRequest | null {
  const text = entry.note?.trim();
  if (!text) return null;
  return { text: keepEnd(text), mood: entry.mood, options: OPTIONS };
}

/**
 * Safety lokal + pola memburuk dijalankan dan di-await di sini (sheet muncul seketika).
 * Analisis AI dikembalikan sebagai `aiTask` yang tidak boleh di-await oleh layar simpan;
 * `aiTask` tidak pernah reject.
 */
export async function runPostSave(
  entry: Entry,
  deps: PostSaveDeps,
): Promise<{ localLevel: RiskLevel; aiTask: Promise<void> | null }> {
  const { db } = deps;
  const now = deps.now();

  const textLevel = checkLocalSafety(entry.note);
  const windowStart = new Date(now.getTime() - WORSENING_RULE.withinDays * DAY_MS);
  const recent = await listEntries(db, { from: toLocalIso(windowStart) });
  const settings = await getSettings(db);
  const worsening = isWorsening(recent, now, settings.lastWorseningPromptAt);
  const localLevel = maxRisk(textLevel, worsening ? 'concern' : 'none');

  const stored = await getEntry(db, entry.id);
  const shown = stored?.safetyShownLevel ?? entry.safetyShownLevel;
  if (localLevel !== 'none' && isHigher(localLevel, shown)) {
    deps.showSupport(localLevel, entry.id);
    await updateEntry(db, entry.id, { safetyShownLevel: localLevel }, now);
    if (worsening) await updateSettings(db, { lastWorseningPromptAt: toLocalIso(now) });
  }

  const request = buildAnalyzeRequest(entry);
  const aiTask = request && (await deps.aiAllowed()) ? runAi(entry, request, deps) : null;
  return { localLevel, aiTask };
}

async function runAi(entry: Entry, request: AnalyzeEntryRequest, deps: PostSaveDeps): Promise<void> {
  const { db } = deps;
  try {
    const result = await deps.ai.analyzeEntry(request);
    if (!result.ok) {
      await noteInviteProblem(db, result.reason);
      return;
    }

    const fresh = await getEntry(db, entry.id);
    if (!fresh) return;
    if (!(await deps.aiAllowed())) return;

    let current: Entry | null = fresh;
    // Saran untuk teks lama tidak ditempel ke catatan yang sudah diedit; risikonya tetap dihitung.
    if (fresh.note === entry.note) {
      current = await updateEntry(
        db,
        entry.id,
        { pendingSuggestions: newSuggestions(result.data.suggestions, fresh) },
        deps.now(),
      );
      if (!current) return;
    }

    const risk = result.data.riskLevel;
    if (risk === 'none' || !isHigher(risk, current.safetyShownLevel)) return;
    if (deps.isAppActive()) {
      deps.showSupport(risk, entry.id);
      await updateEntry(db, entry.id, { safetyShownLevel: risk }, deps.now());
    } else {
      await addPendingSafety(db, entry.id, risk);
      // Catatan bisa terhapus di antara pengecekan dan insert: jangan tinggalkan penanda yatim.
      if (!(await getEntry(db, entry.id))) {
        await db.runAsync('DELETE FROM pending_safety WHERE entry_id = ?', [entry.id]);
      }
    }
  } catch {
    // Kegagalan AI (termasuk throw dari SecureStore) diabaikan tanpa pesan.
  }
}

/** Hanya id yang ditawarkan dan belum ada di catatan; null kalau tidak ada yang tersisa. */
function newSuggestions(s: Suggestions, entry: Entry): Suggestions | null {
  const pick = <T extends string>(ids: T[], offered: TagOption[], existing: string[]): T[] => {
    const allowed = new Set(offered.map((o) => o.id));
    const taken = new Set(existing);
    return [...new Set(ids)].filter((id) => allowed.has(id) && !taken.has(id));
  };
  const next: Suggestions = {
    contexts: pick(s.contexts, OPTIONS.contexts, entry.contexts.map((c) => c.category)),
    experiences: pick(s.experiences, OPTIONS.experiences, entry.experiences.map((e) => e.tag)),
    copings: pick(s.copings, OPTIONS.copings, entry.copings.map((c) => c.tag)),
  };
  const empty = !next.contexts.length && !next.experiences.length && !next.copings.length;
  return empty ? null : next;
}
