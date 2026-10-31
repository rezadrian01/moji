import { DAILY_MESSAGES, WEEKLY_NUDGE } from './messages';

const FORBIDDEN = /hari ini kamu belum|sudah \d+ hari|streak|jangan lupa/i;

describe('reminder messages', () => {
  it('has at least 5 daily variations', () => {
    expect(new Set(DAILY_MESSAGES).size).toBeGreaterThanOrEqual(5);
  });

  it('uses no guilt or streak copy', () => {
    for (const m of [...DAILY_MESSAGES, WEEKLY_NUDGE.title, WEEKLY_NUDGE.body]) {
      expect(m).not.toMatch(FORBIDDEN);
    }
  });

  it('has the weekly copy', () => {
    expect(WEEKLY_NUDGE).toEqual({
      title: 'Ringkasan minggu lalu',
      body: 'Ringkasan minggu lalu bisa kamu lihat kalau mau.',
    });
  });
});
