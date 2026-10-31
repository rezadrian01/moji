import { setInviteCode } from '@/ai/inviteStore';
import type { Db } from '@/db/db';
import { wipeAll } from '@/db/settingsRepo';
import { cancelAllReminders } from '@/features/reminders/scheduler';

/**
 * Hapus semua data lokal, kode undangan, dan pengingat terjadwal.
 * Langkah yang idempoten dijalankan dulu dan kegagalannya ditoleransi; wipe terakhir,
 * supaya kegagalan tidak meninggalkan aplikasi setengah ter-reset.
 */
export async function resetApp(db: Db): Promise<void> {
  await Promise.allSettled([cancelAllReminders(), setInviteCode(null)]);
  await wipeAll(db);
}
