/** @jest-environment node */
import { createTestDb } from './testing/sqljsDb';
import { migrate } from './migrations';

describe('migrate', () => {
  it('can run twice and leaves user_version at 1', async () => {
    const db = await createTestDb();
    await migrate(db);
    await migrate(db);
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(1);
  });
});
