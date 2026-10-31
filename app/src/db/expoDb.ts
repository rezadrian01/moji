import { openDatabaseAsync } from 'expo-sqlite';
import type { Db } from './db';
import { migrate } from './migrations';

/** Buka database aplikasi (moji.db) dan jalankan migrasi. */
export async function openAppDb(): Promise<Db> {
  const raw = await openDatabaseAsync('moji.db');
  const db: Db = {
    execAsync: (sql) => raw.execAsync(sql),
    runAsync: async (sql, params) => {
      const r = await raw.runAsync(sql, (params ?? []) as never[]);
      return { changes: r.changes };
    },
    getAllAsync: <T>(sql: string, params?: unknown[]) =>
      raw.getAllAsync<T>(sql, (params ?? []) as never[]),
    getFirstAsync: <T>(sql: string, params?: unknown[]) =>
      raw.getFirstAsync<T>(sql, (params ?? []) as never[]),
    withTransactionAsync: (fn) => raw.withTransactionAsync(fn),
  };
  await migrate(db);
  return db;
}
