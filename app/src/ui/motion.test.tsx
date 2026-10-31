import { renderHook } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import { useCalmMotion } from './motion';

const mockReduced = jest.spyOn(Reanimated, 'useReducedMotion');

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
