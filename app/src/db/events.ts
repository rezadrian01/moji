export type DataTable = 'entries' | 'insights' | 'feedback' | 'settings';

const listeners = new Set<(table: string) => void>();

export function emitDataChanged(table: DataTable): void {
  for (const cb of [...listeners]) cb(table);
}

export function onDataChanged(cb: (table: string) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
