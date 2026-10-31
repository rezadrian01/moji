/** @jest-environment node */
import * as Sharing from 'expo-sharing';

import { setInviteCode } from '@/ai/inviteStore';
import type { Db } from '@/db/db';
import { createEntry } from '@/db/entriesRepo';
import { setFeedback } from '@/db/feedbackRepo';
import { saveInsight } from '@/db/insightsRepo';
import { updateSettings } from '@/db/settingsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';

import { buildExport, shareExport } from './exportData';

const written: { uri: string; content: string }[] = [];
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    create() {}
    write(content: string) {
      written.push({ uri: this.uri, content });
    }
  }
  return { File, Paths: { cache: { uri: 'file:///cache' } } };
});

const NOW = new Date('2026-10-31T09:00:00+07:00');
let db: Db;

beforeEach(async () => {
  db = await createTestDb();
  written.length = 0;
  jest.clearAllMocks();
});

async function seed() {
  await createEntry(db, { mood: 2, note: 'catatan pertama' }, NOW);
  await createEntry(db, { mood: 4, note: 'catatan kedua' }, NOW);
  const insight = await saveInsight(
    db,
    {
      kind: 'on_demand',
      weekKey: null,
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      summary: {
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        entryCount: 2,
        moodDistribution: { 1: 0, 2: 1, 3: 0, 4: 1, 5: 0 },
        patterns: [],
        enoughData: false,
      },
      text: 'ringkasan',
      patternTexts: {},
      questions: [],
      source: 'local',
      reflection: null,
    },
    NOW,
  );
  await setFeedback(db, insight.id, 'low_mood_context:akademik', 'sesuai', NOW);
  await updateSettings(db, { reminderTime: '20:00' });
  return { insight };
}

describe('buildExport', () => {
  it('memuat semua catatan, insight, umpan balik, dan pengaturan', async () => {
    const { insight } = await seed();
    const out = await buildExport(db, NOW);
    expect(out.version).toBe(1);
    expect(out.exportedAt).toBe(NOW.toISOString());
    expect(out.entries.map((e) => e.note).sort()).toEqual(['catatan kedua', 'catatan pertama']);
    expect(out.insights).toHaveLength(1);
    expect(out.feedback).toEqual([
      { insightId: insight.id, patternKey: 'low_mood_context:akademik', value: 'sesuai' },
    ]);
    expect(out.settings.reminderTime).toBe('20:00');
  });

  it('tidak memuat kode undangan walaupun tersimpan di SecureStore', async () => {
    await seed();
    await setInviteCode('MOJI-R07-K3F9');
    const json = JSON.stringify(await buildExport(db, NOW));
    expect(json).not.toContain('MOJI-R07-K3F9');
  });

  it('tetap valid saat data kosong', async () => {
    const out = await buildExport(db, NOW);
    expect(out.entries).toEqual([]);
    expect(out.insights).toEqual([]);
    expect(out.feedback).toEqual([]);
  });
});

describe('shareExport', () => {
  it('menulis moji-export-YYYY-MM-DD.json ke cache lalu membagikannya', async () => {
    await seed();
    await shareExport(db, NOW);
    expect(written).toHaveLength(1);
    expect(written[0].uri).toBe('file:///cache/moji-export-2026-10-31.json');
    expect(JSON.parse(written[0].content).entries).toHaveLength(2);
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      'file:///cache/moji-export-2026-10-31.json',
      expect.objectContaining({ mimeType: 'application/json' }),
    );
  });
});
