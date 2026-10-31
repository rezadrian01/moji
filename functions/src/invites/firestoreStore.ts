import { Firestore } from '@google-cloud/firestore';
import type { ConsumeResult, InviteRecord, InviteStore } from './store.js';

// Behaviour is verified through MemoryInviteStore (same InviteStore contract,
// covered by guard.test.ts); this class is not unit-tested.
// Collections: invites/{code}, usage/{YYYY-MM-DD} {count}.
export class FirestoreInviteStore implements InviteStore {
  constructor(private readonly db: Firestore = new Firestore()) {}

  private toRecord(code: string, d: FirebaseFirestore.DocumentData | undefined): InviteRecord | null {
    if (!d) return null;
    return {
      code,
      active: d.active === true,
      label: typeof d.label === 'string' ? d.label : null,
      createdAt: String(d.createdAt ?? ''),
      dailyCount: Number(d.dailyCount ?? 0),
      countDate: String(d.countDate ?? ''),
    };
  }

  async get(code: string): Promise<InviteRecord | null> {
    const snap = await this.db.collection('invites').doc(code).get();
    return this.toRecord(code, snap.data());
  }

  async consume(code: string, today: string, perCodeLimit: number, globalLimit: number): Promise<ConsumeResult> {
    const inviteRef = this.db.collection('invites').doc(code);
    const usageRef = this.db.collection('usage').doc(today);
    return this.db.runTransaction(async (tx) => {
      const [inviteSnap, usageSnap] = await Promise.all([tx.get(inviteRef), tx.get(usageRef)]);
      const d = inviteSnap.data();
      if (!d) return 'code_limit';
      const codeCount = d.countDate === today ? Number(d.dailyCount ?? 0) : 0;
      const globalCount = Number(usageSnap.data()?.count ?? 0);
      if (codeCount >= perCodeLimit) return 'code_limit';
      if (globalCount >= globalLimit) return 'global_limit';
      tx.update(inviteRef, { dailyCount: codeCount + 1, countDate: today });
      tx.set(usageRef, { count: globalCount + 1 }, { merge: true });
      return 'ok';
    });
  }

  async create(rec: Omit<InviteRecord, 'dailyCount' | 'countDate'>): Promise<void> {
    await this.db.collection('invites').doc(rec.code).set({
      active: rec.active,
      label: rec.label,
      createdAt: rec.createdAt,
      dailyCount: 0,
      countDate: '',
    });
  }

  async setActive(code: string, active: boolean): Promise<void> {
    await this.db.collection('invites').doc(code).update({ active });
  }

  async list(): Promise<InviteRecord[]> {
    const snap = await this.db.collection('invites').get();
    return snap.docs.flatMap((doc) => {
      const r = this.toRecord(doc.id, doc.data());
      return r ? [r] : [];
    });
  }
}
