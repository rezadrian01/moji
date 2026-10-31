import { fireEvent, render, screen, within } from '@testing-library/react-native';
import * as Linking from 'expo-linking';

import type { Db } from '@/db/db';
import { updateSettings } from '@/db/settingsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { FORBIDDEN_WORDS, PRESSURE_WORDS } from '@/domain/insightText';
import type { Contact } from '@/domain/types';
import { AppProviders } from '@/features/app/AppProviders';
import { darkTheme, lightTheme } from '@/theme/tokens';

import { SupportSheet } from './SupportSheet';

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

const TITLE = 'Kedengarannya ini berat banget.';
const CALL_FAILED = 'Belum bisa membuka teleponnya. Nomornya ada di atas, ya.';
const RINA: Contact = { name: 'Rina', phone: '0812-3456-789', url: null };
const CAMPUS: Contact = { name: 'BK Kampus', phone: '0274-555123', url: 'bk.kampus.ac.id' };

let db: Db;
let openURL: jest.SpyInstance;
beforeEach(async () => {
  db = await createTestDb();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});
afterEach(() => {
  openURL.mockRestore();
});

async function renderSheet(
  level: 'concern' | 'urgent',
  handlers: { onClose?: () => void; onAddContact?: () => void } = {},
) {
  await render(
    <AppProviders db={db}>
      <SupportSheet
        visible
        level={level}
        onClose={handlers.onClose ?? (() => {})}
        onAddContact={handlers.onAddContact ?? (() => {})}
      />
    </AppProviders>,
  );
  await screen.findByText(TITLE);
}

function indexOf(text: string): number {
  const i = allText().indexOf(text);
  if (i < 0) throw new Error(`teks "${text}" tidak ada`);
  return i;
}

