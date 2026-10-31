import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createElement } from 'react';

import type { Db } from '@/db/db';
import { getDraft, saveDraft } from '@/db/settingsRepo';
import { createTestDb } from '@/db/testing/sqljsDb';
import { DbContext } from '@/db/useDbQuery';

import { DRAFT_DEBOUNCE_MS, useDraft } from './draft';

let db: Db;
const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(DbContext.Provider, { value: db }, children);

/** Poll DB tanpa `waitFor(async ...)`, yang bisa meninggalkan `act` terbuka ke test berikutnya. */
async function eventually(check: () => Promise<void>): Promise<void> {
  for (let i = 0; i < 20; i++) {
    try {
      await check();
      return;
    } catch {
      // Tulisan sql.js selesai lewat microtask; cukup biarkan antrean itu jalan.
      await act(async () => {
        await Promise.resolve();
      });
    }
  }
  await check();
}

beforeEach(async () => {
  db = await createTestDb();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('useDraft', () => {
  it('debounces writes by 500ms and keeps only the latest value', async () => {
    expect(DRAFT_DEBOUNCE_MS).toBe(500);
    jest.useFakeTimers();
    const { result } = await renderHook(() => useDraft(), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      result.current.save({ mood: 2, note: 'cap' });
      result.current.save({ mood: 2, note: 'capek' });
      jest.advanceTimersByTime(499);
    });
    expect(await getDraft(db)).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    await eventually(async () => expect(await getDraft(db)).toEqual({ mood: 2, note: 'capek' }));
  });

  it('loads the stored draft on mount', async () => {
    await saveDraft(db, { mood: 4, note: 'tadi siang' });
    const { result } = await renderHook(() => useDraft(), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.draft).toEqual({ mood: 4, note: 'tadi siang' });
  });

  it('reports null once loaded when there is no draft', async () => {
    const { result } = await renderHook(() => useDraft(), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.draft).toBeNull();
  });

  it('writes a pending draft right away when unmounted, so closing mid-way loses nothing', async () => {
    jest.useFakeTimers();
    const { result, unmount } = await renderHook(() => useDraft(), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      result.current.save({ mood: 1, note: 'belum selesai' });
    });
    await unmount();
    await eventually(async () => expect(await getDraft(db)).toEqual({ mood: 1, note: 'belum selesai' }));
  });

  it('clear() removes the stored draft and cancels a pending write', async () => {
    jest.useFakeTimers();
    await saveDraft(db, { mood: 3 });
    const { result } = await renderHook(() => useDraft(), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(async () => {
      result.current.save({ mood: 3, note: 'x' });
      result.current.clear();
      jest.advanceTimersByTime(1000);
    });
    await eventually(async () => expect(await getDraft(db)).toBeNull());
    expect(result.current.draft).toBeNull();
  });
});
