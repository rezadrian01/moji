import { useCallback, useEffect, useRef, useState } from 'react';

import { getDraft, saveDraft } from '@/db/settingsRepo';
import { useDb } from '@/db/useDbQuery';
import type { NewEntry } from '@/domain/types';

export const DRAFT_DEBOUNCE_MS = 500;

type Draft = Partial<NewEntry>;

/**
 * Draft catatan yang sedang ditulis. `save` ditulis ke DB setelah jeda 500ms; draft yang masih
 * menunggu langsung ditulis saat layar ditutup, jadi aplikasi tertutup di tengah jalan tidak
 * menghilangkan apa pun. `loaded` false selama draft lama belum selesai dibaca.
 */
export function useDraft(): {
  draft: Draft | null;
  loaded: boolean;
  save(d: Draft): void;
  clear(): void;
} {
  const db = useDb();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pending = useRef<{ value: Draft; timer: ReturnType<typeof setTimeout> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDraft(db).then(
      (d) => {
        if (cancelled) return;
        setDraft(d);
        setLoaded(true);
      },
      () => {
        if (!cancelled) setLoaded(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db]);

  const flush = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    saveDraft(db, p.value).catch(() => {
      // Draft hanya jaring pengaman; gagal menulisnya tidak boleh mengganggu pengguna.
    });
  }, [db]);

  useEffect(() => flush, [flush]);

  const save = useCallback(
    (d: Draft) => {
      if (pending.current) clearTimeout(pending.current.timer);
      pending.current = { value: d, timer: setTimeout(flush, DRAFT_DEBOUNCE_MS) };
      setDraft(d);
    },
    [flush],
  );

  const clear = useCallback(() => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
    setDraft(null);
    saveDraft(db, null).catch(() => {});
  }, [db]);

  return { draft, loaded, save, clear };
}
