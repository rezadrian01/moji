/* eslint-disable @typescript-eslint/no-require-imports */
import { render, renderHook, screen } from '@testing-library/react-native';
import { createElement } from 'react';
import { Text } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

describe('jest setup', () => {
  it('sql.js bisa membuat DB in-memory dan menjalankan SELECT 1', async () => {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const res = db.exec('SELECT 1 AS x');
    expect(res[0].values[0][0]).toBe(1);
    db.close();
  });

  it('expo-secure-store adalah mock jest', () => {
    const store = require('expo-secure-store');
    expect(jest.isMockFunction(store.getItemAsync)).toBe(true);
  });
});

describe('jest setup: reanimated + expo-crypto', () => {
  it('merender Animated.View dengan entering={FadeIn} tanpa throw', async () => {
    await render(
      createElement(
        Animated.View,
        { entering: FadeIn },
        createElement(Text, null, 'halo'),
      ),
    );
    expect(screen.getByText('halo')).toBeOnTheScreen();
  });

  it('useReducedMotion tersedia', async () => {
    const { result } = await renderHook(() => useReducedMotion());
    expect(typeof result.current).toBe('boolean');
  });

  it('expo-notifications mock memuat SchedulableTriggerInputTypes', () => {
    const types = require('expo-notifications').SchedulableTriggerInputTypes;
    expect(types.DAILY).toBe('daily');
    expect(types.WEEKLY).toBe('weekly');
  });

  it('expo-crypto randomUUID mengembalikan UUID', () => {
    const id = require('expo-crypto').randomUUID();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
