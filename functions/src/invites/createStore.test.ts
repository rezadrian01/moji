import { describe, expect, it } from 'vitest';
import { createInviteStore } from './createStore.js';
import { FileInviteStore } from './fileStore.js';
import { FirestoreInviteStore } from './firestoreStore.js';

describe('createInviteStore', () => {
  it('defaults to the file store', () => {
    expect(createInviteStore({})).toBeInstanceOf(FileInviteStore);
  });
  it('MOJI_STORE=file uses the file store', () => {
    expect(createInviteStore({ MOJI_STORE: 'file', MOJI_INVITES_FILE: '/tmp/x/invites.json' })).toBeInstanceOf(FileInviteStore);
  });
  it('empty MOJI_STORE falls back to file', () => {
    expect(createInviteStore({ MOJI_STORE: '' })).toBeInstanceOf(FileInviteStore);
  });
  it('MOJI_STORE=firestore uses Firestore', () => {
    expect(createInviteStore({ MOJI_STORE: 'firestore', GOOGLE_CLOUD_PROJECT: 'p' })).toBeInstanceOf(FirestoreInviteStore);
  });
  it('rejects unknown values with a clear error', () => {
    expect(() => createInviteStore({ MOJI_STORE: 'redis' })).toThrow(/MOJI_STORE.*file.*firestore/);
  });
});
