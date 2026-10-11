import type { SQLiteBindValue } from './types';

/** "?, ?, ?" for an IN (...) list of the given length. */
export function placeholders(values: readonly SQLiteBindValue[]): string {
  return values.map(() => '?').join(', ');
}
