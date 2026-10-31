import type { RiskLevel } from '../domain/types';
import type { Db } from './db';

type Level = Exclude<RiskLevel, 'none'>;

export async function addPendingSafety(db: Db, entryId: string, level: Level): Promise<void> {
  await db.runAsync(
    `INSERT INTO pending_safety (entry_id, level) VALUES (?, ?)
     ON CONFLICT (entry_id) DO UPDATE SET level = excluded.level`,
    [entryId, level],
  );
}

/** Ambil yang tertinggi (urgent > concern), lalu hapus semua. */
export async function takePendingSafety(db: Db): Promise<{ entryId: string; level: Level } | null> {
  let result: { entryId: string; level: Level } | null = null;
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ entry_id: string; level: Level }>(
      "SELECT entry_id, level FROM pending_safety ORDER BY (level = 'urgent') DESC, rowid ASC LIMIT 1",
    );
    if (!row) return;
    result = { entryId: row.entry_id, level: row.level };
    await db.runAsync('DELETE FROM pending_safety');
  });
  return result;
}
