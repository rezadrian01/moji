import { resolve } from 'node:path';
import { FileInviteStore } from './fileStore.js';
import { FirestoreInviteStore } from './firestoreStore.js';
import type { InviteStore } from './store.js';

/** MOJI_STORE=file (default, local demo) | firestore (Cloud Run deployment). */
export function createInviteStore(env: NodeJS.ProcessEnv): InviteStore {
  const kind = env.MOJI_STORE?.trim() || 'file';
  if (kind === 'file') return new FileInviteStore(resolve(env.MOJI_INVITES_FILE?.trim() || 'data/invites.json'));
  if (kind === 'firestore') return new FirestoreInviteStore();
  throw new Error(`MOJI_STORE must be "file" or "firestore" (got "${kind}")`);
}
