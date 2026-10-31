import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getEntry, updateEntry } from '@/db/entriesRepo';
import { takePendingSafety } from '@/db/pendingSafetyRepo';
import { useDb } from '@/db/useDbQuery';
import type { RiskLevel } from '@/domain/types';

import { useSafety } from './SafetyProvider';

const RANK: Record<RiskLevel, number> = { none: 0, concern: 1, urgent: 2 };

/**
 * Saat aplikasi dibuka atau kembali aktif: tampilkan support sheet yang tertunda
 * (hasil AI yang datang saat aplikasi di latar belakang), lalu hapus penandanya.
 */
export function usePendingSafetyOnForeground(): void {
  const db = useDb();
  const { show } = useSafety();

  useEffect(() => {
    const check = async () => {
      try {
        const pending = await takePendingSafety(db);
        if (!pending) return;
        show(pending.level, pending.entryId);
        // Catat tingkat yang sudah ditampilkan supaya edit berikutnya tidak memunculkannya lagi.
        const entry = await getEntry(db, pending.entryId);
        if (entry && RANK[pending.level] > RANK[entry.safetyShownLevel]) {
          await updateEntry(
            db,
            entry.id,
            { safetyShownLevel: pending.level, updatedAt: entry.updatedAt },
            new Date(),
          );
        }
      } catch {
        // Gagal membaca DB: coba lagi saat aplikasi aktif berikutnya, tanpa pesan.
      }
    };
    check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [db, show]);
}
