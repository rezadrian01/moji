import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('deploy config', () => {
  it('package.json has a gcp-build script that compiles TypeScript', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['gcp-build']).toContain('tsc');
  });

  it('.gcloudignore keeps sources and tsconfig files', () => {
    const lines = read('.gcloudignore')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    const bad = /^\/?(src|tsconfig[^/]*|package(-lock)?\.json)\/?(\*\*)?$|^\*\.json$|^tsconfig/;
    expect(lines.filter((l) => bad.test(l))).toEqual([]);
    expect(lines).toContain('node_modules/');
  });
});
