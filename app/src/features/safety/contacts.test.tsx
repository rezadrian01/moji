import { fireEvent, render, screen } from '@testing-library/react-native';

import ContactsScreen from '@/app/settings/contacts';
import type { Db } from '@/db/db';
import { getSettings, updateSettings } from '@/db/settingsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { FORBIDDEN_WORDS, PRESSURE_WORDS } from '@/domain/insightText';
import { AppProviders } from '@/features/app/AppProviders';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

async function renderContacts() {
  await render(
    <AppProviders db={db}>
      <ContactsScreen />
    </AppProviders>,
  );
  await screen.findByLabelText('Nama konseling kampus');
}

const field = (label: string) => screen.getByLabelText(label);

describe('settings/contacts', () => {
  it('saves both contacts so getSettings returns them', async () => {
    await renderContacts();
    await fireEvent.changeText(field('Nama konseling kampus'), 'BK Kampus');
    await fireEvent.changeText(field('Nomor konseling kampus'), '0274-555123');
    await fireEvent.changeText(field('Tautan konseling kampus'), 'bk.kampus.ac.id');
    await fireEvent.changeText(field('Nama orang terpercaya'), 'Rina');
    await fireEvent.changeText(field('Nomor orang terpercaya'), '0812-3456-789');
    await fireEvent.press(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Kontak tersimpan.')).toBeOnTheScreen();
    const settings = await getSettings(db);
    expect(settings.campusContact).toEqual({ name: 'BK Kampus', phone: '0274-555123', url: 'bk.kampus.ac.id' });
    expect(settings.personalContact).toEqual({ name: 'Rina', phone: '0812-3456-789', url: null });
  });

  it('treats every field as optional', async () => {
    await renderContacts();
    await fireEvent.changeText(field('Nomor orang terpercaya'), ' 0812-3456-789 ');
    await fireEvent.press(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByText('Kontak tersimpan.')).toBeOnTheScreen();
    const settings = await getSettings(db);
    expect(settings.campusContact).toBeNull();
    expect(settings.personalContact).toEqual({ name: '', phone: '0812-3456-789', url: null });
  });

  it('prefills saved contacts and clears one when all its fields are emptied', async () => {
    await updateSettings(db, {
      aiEnabled: true,
      campusContact: { name: 'BK', phone: '0274-1', url: null },
      personalContact: { name: 'Rina', phone: '0812', url: null },
    });
    await renderContacts();
    expect(field('Nama konseling kampus')).toHaveDisplayValue('BK');
    expect(field('Nomor orang terpercaya')).toHaveDisplayValue('0812');

    await fireEvent.changeText(field('Nama konseling kampus'), '');
    await fireEvent.changeText(field('Nomor konseling kampus'), '  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Simpan' }));
    await screen.findByText('Kontak tersimpan.');

    const settings = await getSettings(db);
    expect(settings.campusContact).toBeNull();
    expect(settings.personalContact).toEqual({ name: 'Rina', phone: '0812', url: null });
    // Pengaturan lain tidak tersentuh.
    expect(settings.aiEnabled).toBe(true);
  });

  it('hides the saved note again once something is edited', async () => {
    await renderContacts();
    await fireEvent.press(screen.getByRole('button', { name: 'Simpan' }));
    await screen.findByText('Kontak tersimpan.');
    await fireEvent.changeText(field('Nama orang terpercaya'), 'Rina');
    expect(screen.queryByText('Kontak tersimpan.')).toBeNull();
  });

  it('says so gently when saving fails, without losing what was typed', async () => {
    await renderContacts();
    await fireEvent.changeText(field('Nama orang terpercaya'), 'Rina');
    jest.spyOn(db, 'runAsync').mockRejectedValueOnce(new Error('disk penuh'));
    await fireEvent.press(screen.getByRole('button', { name: 'Simpan' }));
    expect(await screen.findByText('Kontaknya belum tersimpan. Coba sekali lagi, ya.')).toBeOnTheScreen();
    expect(field('Nama orang terpercaya')).toHaveDisplayValue('Rina');
  });

  it('does not offer an empty form (that could erase saved contacts) when settings cannot be read', async () => {
    jest.spyOn(db, 'getFirstAsync').mockRejectedValueOnce(new Error('rusak'));
    await render(
      <AppProviders db={db}>
        <ContactsScreen />
      </AppProviders>,
    );
    expect(await screen.findByText('Kontak belum bisa dibuka. Coba buka lagi halaman ini, ya.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Simpan' })).toBeNull();
  });

  it('uses no clinical or pressuring words', async () => {
    await renderContacts();
    const text = JSON.stringify(screen.toJSON());
    expect(text).not.toMatch(FORBIDDEN_WORDS);
    expect(text).not.toMatch(PRESSURE_WORDS);
  });
});
