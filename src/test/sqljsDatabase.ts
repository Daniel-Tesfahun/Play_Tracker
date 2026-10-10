import initSqlJs from 'sql.js';

import type { Database, SQLiteBindValue } from '@/db/types';

/**
 * In-memory SQLite (sql.js / WebAssembly) wrapped in the same async interface
 * as expo-sqlite, so repository tests execute the real SQL the app ships.
 */
export async function createTestDatabase(): Promise<Database> {
  const SQL = await initSqlJs();
  const raw = new SQL.Database();

  const all = <T>(source: string, params: SQLiteBindValue[]): T[] => {
    const stmt = raw.prepare(source);
    try {
      stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  };

  return {
    async execAsync(source) {
      raw.exec(source);
    },
    async runAsync(source, ...params) {
      raw.run(source, params);
      const changes = raw.getRowsModified();
      const id = raw.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0];
      return { changes, lastInsertRowId: Number(id ?? 0) };
    },
    async getAllAsync<T>(source: string, ...params: SQLiteBindValue[]) {
      return all<T>(source, params);
    },
    async getFirstAsync<T>(source: string, ...params: SQLiteBindValue[]) {
      return all<T>(source, params)[0] ?? null;
    },
    async withTransactionAsync(task) {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
