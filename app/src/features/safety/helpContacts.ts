import type { Contact } from '@/domain/types';

export interface NationalService {
  name: string;
  description: string;
  /** Koma = jeda nada sebelum nomor ekstensi. */
  phone: string;
  /** false sampai tim memverifikasi nomor yang berlaku (spec §6.9, checklist rilis). */
  verified: boolean;
}

// Urutan = prioritas: layanan pertama jadi tombol primer pada tingkat urgent.
// TODO(rilis): tim wajib memverifikasi kedua nomor ini sebelum rilis ke responden, lalu
// ubah verified menjadi true dan catat tanggal serta sumber verifikasinya di sini.
export const NATIONAL_SERVICES: NationalService[] = [
  { name: 'SEJIWA', description: 'Layanan dukungan kesehatan jiwa', phone: '119,8', verified: false },
  { name: 'Darurat', description: 'Kalau kamu butuh bantuan segera', phone: '112', verified: false },
];

export interface ContactLinks {
  call?: string;
  whatsapp?: string;
  web?: string;
}

const blank = (s: string | null | undefined): s is null | undefined => !s || s.trim() === '';

/** Nomor siap-panggil: hanya angka, "+" di depan, dan koma (jeda ekstensi). */
function dialable(phone: string): string {
  const trimmed = phone.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/[^\d,]/g, '');
}

/** Nomor HP Indonesia dalam format internasional tanpa "+" (628…), atau null. */
function indonesianMobile(phone: string): string | null {
  const d = dialable(phone);
  if (d.includes(',')) return null;
  const digits = d.replace('+', '');
  const intl = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  return /^628\d{7,12}$/.test(intl) ? intl : null;
}

function webUrl(url: string): string | undefined {
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (/^[a-z][a-z\d+.-]*:/i.test(u)) return undefined;
  return `https://${u}`;
}

/** Tautan satu-tap untuk kontak: tel:, WhatsApp (khusus nomor HP Indonesia), dan situs. */
export function contactLinks(c: Partial<Contact>): ContactLinks {
  const links: ContactLinks = {};
  if (!blank(c.phone)) {
    const call = dialable(c.phone);
    if (call.replace(/[+,]/g, '') !== '') links.call = `tel:${call}`;
    const wa = indonesianMobile(c.phone);
    if (wa) links.whatsapp = `https://wa.me/${wa}`;
  }
  if (!blank(c.url)) {
    const web = webUrl(c.url);
    if (web) links.web = web;
  }
  return links;
}

/** "119,8" → "119 ext 8". */
export function displayPhone(phone: string): string {
  return phone.trim().replace(/\s*,\s*/g, ' ext ');
}

/** Kontak dianggap terisi kalau bisa dihubungi: ada nomor atau tautan, bukan sekadar nama. */
export function hasReachableContact(c: Contact | null | undefined): c is Contact {
  return !!c && (!blank(c.phone) || !blank(c.url));
}
