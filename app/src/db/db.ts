import { randomUUID } from 'expo-crypto';

/** Subset API expo-sqlite SDK 58 yang dipakai aplikasi. */
export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}

/** Seam id: satu-satunya tempat repository memanggil expo-crypto. */
export function newId(): string {
  return randomUUID();
}

/** ISO 8601 dengan offset zona waktu lokal, mis. 2026-10-30T08:00:00.000+07:00. */
export function toLocalIso(d: Date): string {
  const pad = (n: number, w = 2) => String(Math.abs(n)).padStart(w, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}` +
    `${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`
  );
}
