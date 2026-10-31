import type { Mood } from '@/domain/types';

export interface Theme {
  scheme: 'light' | 'dark';
  color: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    textMuted: string;
    primary: string;
    onPrimary: string;
    border: string;
    focus: string;
    mood: Record<Mood, string>;
  };
  space: (n: number) => number;
  radius: { sm: 8; md: 16; lg: 24 };
  font: {
    regular: 'Nunito_400Regular';
    semibold: 'Nunito_600SemiBold';
    bold: 'Nunito_700Bold';
  };
}

// Calm blue-violet to sage to warm sand. No hue in 340-20 deg (no red) for any mood.
const mood: Record<Mood, string> = {
  1: '#7D8BB0',
  2: '#97A8C4',
  3: '#B4B2C2',
  4: '#8FBFAE',
  5: '#E5C07B',
};

const shared = {
  space: (n: number) => 4 * n,
  radius: { sm: 8, md: 16, lg: 24 } as const,
  font: {
    regular: 'Nunito_400Regular',
    semibold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
  } as const,
};

export const lightTheme: Theme = {
  scheme: 'light',
  color: {
    bg: '#F7F5F2',
    surface: '#FFFFFF',
    surfaceAlt: '#EEEBE6',
    text: '#2A2D34',
    textMuted: '#5E6470',
    primary: '#4F6D8F',
    onPrimary: '#FFFFFF',
    border: '#D9D5CE',
    focus: '#3A5675',
    mood,
  },
  ...shared,
};

export const darkTheme: Theme = {
  scheme: 'dark',
  color: {
    bg: '#16181D',
    surface: '#1F232A',
    surfaceAlt: '#2A2F38',
    text: '#ECEDEF',
    textMuted: '#A9AFBA',
    primary: '#9DB8D9',
    onPrimary: '#16181D',
    border: '#3A404B',
    focus: '#C4D6EC',
    mood,
  },
  ...shared,
};

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio between two #RRGGBB colors. */
export function contrastRatio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
