import type { ConsumeResult, InviteRecord, InviteStore } from './store.js';

export class MemoryInviteStore implements InviteStore {
  private readonly invites = new Map<string, InviteRecord>();
  private readonly usage = new Map<string, number>();

  async get(code: string): Promise<InviteRecord | null> {
    const r = this.invites.get(code);
    return r ? { ...r } : null;
  }

  async consume(code: string, today: string, perCodeLimit: number, globalLimit: number): Promise<ConsumeResult> {
    const rec = this.invites.get(code);
    if (!rec) return 'code_limit';
    const codeCount = rec.countDate === today ? rec.dailyCount : 0;
    const globalCount = this.usage.get(today) ?? 0;
    if (codeCount >= perCodeLimit) return 'code_limit';
    if (globalCount >= globalLimit) return 'global_limit';
    rec.dailyCount = codeCount + 1;
    rec.countDate = today;
    this.usage.set(today, globalCount + 1);
    return 'ok';
  }

  async create(rec: Omit<InviteRecord, 'dailyCount' | 'countDate'>): Promise<void> {
    this.invites.set(rec.code, { ...rec, dailyCount: 0, countDate: '' });
  }

  async setActive(code: string, active: boolean): Promise<void> {
    const rec = this.invites.get(code);
    if (rec) rec.active = active;
  }

  async list(): Promise<InviteRecord[]> {
    return [...this.invites.values()].map((r) => ({ ...r }));
  }
}
