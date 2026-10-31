import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { defaultAiClient } from '@/ai/client';
import { useDb } from '@/db/useDbQuery';
import { useAiAllowed } from '@/features/app/useAiAllowed';

import { generateWeeklyIfDue } from './generate';

/** Saat mount dan setiap aplikasi kembali aktif, buat insight mingguan kalau sudah waktunya. */
export function useWeeklyInsightOnForeground(): void {
  const db = useDb();
  const aiAllowed = useAiAllowed();
  const running = useRef(false);

  useEffect(() => {
    const ai = defaultAiClient();
    const run = async () => {
      if (running.current) return;
      running.current = true;
      try {
        await generateWeeklyIfDue({ db, ai, aiAllowed: await aiAllowed(), now: new Date() });
      } catch {
        // Insight mingguan bersifat bonus; kegagalan tidak boleh mengganggu aplikasi.
      } finally {
        running.current = false;
      }
    };
    void run();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void run();
    });
    return () => sub.remove();
  }, [db, aiAllowed]);
}
