import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ConsumeResult, InviteRecord, InviteStore } from './store.js';

interface FileData {
  invites: Record<string, InviteRecord>;
  usage: Record<string, number>;
}

/**
 * Local-demo store: one JSON file, atomic writes (temp file + rename), operations
 * serialized through a promise queue. Safe for a single process only.
 */
export class FileInviteStore implements InviteStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly path: string) {}

  private run<T>(op: () => Promise<T>): Promise<T> {
    const next = this.queue.then(op, op);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async load(): Promise<FileData> {
    let raw: string;
    try {
      raw = await readFile(this.path, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { invites: {}, usage: {} };
      throw e;
    }
    const parsed = JSON.parse(raw) as Partial<FileData>;
    return { invites: parsed.invites ?? {}, usage: parsed.usage ?? {} };
  }

  private async save(data: FileData): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await rename(tmp, this.path);
  }

  get(code: string): Promise<InviteRecord | null> {
    return this.run(async () => {
      const r = (await this.load()).invites[code];
      return r ? { ...r } : null;
    });
  }

  consume(code: string, today: string, perCodeLimit: number, globalLimit: number): Promise<ConsumeResult> {
    return this.run(async () => {
      const data = await this.load();
      const rec = data.invites[code];
      if (!rec) return 'code_limit';
      const codeCount = rec.countDate === today ? rec.dailyCount : 0;
      const globalCount = data.usage[today] ?? 0;
      if (codeCount >= perCodeLimit) return 'code_limit';
      if (globalCount >= globalLimit) return 'global_limit';
      rec.dailyCount = codeCount + 1;
      rec.countDate = today;
      data.usage[today] = globalCount + 1;
      await this.save(data);
      return 'ok';
    });
  }

  create(rec: Omit<InviteRecord, 'dailyCount' | 'countDate'>): Promise<void> {
    return this.run(async () => {
      const data = await this.load();
      data.invites[rec.code] = { ...rec, dailyCount: 0, countDate: '' };
      await this.save(data);
    });
  }

  setActive(code: string, active: boolean): Promise<void> {
    return this.run(async () => {
      const data = await this.load();
      const rec = data.invites[code];
      if (!rec) return;
      rec.active = active;
      await this.save(data);
    });
  }

  list(): Promise<InviteRecord[]> {
    return this.run(async () => Object.values((await this.load()).invites).map((r) => ({ ...r })));
  }
}
