const g = globalThis as unknown as { __DEV__: boolean };
const originalDev = g.__DEV__;
const originalFlag = process.env.EXPO_PUBLIC_DEV_TOOLS;

function loadDevToolsFlag(dev: boolean, flag: string | undefined): boolean {
  g.__DEV__ = dev;
  if (flag === undefined) delete process.env.EXPO_PUBLIC_DEV_TOOLS;
  else process.env.EXPO_PUBLIC_DEV_TOOLS = flag;
  let value = false;
  jest.isolateModules(() => {
    value = jest.requireActual<typeof import('./startup')>('./startup').DEV_TOOLS_ENABLED;
  });
  return value;
}

afterEach(() => {
  g.__DEV__ = originalDev;
  if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_DEV_TOOLS;
  else process.env.EXPO_PUBLIC_DEV_TOOLS = originalFlag;
});

describe('DEV_TOOLS_ENABLED', () => {
  it('is on in development builds', () => {
    expect(loadDevToolsFlag(true, undefined)).toBe(true);
  });

  it('is off in release builds without the flag', () => {
    expect(loadDevToolsFlag(false, undefined)).toBe(false);
    expect(loadDevToolsFlag(false, '0')).toBe(false);
  });

  it('is on in release builds when EXPO_PUBLIC_DEV_TOOLS is "1"', () => {
    expect(loadDevToolsFlag(false, '1')).toBe(true);
  });
});
