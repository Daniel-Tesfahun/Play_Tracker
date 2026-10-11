/**
 * The subset of expo-sqlite's SQLiteDatabase that the repositories rely on.
 * Typing against this (rather than the concrete class) lets the Jest suite run
 * the exact same SQL against an in-memory sql.js database.
 */
export type SQLiteBindValue = string | number | null;

export interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface Database {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: SQLiteBindValue[]): Promise<RunResult>;
  getAllAsync<T>(source: string, ...params: SQLiteBindValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, ...params: SQLiteBindValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export interface Player {
  id: number;
  zoneId: number;
  name: string;
  position: number;
  gamesToday: number;
}

export interface Zone {
  id: number;
  name: string;
  currentGame: string | null;
  position: number;
  /** All games logged on the zone today, with or without a player. */
  gamesToday: number;
  players: Player[];
  /** Games today not credited to any player (zone +1, or a player who was removed). */
  unassignedToday: number;
}

export interface Scooter {
  id: number;
  name: string;
  /** Epoch ms when the running session started; null while idle. */
  startedAt: number | null;
  /** Minutes pre-allocated via the quick-add bubbles; 0 means open-ended (count up). */
  allocatedMinutes: number;
  position: number;
}

export interface ScooterDayStats {
  sessionsToday: number;
  minutesToday: number;
}
