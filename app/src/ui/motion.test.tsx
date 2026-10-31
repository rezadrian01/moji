import { renderHook } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useCalmMotion } from './motion';

// The shared reanimated mock needs the worklets runtime, which is unavailable under Jest,
// so this suite stubs only the three symbols motion.ts uses.
jest.mock('react-native-reanimated', () => {
  const anim: Record<string, unknown> = {};
  anim.duration = () => anim;
  anim.easing = () => anim;
  return {
    FadeIn: anim,
    Easing: { out: (f: unknown) => f, quad: (t: number) => t },
    useReducedMotion: jest.fn(),
  };
});

const mockReduced = useReducedMotion as jest.Mock;

describe('useCalmMotion', () => {
  it('reduce motion -> no entering animation and 0ms', async () => {
    mockReduced.mockReturnValue(true);
    const { result } = await renderHook(() => useCalmMotion());
    expect(result.current.durationMs).toBe(0);
    expect(result.current.enter).toBeUndefined();
  });

  it('default -> 280ms with an entering animation', async () => {
    mockReduced.mockReturnValue(false);
    const { result } = await renderHook(() => useCalmMotion());
    expect(result.current.durationMs).toBe(280);
    expect(result.current.enter).toBeDefined();
  });
});
