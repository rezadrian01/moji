import { contrastRatio, darkTheme, lightTheme } from './tokens';

function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

describe.each([
  ['light', lightTheme],
  ['dark', darkTheme],
])('%s theme', (_name, t) => {
  it('text and textMuted meet AA on bg and surface', () => {
    for (const bg of [t.color.bg, t.color.surface]) {
      expect(contrastRatio(t.color.text, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.color.textMuted, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('onPrimary on primary meets AA', () => {
    expect(contrastRatio(t.color.onPrimary, t.color.primary)).toBeGreaterThanOrEqual(4.5);
  });
  it('primary is readable on bg (quiet button text)', () => {
    expect(contrastRatio(t.color.primary, t.color.bg)).toBeGreaterThanOrEqual(4.5);
  });
  it('no mood color has a red hue (340-20 deg)', () => {
    for (const m of [1, 2, 3, 4, 5] as const) {
      const h = hue(t.color.mood[m]);
      expect(h > 20 && h < 340).toBe(true);
    }
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colors', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});

describe('theme scale', () => {
  it('space is a 4-point grid', () => {
    expect(lightTheme.space(3)).toBe(12);
  });
});
