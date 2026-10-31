import { useCallback } from 'react';

import { getInviteCode } from '@/ai/inviteStore';
import { getSettings } from '@/db/settingsRepo';
import { useDb } from '@/db/useDbQuery';

/**
 * Mengembalikan fungsi yang memeriksa izin AI. Pengaturan dan kode undangan dibaca ulang
 * setiap kali dipanggil, jadi mematikan AI langsung berlaku untuk request berikutnya.
 */
export function useAiAllowed(): () => Promise<boolean> {
  const db = useDb();
  return useCallback(async () => {
    const settings = await getSettings(db);
    if (!settings.aiEnabled || settings.aiConsentAt === null) return false;
    return (await getInviteCode()) !== null;
  }, [db]);
}
