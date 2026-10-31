import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Db } from '@/db/db';
import { listEntries } from '@/db/entriesRepo';
import { listInsights } from '@/db/insightsRepo';
import { getSettings } from '@/db/settingsRepo';
import type { AppSettings, Entry, FeedbackValue, Insight } from '@/domain/types';

export interface ExportData {
  version: 1;
  exportedAt: string;
  entries: Entry[];
  insights: Insight[];
  feedback: { insightId: string; patternKey: string; value: FeedbackValue }[];
  settings: Omit<AppSettings, never>;
}

/** Semua data pengguna. Kode undangan sengaja tidak disertakan. */
export async function buildExport(db: Db, now: Date): Promise<ExportData> {
  const [entries, insights, feedbackRows, settings] = await Promise.all([
    listEntries(db, {}),
    listInsights(db),
    db.getAllAsync<{ insight_id: string; pattern_key: string; value: FeedbackValue }>(
      'SELECT insight_id, pattern_key, value FROM pattern_feedback ORDER BY updated_at_ms ASC, rowid ASC',
    ),
    getSettings(db),
  ]);
  return {
    version: 1,
    exportedAt: now.toISOString(),
    entries,
    insights,
    feedback: feedbackRows.map((r) => ({
      insightId: r.insight_id,
      patternKey: r.pattern_key,
      value: r.value,
    })),
    settings,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export async function shareExport(db: Db, now: Date): Promise<void> {
  const data = await buildExport(db, now);
  const name = `moji-export-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Ekspor data MOJI',
  });
}
