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

describe('local demo config', () => {
  it('.env.example lists the local-mode variables', () => {
    const lines = read('.env.example').split('\n');
    for (const k of ['MOJI_MODEL=', 'GOOGLE_CLOUD_PROJECT=', 'MOJI_VERTEX_LOCATION=global', 'MOJI_STORE=file', 'MOJI_INVITES_FILE=data/invites.json', 'MOJI_PER_CODE_LIMIT=50', 'MOJI_GLOBAL_LIMIT=1000', 'PORT=8080']) {
      expect(lines).toContain(k);
    }
  });

  it('.gitignore and .gcloudignore exclude .env and data/', () => {
    for (const f of ['.gitignore', '.gcloudignore']) {
      const lines = read(f).split('\n').map((l) => l.trim());
      expect(lines.some((l) => l === '.env' || l === '.env*'), `${f} .env`).toBe(true);
      expect(lines, `${f} data/`).toContain('data/');
    }
  });

  it('dev:server, invites and the eval script load .env via --env-file-if-exists', () => {
    const s = JSON.parse(read('package.json')).scripts as Record<string, string>;
    expect(s['dev:server']).toContain('--env-file-if-exists=.env');
    expect(s['dev:server']).toContain('--target=api');
    expect(s['dev:server']).toContain('tsc -p tsconfig.build.json');
    expect(s.invites).toContain('--env-file-if-exists=.env');
    expect(s.eval).toContain('--env-file-if-exists=.env');
  });

  it('index.ts and the admin CLI use createInviteStore, not Firestore directly', () => {
    for (const f of ['src/index.ts', 'src/admin/invites.ts']) {
      const src = read(f);
      expect(src).toContain('createInviteStore');
      expect(src).not.toContain('FirestoreInviteStore');
    }
  });
});
