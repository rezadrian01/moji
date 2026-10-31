import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { AiFailure } from '@/ai/client';
import { getInviteCode, setInviteCode } from '@/ai/inviteStore';
import { createTestDb } from '@/db/testing/sqljsDb';
import { AppProviders } from '@/features/app/AppProviders';

import { InviteCodeForm } from './InviteCodeForm';

function fakeClient(reason?: AiFailure) {
  return {
    checkInvite: jest.fn(async () =>
      reason ? { ok: false as const, reason } : { ok: true as const, data: { valid: true as const } },
    ),
  };
}

async function setup(client: ReturnType<typeof fakeClient>) {
  const onValid = jest.fn();
  const db = await createTestDb();
  await render(
    <AppProviders db={db}>
      <InviteCodeForm onValid={onValid} client={client} />
    </AppProviders>,
  );
  return onValid;
}

beforeEach(async () => {
  await setInviteCode(null);
});

describe('InviteCodeForm', () => {
  it('stores the normalized code and calls onValid when the code is ok', async () => {
    const onValid = await setup(fakeClient());
    await fireEvent.changeText(screen.getByLabelText('Kode undangan'), ' moji-r07-k3f9 ');
    await fireEvent.press(screen.getByLabelText('Cek kode'));
    await waitFor(() => expect(onValid).toHaveBeenCalledWith('MOJI-R07-K3F9'));
    expect(await getInviteCode()).toBe('MOJI-R07-K3F9');
  });

  it.each([
    ['invalid_invite', 'Kodenya belum cocok. Coba cek lagi, ya.'],
    ['revoked_invite', 'Kode ini sudah tidak aktif. Kamu tetap bisa memakai MOJI tanpa AI.'],
    ['network', 'Koneksi lagi bermasalah. Kamu bisa coba lagi nanti.'],
    ['timeout', 'Koneksi lagi bermasalah. Kamu bisa coba lagi nanti.'],
  ] as const)('shows the message for %s and stores nothing', async (reason, message) => {
    const onValid = await setup(fakeClient(reason));
    await fireEvent.changeText(screen.getByLabelText('Kode undangan'), 'ABC');
    await fireEvent.press(screen.getByLabelText('Cek kode'));
    expect(await screen.findByText(message)).toBeTruthy();
    expect(onValid).not.toHaveBeenCalled();
    expect(await getInviteCode()).toBeNull();
  });
});
