/**
 * @jest-environment ./src/domain/jakartaEnvironment.js
 */
// TZ = Asia/Jakarta diatur oleh environment di atas (assignment process.env.TZ
// di dalam file tes tidak berpengaruh di Jest 30).
import { formatPeriodLabel, lastNDays, localDateKey, previousWeek, startOfLocalDay } from './period';

describe('timezone', () => {
  it('runs in Asia/Jakarta (UTC+7)', () => {
    expect(new Date('2026-11-02T00:30:00+07:00').getTimezoneOffset()).toBe(-420);
  });
});

describe('previousWeek', () => {
  it('returns the Monday-to-Monday week before the week of now (Wednesday)', () => {
    const w = previousWeek(new Date('2026-11-04T10:00:00+07:00'));
    expect(w.start.getTime()).toBe(new Date('2026-10-26T00:00:00+07:00').getTime());
    expect(w.end.getTime()).toBe(new Date('2026-11-02T00:00:00+07:00').getTime());
    expect(w.weekKey).toBe('2026-10-26');
  });

  it('treats Monday 00:30 WIB as already in the new week (not UTC)', () => {
    expect(previousWeek(new Date('2026-11-02T00:30:00+07:00')).weekKey).toBe('2026-10-26');
  });

  it('treats Sunday 23:59 as still in the old week', () => {
    expect(previousWeek(new Date('2026-11-01T23:59:00+07:00')).weekKey).toBe('2026-10-19');
  });
});

describe('lastNDays', () => {
  it('starts at local midnight n-1 days back and ends at now', () => {
    const now = new Date('2026-11-04T10:00:00+07:00');
    const r = lastNDays(now, 30);
    expect(r.start.getTime()).toBe(new Date('2026-10-06T00:00:00+07:00').getTime());
    expect(r.end.getTime()).toBe(now.getTime());
  });
});

describe('startOfLocalDay / localDateKey', () => {
  it('uses the local day, not the UTC day', () => {
    const d = new Date('2026-11-02T00:30:00+07:00'); // 2026-11-01 17:30 UTC
    expect(startOfLocalDay(d).getTime()).toBe(new Date('2026-11-02T00:00:00+07:00').getTime());
    expect(localDateKey(d)).toBe('2026-11-02');
  });
});

describe('formatPeriodLabel', () => {
  it('labels with the last inclusive day', () => {
    const start = new Date('2026-10-26T00:00:00+07:00');
    const end = new Date('2026-11-02T00:00:00+07:00');
    expect(formatPeriodLabel(start, end)).toBe('26 Okt – 1 Nov');
  });
});
