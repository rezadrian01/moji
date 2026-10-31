import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import type { AppSettings } from '../../domain/types';
import { DAILY_MESSAGES, WEEKLY_NUDGE } from './messages';

const CHANNEL_ID = 'moji-reminders';
const DEFAULT_WEEKLY_TIME = '19:00';

function parseTime(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':').map(Number);
  return { hour: h, minute: m };
}

/** ISO (1 = Senin ... 7 = Minggu) -> expo-notifications (1 = Minggu ... 7 = Sabtu). */
function isoToExpoWeekday(iso: number): number {
  return (iso % 7) + 1;
}

async function ensureChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Pengingat MOJI',
    importance: AndroidImportance.DEFAULT,
    enableVibrate: false,
    vibrationPattern: [],
  });
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function applyReminderSettings(
  s: Pick<AppSettings, 'reminderTime' | 'weeklyNudge' | 'weeklyNudgeDay'>,
): Promise<void> {
  await cancelAllReminders();
  if (!s.reminderTime && !s.weeklyNudge) return;
  await ensureChannel();

  if (s.reminderTime) {
    // Pengingat harian = 7 trigger mingguan (satu per hari) supaya teksnya bergilir.
    const time = parseTime(s.reminderTime);
    for (let iso = 1; iso <= 7; iso++) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'MOJI', body: DAILY_MESSAGES[(iso - 1) % DAILY_MESSAGES.length], sound: false },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: isoToExpoWeekday(iso),
          ...time,
          channelId: CHANNEL_ID,
        },
      });
    }
  }

  if (s.weeklyNudge) {
    await Notifications.scheduleNotificationAsync({
      content: { title: WEEKLY_NUDGE.title, body: WEEKLY_NUDGE.body, sound: false },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: isoToExpoWeekday(s.weeklyNudgeDay),
        ...parseTime(s.reminderTime ?? DEFAULT_WEEKLY_TIME),
        channelId: CHANNEL_ID,
      },
    });
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === 'granted';
}
