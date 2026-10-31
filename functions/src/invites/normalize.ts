const PATTERN = /^MOJI-[A-Z0-9]{2,4}-[A-Z0-9]{4}$/;

export function normalizeInviteCode(raw: string | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return PATTERN.test(code) ? code : null;
}
