import Svg, { Circle, Path } from 'react-native-svg';

import type { Mood } from '@/domain/types';
import { useTheme } from '@/theme/ThemeProvider';

// Mouth curve control offset per mood: negative = downturned, positive = smile.
const MOUTH: Record<Mood, string> = {
  1: 'M 14 33 Q 24 27 34 33',
  2: 'M 15 32 Q 24 29 33 32',
  3: 'M 15 31 L 33 31',
  4: 'M 15 29 Q 24 35 33 29',
  5: 'M 13 28 Q 24 40 35 28',
};

export function MoodFace({ mood, size }: { mood: Mood; size: number }) {
  const theme = useTheme();
  const ink = theme.scheme === 'dark' ? '#16181D' : '#2A2D34';
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={24} cy={24} r={22} fill={theme.color.mood[mood]} />
      <Circle cx={17} cy={19} r={2} fill={ink} />
      <Circle cx={31} cy={19} r={2} fill={ink} />
      <Path d={MOUTH[mood]} stroke={ink} strokeWidth={2.5} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
