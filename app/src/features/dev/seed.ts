import type { Db } from '@/db/db';
import { toLocalIso } from '@/db/db';
import { createEntry } from '@/db/entriesRepo';
import type { ContextTag, Mood } from '@/domain/types';

const DAYS = 21;
const OTHER_CONTEXTS: (ContextTag | null)[] = [
  null,
  { category: 'interpersonal', subTag: null },
  { category: 'media', subTag: null },
  { category: 'finansial', subTag: null },
];

/**
 * Data contoh untuk tim: 21 hari catatan (1-2 per hari). Setiap hari ada satu catatan biasa (mood 3-5,
 * tanpa konteks akademik). Pada Senin/Rabu/Jumat ada catatan akademik bermood rendah dan pada Kamis satu
 * catatan akademik bermood 4, sehingga di tiap minggu penuh: akademik 3 dari 4 rendah (0,75) vs dasar ~0,27.
 * Mengembalikan jumlah catatan yang dibuat.
 */
export async function seedSampleData(db: Db, now: Date, rand: () => number = Math.random): Promise<number> {
  const pick = <T,>(xs: readonly T[]): T => xs[Math.min(xs.length - 1, Math.floor(rand() * xs.length))];
  let count = 0;

  const add = async (day: Date, hour: number, mood: Mood, contexts: ContextTag[]) => {
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour);
    const when = at.getTime() > now.getTime() ? now : at;
    await createEntry(db, { mood, contexts, createdAt: toLocalIso(when) }, now);
    count += 1;
  };

  for (let i = DAYS - 1; i >= 0; i -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const other = pick(OTHER_CONTEXTS);
    await add(day, 8, pick([3, 4, 5] as const), other ? [other] : []);

    const weekday = day.getDay();
    const academic: ContextTag[] = [{ category: 'akademik', subTag: null }];
    if (weekday === 1 || weekday === 3 || weekday === 5) {
      await add(day, 19, pick([1, 2] as const), academic);
    } else if (weekday === 4) {
      await add(day, 19, 4, academic);
    }
  }
  return count;
}
