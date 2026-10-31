import { useCallback, useMemo } from 'react';
import { AppState } from 'react-native';

import { defaultAiClient } from '@/ai/client';
import { useDb } from '@/db/useDbQuery';
import type { Entry } from '@/domain/types';
import { useAiAllowed } from '@/features/app/useAiAllowed';
import { useSafety } from '@/features/safety/SafetyProvider';

import { runPostSave } from './postSave';

/**
 * Safety lokal + AI setelah catatan disimpan. Tidak pernah ditunggu: catatan sudah tersimpan, jadi
 * langkah lanjutan yang lambat atau gagal (termasuk error DB di langkah lokal) tidak menghalangi layar.
 */
export function usePostSave(): (entry: Entry) => void {
  const db = useDb();
  const { show } = useSafety();
  const aiAllowed = useAiAllowed();
  const ai = useMemo(() => defaultAiClient(), []);
  return useCallback(
    (entry: Entry) => {
      runPostSave(entry, {
        db,
        ai,
        aiAllowed,
        showSupport: show,
        isAppActive: () => AppState.currentState === 'active',
        now: () => new Date(),
      }).catch(() => {
        // Sengaja diabaikan; lihat komentar di atas.
      });
    },
    [db, ai, aiAllowed, show],
  );
}
