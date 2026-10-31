import * as Notifications from 'expo-notifications';
import { FORBIDDEN_WORDS, PRESSURE_WORDS } from '../../domain/insightText';
import { DAILY_MESSAGES } from './messages';
import {
  applyReminderSettings,
  cancelAllReminders,
  ensureNotificationPermission,
} from './scheduler';

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  setNotificationChannelAsync: jest.fn(async () => null),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
}));

const n = jest.mocked(Notifications);

beforeEach(() => jest.clearAllMocks());

describe('applyReminderSettings', () => {
  it('cancels first, then schedules 7 weekly reminders, one per weekday, at 20:30', async () => {
    await applyReminderSettings({ reminderTime: '20:30', weeklyNudge: false, weeklyNudgeDay: 1 });
    expect(n.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(7);
    const args = n.scheduleNotificationAsync.mock.calls.map((c) => c[0]);
    for (const arg of args) {
      expect(arg.trigger).toEqual({
        type: 'weekly',
        weekday: expect.any(Number),
        hour: 20,
        minute: 30,
        channelId: 'moji-reminders',
      });
      expect(arg.content.sound).toBe(false);
      expect(n.cancelAllScheduledNotificationsAsync.mock.invocationCallOrder[0]).toBeLessThan(
        n.scheduleNotificationAsync.mock.invocationCallOrder[0],
      );
    }
    const weekdays = args.map((a) => (a.trigger as { weekday: number }).weekday).sort();
    expect(weekdays).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('rotates the daily text across the week from the allowed messages', async () => {
    await applyReminderSettings({ reminderTime: '20:30', weeklyNudge: false, weeklyNudgeDay: 1 });
    const bodies = n.scheduleNotificationAsync.mock.calls.map((c) => c[0].content.body as string);
    expect(new Set(bodies).size).toBe(7);
    for (const body of bodies) {
      expect(DAILY_MESSAGES).toContain(body);
      expect(body).not.toMatch(FORBIDDEN_WORDS);
      expect(body).not.toMatch(PRESSURE_WORDS);
      expect(body).not.toMatch(/hari ini kamu belum|sudah \d+ hari|streak|jangan lupa/i);
    }
  });

  it('schedules only weekly Monday 19:00 when no daily time', async () => {
    await applyReminderSettings({ reminderTime: null, weeklyNudge: true, weeklyNudgeDay: 1 });
    expect(n.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(n.scheduleNotificationAsync.mock.calls[0][0].trigger).toEqual({
      type: 'weekly',
      weekday: 2, // expo: 1 = Sunday, so ISO Monday = 2
      hour: 19,
      minute: 0,
      channelId: 'moji-reminders',
    });
  });

  it('converts ISO weekdays to expo weekdays (Sunday 7 -> 1, Saturday 6 -> 7)', async () => {
    await applyReminderSettings({ reminderTime: '08:05', weeklyNudge: true, weeklyNudgeDay: 7 });
    const nudge = n.scheduleNotificationAsync.mock.calls.find((c) => c[0].content.title !== 'MOJI')!;
    expect(nudge[0].trigger).toMatchObject({ weekday: 1, hour: 8, minute: 5 });
    jest.clearAllMocks();
    await applyReminderSettings({ reminderTime: null, weeklyNudge: true, weeklyNudgeDay: 6 });
    expect(n.scheduleNotificationAsync.mock.calls[0][0].trigger).toMatchObject({ weekday: 7 });
  });

  it('only cancels when everything is off', async () => {
    await applyReminderSettings({ reminderTime: null, weeklyNudge: false, weeklyNudgeDay: 1 });
    expect(n.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('configures the Android channel without vibration', async () => {
    await applyReminderSettings({ reminderTime: '20:30', weeklyNudge: false, weeklyNudgeDay: 1 });
    expect(n.setNotificationChannelAsync).toHaveBeenCalledWith(
      'moji-reminders',
      expect.objectContaining({ importance: 3, enableVibrate: false, vibrationPattern: [] }),
    );
  });
});

describe('ensureNotificationPermission', () => {
  it('returns true when already granted without asking', async () => {
    expect(await ensureNotificationPermission()).toBe(true);
    expect(n.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('asks when not granted and returns the result', async () => {
    n.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' } as never);
    n.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as never);
    expect(await ensureNotificationPermission()).toBe(false);
    expect(n.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});

describe('cancelAllReminders', () => {
  it('cancels all scheduled notifications', async () => {
    await cancelAllReminders();
    expect(n.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });
});
