import type { AiFailure } from '@/ai/client';
import type { Db } from '@/db/db';
import { getSettings, updateSettings } from '@/db/settingsRepo';
import type { AiCodeProblem } from '@/domain/types';

const PROBLEM_BY_REASON: Partial<Record<AiFailure, AiCodeProblem>> = {
  invalid_invite: 'invalid',
  revoked_invite: 'revoked',
};

/**
 * Dipanggil saat request AI dengan kode tersimpan gagal. Hanya 401/403 yang dicatat;
 * aiEnabled dan aiConsentAt sengaja tidak disentuh.
 */
export async function noteInviteProblem(db: Db, reason: AiFailure): Promise<void> {
  const problem = PROBLEM_BY_REASON[reason];
  if (!problem) return;
  if ((await getSettings(db)).aiCodeProblem === problem) return;
  await updateSettings(db, { aiCodeProblem: problem });
}

const TAIL = 'MOJI tetap jalan tanpa AI. Kamu bisa memasukkan kode baru kapan saja.';

export const INVITE_PROBLEM_TEXT: Record<AiCodeProblem, string> = {
  revoked: `Kode undanganmu sudah tidak aktif. ${TAIL}`,
  invalid: `Kode undanganmu belum cocok. ${TAIL}`,
};
