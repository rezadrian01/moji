import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Db } from './db';
import { onDataChanged } from './events';

export const DbContext = createContext<Db | null>(null);

export function useDb(): Db {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb dipanggil di luar DbContext.Provider');
  return db;
}

/** Jalankan query dan muat ulang saat `deps` berubah atau salah satu tabel di `tables` berubah. */
export function useDbQuery<T>(
  query: (db: Db) => Promise<T>,
  tables: string[],
  deps: unknown[],
): { data: T | undefined; loading: boolean; error: Error | null } {
  const db = useDb();
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  });
  const tablesKey = tables.join('|');
  const [state, setState] = useState<{ data: T | undefined; loading: boolean; error: Error | null }>(
    { data: undefined, loading: true, error: null },
  );

  useEffect(() => {
    let cancelled = false;
    let seq = 0;
    const load = () => {
      const mine = ++seq;
      queryRef.current(db).then(
        (data) => {
          if (!cancelled && mine === seq) setState({ data, loading: false, error: null });
        },
        (e: unknown) => {
          if (!cancelled && mine === seq) {
            setState((s) => ({
              data: s.data,
              loading: false,
              error: e instanceof Error ? e : new Error(String(e)),
            }));
          }
        },
      );
    };
    load();
    const watched = tablesKey ? tablesKey.split('|') : [];
    const off = onDataChanged((table) => {
      if (watched.includes(table)) load();
    });
    return () => {
      cancelled = true;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, tablesKey, ...deps]);

  return state;
}
