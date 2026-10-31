export interface InviteRecord {
  code: string;
  active: boolean;
  label: string | null;
  createdAt: string;
  dailyCount: number;
  countDate: string;
}

export type ConsumeResult = 'ok' | 'code_limit' | 'global_limit';

export interface InviteStore {
  get(code: string): Promise<InviteRecord | null>;
  /** Atomic: reset the code's count if countDate != today; reject when a limit would be exceeded; otherwise increment code and global. */
  consume(code: string, today: string, perCodeLimit: number, globalLimit: number): Promise<ConsumeResult>;
  create(rec: Omit<InviteRecord, 'dailyCount' | 'countDate'>): Promise<void>;
  setActive(code: string, active: boolean): Promise<void>;
  list(): Promise<InviteRecord[]>;
}