describe('SupportSheet', () => {
  it('opens with an empathetic title and an invitation, not a warning', async () => {
    await renderSheet('concern');
    expect(screen.getByText(TITLE)).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Kamu nggak harus menghadapinya sendirian. Kalau mau, kamu bisa menghubungi salah satu di bawah ini.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('MOJI bukan layanan darurat.')).toBeOnTheScreen();
  });

  it('shows national services as big call buttons when urgent', async () => {
    await renderSheet('urgent');
    await fireEvent.press(screen.getByRole('button', { name: 'Telepon SEJIWA (119 ext 8)' }));
    expect(openURL).toHaveBeenCalledWith('tel:119,8');
    await fireEvent.press(screen.getByRole('button', { name: 'Telepon Darurat (112)' }));
    expect(openURL).toHaveBeenCalledWith('tel:112');
  });

  it('makes SEJIWA the primary button and 112 the secondary one when urgent', async () => {
    await renderSheet('urgent');
    expect(screen.getByRole('button', { name: 'Telepon SEJIWA (119 ext 8)' })).toHaveStyle({ borderWidth: 0 });
    expect(screen.getByRole('button', { name: 'Telepon Darurat (112)' })).toHaveStyle({ borderWidth: 1 });
  });

  it('describes 112 as help you need right away', async () => {
    await renderSheet('urgent');
    expect(screen.getByText('Kalau kamu butuh bantuan segera')).toBeOnTheScreen();
  });

  it('says gently that the call could not be opened when openURL fails', async () => {
    openURL.mockRejectedValueOnce(new Error('no dialer'));
    await renderSheet('urgent');
    expect(screen.queryByText(CALL_FAILED)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Telepon SEJIWA (119 ext 8)' }));
    expect(await screen.findByText(CALL_FAILED)).toBeOnTheScreen();
  });

  it('shows "MOJI bukan layanan darurat." as normal text outside the scroll, right above the close button', async () => {
    await renderSheet('concern');
    const note = screen.getByText('MOJI bukan layanan darurat.');
    expect(within(screen.getByTestId('support-scroll')).queryByText('MOJI bukan layanan darurat.')).toBeNull();
    expect(indexOf('Aku baik-baik saja sekarang') - indexOf('MOJI bukan layanan darurat.')).toBe(1);
    expect(note).toHaveStyle({ fontSize: 16 });
    expect(note).not.toHaveStyle({ color: lightTheme.color.textMuted });
    expect(note).not.toHaveStyle({ color: darkTheme.color.textMuted });
  });

  it('shows national services as plain links, not buttons, for concern', async () => {
    await renderSheet('concern');
    expect(screen.queryByRole('button', { name: /SEJIWA/ })).toBeNull();
    await fireEvent.press(screen.getByRole('link', { name: 'Telepon SEJIWA, 119 ext 8' }));
    expect(openURL).toHaveBeenCalledWith('tel:119,8');
    expect(screen.getByRole('link', { name: 'Telepon Darurat, 112' })).toBeOnTheScreen();
  });

  it('shows the numbers without presenting them as verified', async () => {
    await renderSheet('urgent');
    expect(screen.getByText('Nomor layanan bisa berubah sewaktu-waktu.')).toBeOnTheScreen();
  });

  it('invites adding a campus counselling contact when none is saved', async () => {
    const onAddContact = jest.fn();
    await renderSheet('concern', { onAddContact });
    await fireEvent.press(await screen.findByRole('button', { name: 'Tambahkan kontak konseling kampus' }));
    expect(onAddContact).toHaveBeenCalledTimes(1);
  });

  it('invites adding a trusted person when only the campus contact is saved', async () => {
    await updateSettings(db, { campusContact: CAMPUS });
    await renderSheet('concern');
    expect(await screen.findByRole('button', { name: 'Tambahkan kontak orang terpercaya' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Tambahkan kontak konseling kampus' })).toBeNull();
  });

  it('does not count a contact with only a name as saved', async () => {
    await updateSettings(db, { campusContact: { name: 'BK', phone: null, url: null } });
    await renderSheet('concern');
    expect(await screen.findByRole('button', { name: 'Tambahkan kontak konseling kampus' })).toBeOnTheScreen();
  });

  it('calls or messages the saved trusted person in one tap', async () => {
    await updateSettings(db, { personalContact: RINA });
    await renderSheet('concern');
    await fireEvent.press(await screen.findByRole('button', { name: 'Telepon Rina' }));
    expect(openURL).toHaveBeenLastCalledWith('tel:08123456789');
    await fireEvent.press(screen.getByRole('button', { name: 'WhatsApp Rina' }));
    expect(openURL).toHaveBeenLastCalledWith('https://wa.me/628123456789');
  });

  it('opens the campus counselling phone and website', async () => {
    await updateSettings(db, { campusContact: CAMPUS, personalContact: RINA });
    await renderSheet('concern');
    await fireEvent.press(await screen.findByRole('button', { name: 'Telepon BK Kampus' }));
    expect(openURL).toHaveBeenLastCalledWith('tel:0274555123');
    // Nomor kantor bukan nomor HP: tidak ditawarkan lewat WhatsApp.
    expect(screen.queryByRole('button', { name: 'WhatsApp BK Kampus' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Buka situs BK Kampus' }));
    expect(openURL).toHaveBeenLastCalledWith('https://bk.kampus.ac.id');
    expect(screen.queryByRole('button', { name: /Tambahkan kontak/ })).toBeNull();
  });

  it('orders urgent as: trusted person, national services, campus', async () => {
    await updateSettings(db, { campusContact: CAMPUS, personalContact: RINA });
    await renderSheet('urgent');
    await screen.findByText('Rina');
    expect(indexOf('Orang terpercayamu')).toBeLessThan(indexOf('Layanan nasional'));
    expect(indexOf('Layanan nasional')).toBeLessThan(indexOf('Konseling kampus'));
  });

  it('orders concern as: trusted person, campus, national services', async () => {
    await updateSettings(db, { campusContact: CAMPUS, personalContact: RINA });
    await renderSheet('concern');
    await screen.findByText('Rina');
    expect(indexOf('Orang terpercayamu')).toBeLessThan(indexOf('Konseling kampus'));
    expect(indexOf('Konseling kampus')).toBeLessThan(indexOf('Layanan nasional'));
  });

  it('closes with "Aku baik-baik saja sekarang", the only control with that label', async () => {
    const onClose = jest.fn();
    await renderSheet('urgent', { onClose });
    expect(screen.getAllByLabelText('Aku baik-baik saja sekarang')).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Aku baik-baik saja sekarang' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each(['concern', 'urgent'] as const)('uses no clinical or pressuring words (%s)', async (level) => {
    await updateSettings(db, { campusContact: CAMPUS });
    await renderSheet(level);
    await screen.findByText('BK Kampus');
    const text = allText().join('\n');
    expect(text).not.toMatch(FORBIDDEN_WORDS);
    expect(text).not.toMatch(PRESSURE_WORDS);
  });

  it.each(['concern', 'urgent'] as const)('uses no clinical words without contacts either (%s)', async (level) => {
    await renderSheet(level);
    await screen.findByRole('button', { name: 'Tambahkan kontak konseling kampus' });
    const text = allText().join('\n');
    expect(text).not.toMatch(FORBIDDEN_WORDS);
    expect(text).not.toMatch(PRESSURE_WORDS);
  });
});
