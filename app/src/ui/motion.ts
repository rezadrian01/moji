import { Easing, FadeIn, useReducedMotion } from 'react-native-reanimated';

const DURATION_MS = 280;

/** Gentle fade-in; reduce motion turns it off entirely. */
export function useCalmMotion() {
  const reduced = useReducedMotion();
  if (reduced) return { enter: undefined, durationMs: 0 };
  return {
    enter: FadeIn.duration(DURATION_MS).easing(Easing.out(Easing.quad)),
    durationMs: DURATION_MS,
  };
}
