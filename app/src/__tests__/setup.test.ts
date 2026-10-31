/* eslint-disable @typescript-eslint/no-require-imports */
describe('jest setup', () => {
  it('sql.js bisa membuat DB in-memory dan menjalankan SELECT 1', async () => {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const res = db.exec('SELECT 1 AS x');
    expect(res[0].values[0][0]).toBe(1);
    db.close();
  });

  it('expo-secure-store adalah mock jest', () => {
    const store = require('expo-secure-store');
    expect(jest.isMockFunction(store.getItemAsync)).toBe(true);
  });
});
