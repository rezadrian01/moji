import { setInviteCode } from '@/ai/inviteStore';
import type { Db } from '@/db/db';
import { wipeAll } from '@/db/settingsRepo';
import { cancelAllReminders } from '@/features/reminders/scheduler';

/** Hapus semua data lokal, kode undangan, dan pengingat terjadwal. */
export async function resetApp(db: Db): Promise<void> {
  await wipeAll(db);
  await setInviteCode(null);
  await cancelAllReminders();
}
