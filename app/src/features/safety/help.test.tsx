import { Slot } from 'expo-router';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as Linking from 'expo-linking';

import HelpScreen from '@/app/help';
import type { Db } from '@/db/db';
import { updateSettings } from '@/db/settingsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { FORBIDDEN_WORDS, PRESSURE_WORDS } from '@/domain/insightText';
import { AppProviders } from '@/features/app/AppProviders';
import { Text } from '@/ui/Text';

/** Semua teks yang terlihat, berurutan seperti di layar. */
function allText(): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') out.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object' && 'children' in node) walk((node as { children: unknown }).children);
  };
  walk(screen.toJSON());
  return out;
}

let db: Db;
let openURL: jest.SpyInstance;
beforeEach(async () => {
  db = await createTestDb();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});
afterEach(() => {
  openURL.mockRestore();
  jest.useRealTimers();
});

async function renderHelp() {
  await renderRouter(
    {
      _layout: () => (
        <AppProviders db={db}>
          <Slot />
        </AppProviders>
      ),
      help: HelpScreen,
      'settings/contacts': () => <Text>layar-kontak</Text>,
    },
    { initialUrl: '/help' },
  );
  await screen.findByRole('header', { name: 'Butuh bantuan?' });
}

describe('/help', () => {
  it('is titled "Butuh bantuan?" and says MOJI is not an emergency service', async () => {
    await renderHelp();
    expect(
      screen.getByText(
        'Kamu nggak harus menghadapinya sendirian. Kalau mau, kamu bisa menghubungi salah satu di bawah ini.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('MOJI bukan layanan darurat.')).toBeOnTheScreen();
  });

  it('always shows the full form, with national services as call buttons', async () => {
    await renderHelp();
    await fireEvent.press(screen.getByRole('button', { name: 'Telepon SEJIWA (119 ext 8)' }));
    expect(openURL).toHaveBeenCalledWith('tel:119,8');
    expect(screen.getByRole('button', { name: 'Telepon Darurat (112)' })).toBeOnTheScreen();
    expect(screen.getByText('Nomor layanan bisa berubah sewaktu-waktu.')).toBeOnTheScreen();
  });

  it('is a page, not a sheet: no dismiss button', async () => {
    await renderHelp();
    expect(screen.queryByRole('button', { name: 'Aku baik-baik saja sekarang' })).toBeNull();
  });

  it('lets the user reach a saved trusted person in one tap', async () => {
    await updateSettings(db, { personalContact: { name: 'Rina', phone: '0812-3456-789', url: null } });
    await renderHelp();
    await fireEvent.press(await screen.findByRole('button', { name: 'WhatsApp Rina' }));
    expect(openURL).toHaveBeenCalledWith('https://wa.me/628123456789');
  });

  it('opens contact settings from the add-contact invitation', async () => {
    await renderHelp();
    await fireEvent.press(await screen.findByRole('button', { name: 'Tambahkan kontak konseling kampus' }));
    expect(await screen.findByText('layar-kontak')).toBeOnTheScreen();
    expect(screen).toHavePathname('/settings/contacts');
  });

  it('uses no clinical or pressuring words', async () => {
    await renderHelp();
    await screen.findByRole('button', { name: 'Tambahkan kontak konseling kampus' });
    const text = allText().join('\n');
    expect(text).not.toMatch(FORBIDDEN_WORDS);
    expect(text).not.toMatch(PRESSURE_WORDS);
  });
});
