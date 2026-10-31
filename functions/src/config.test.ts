import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('throws when MOJI_MODEL is missing or blank', () => {
    expect(() => loadConfig({})).toThrow(/MOJI_MODEL/);
    expect(() => loadConfig({ MOJI_MODEL: '  ' })).toThrow(/MOJI_MODEL/);
  });

  it('applies defaults', () => {
    const c = loadConfig({ MOJI_MODEL: 'gemini-x', GOOGLE_CLOUD_PROJECT: 'proj' });
    expect(c).toEqual({
      model: 'gemini-x',
      vertexLocation: 'global',
      projectId: 'proj',
      perCodeDailyLimit: 50,
      globalDailyLimit: 1000,
      timeZone: 'Asia/Jakarta',
    });
  });

  it('reads numeric limits and location from env', () => {
    const c = loadConfig({
      MOJI_MODEL: 'm',
      MOJI_VERTEX_LOCATION: 'asia-southeast1',
      MOJI_PER_CODE_LIMIT: '7',
      MOJI_GLOBAL_LIMIT: '99',
    });
    expect(c.vertexLocation).toBe('asia-southeast1');
    expect(c.perCodeDailyLimit).toBe(7);
    expect(c.globalDailyLimit).toBe(99);
  });

  it('rejects non-numeric or non-positive limits', () => {
    expect(() => loadConfig({ MOJI_MODEL: 'm', MOJI_PER_CODE_LIMIT: 'abc' })).toThrow(/MOJI_PER_CODE_LIMIT/);
    expect(() => loadConfig({ MOJI_MODEL: 'm', MOJI_GLOBAL_LIMIT: '0' })).toThrow(/MOJI_GLOBAL_LIMIT/);
  });
});
