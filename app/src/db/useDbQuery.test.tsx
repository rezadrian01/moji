/** @jest-environment node */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Db } from './db';
import { createTestDb } from './testing/sqljsDb';
import { createEntry, listEntries } from './entriesRepo';
import { emitDataChanged } from './events';
import { DbContext, useDb, useDbQuery } from './useDbQuery';

jest.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DbContext.Provider value={db}>{children}</DbContext.Provider>
);

describe('useDbQuery', () => {
  it('loads data and reloads after a change event on a watched table', async () => {
    const { result } = await renderHook(
      () => useDbQuery((d) => listEntries(d, {}), ['entries'], []),
      { wrapper },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);

    await createEntry(db, { mood: 3 }, new Date());
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.error).toBeNull();
  });

  it('ignores change events for tables it does not watch', async () => {
    const query = jest.fn(async () => 1);
    const { result } = await renderHook(() => useDbQuery(query, ['insights'], []), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(query).toHaveBeenCalledTimes(1);
    await act(async () => {
      emitDataChanged('entries');
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('reports errors from the query', async () => {
    const { result } = await renderHook(
      () =>
        useDbQuery(
          async () => {
            throw new Error('gagal');
          },
          ['entries'],
          [],
        ),
      { wrapper },
    );
    await waitFor(() => expect(result.current.error?.message).toBe('gagal'));
    expect(result.current.loading).toBe(false);
  });

  it('useDb throws outside a provider', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderHook(() => useDb())).rejects.toThrow();
    spy.mockRestore();
  });
});
