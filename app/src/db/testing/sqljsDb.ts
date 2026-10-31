import initSqlJs from 'sql.js';
import type { Database, SqlValue } from 'sql.js';
import type { Db } from '../db';
import { migrate } from '../migrations';

function bind(params?: unknown[]): SqlValue[] {
  return (params ?? []).map((p) => (p === undefined ? null : p)) as SqlValue[];
}

/** Db in-memori berbasis sql.js untuk tes (hanya Node). */
export async function createTestDb(): Promise<Db> {
  const SQL = await initSqlJs();
  const raw: Database = new SQL.Database();
  const db: Db = {
    async execAsync(sql) {
      raw.exec(sql);
    },
    async runAsync(sql, params) {
      raw.run(sql, bind(params));
      return { changes: raw.getRowsModified() };
    },
    async getAllAsync<T>(sql: string, params?: unknown[]) {
      const stmt = raw.prepare(sql);
      try {
        stmt.bind(bind(params));
        const rows: T[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject() as T);
        return rows;
      } finally {
        stmt.free();
      }
    },
    async getFirstAsync<T>(sql: string, params?: unknown[]) {
      const rows = await db.getAllAsync<T>(sql, params);
      return rows[0] ?? null;
    },
    async withTransactionAsync(fn) {
      raw.exec('BEGIN');
      try {
        await fn();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
  await migrate(db);
  return db;
}
