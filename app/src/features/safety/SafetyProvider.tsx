import { router } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { RiskLevel } from '@/domain/types';

import { SupportSheet, type SupportLevel } from './SupportSheet';

type SafetyApi = { show(level: Exclude<RiskLevel, 'none'>, entryId: string | null): void };

const RANK: Record<SupportLevel, number> = { concern: 1, urgent: 2 };

const noopSafety: SafetyApi = { show: () => {} };
const SafetyContext = createContext<SafetyApi>(noopSafety);

type SheetState = { open: boolean; level: SupportLevel; entryId: string | null };

/** Menampilkan support sheet di atas layar apa pun. Tidak pernah memblokir catatan atau navigasi. */
export function SafetyProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<SheetState>({ open: false, level: 'concern', entryId: null });

  const show = useCallback((level: SupportLevel, entryId: string | null) => {
    setSheet((prev) =>
      // Sheet yang sedang terbuka tidak pernah diturunkan tingkatnya (urgent tetap urgent).
      prev.open && RANK[prev.level] >= RANK[level] ? prev : { open: true, level, entryId },
    );
  }, []);
  const close = useCallback(() => setSheet((prev) => ({ ...prev, open: false })), []);
  const addContact = useCallback(() => {
    close();
    router.push('/settings/contacts');
  }, [close]);

  const api = useMemo<SafetyApi>(() => ({ show }), [show]);

  return (
    <SafetyContext.Provider value={api}>
      {children}
      <SupportSheet visible={sheet.open} level={sheet.level} onClose={close} onAddContact={addContact} />
    </SafetyContext.Provider>
  );
}

export function useSafety(): SafetyApi {
  return useContext(SafetyContext);
}
