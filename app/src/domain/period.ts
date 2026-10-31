// Semua berdasarkan waktu lokal perangkat (bukan UTC).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const pad = (n: number) => String(n).padStart(2, '0');

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Minggu SEBELUM minggu `now`: Senin 00:00 s.d. Senin berikutnya 00:00 (eksklusif). */
export function previousWeek(now: Date): { start: Date; end: Date; weekKey: string } {
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7);
  return { start, end, weekKey: localDateKey(start) };
}

/** [startOfLocalDay(now) - (n-1) hari, now] */
export function lastNDays(now: Date, n: number): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (n - 1));
  return { start, end: now };
}

/** `end` eksklusif, jadi label memakai hari terakhir: "26 Okt – 1 Nov". */
export function formatPeriodLabel(start: Date, end: Date): string {
  const last = new Date(end.getTime() - 1);
  const fmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return `${fmt(start)} – ${fmt(last)}`;
}
