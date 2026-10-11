import type { Database } from './types';

export const DATABASE_NAME = 'playtracker.db';
export const SCHEMA_VERSION = 2;

export const DEFAULT_ZONE_COUNT = 6;
export const DEFAULT_SCOOTER_COUNT = 4;

/**
 * Brings the database up to SCHEMA_VERSION one step at a time, tracked with
 * PRAGMA user_version, so existing installs upgrade without losing data.
 */
export async function migrate(db: Database): Promise<void> {
  // foreign_keys is per-connection in SQLite, so it must be set on every open.
  await db.execAsync('PRAGMA foreign_keys = ON');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version < 1) {
    await createBaseSchema(db);
    version = 1;
  }
  if (version < 2) {
    await addPlayers(db);
    version = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${version}`);
}

async function createBaseSchema(db: Database): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      current_game TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS game_plays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
      game_title TEXT,
      day TEXT NOT NULL,
      played_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_game_plays_day_zone ON game_plays(day, zone_id);

    CREATE TABLE IF NOT EXISTS scooters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      started_at INTEGER,
      allocated_minutes INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS scooter_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scooter_id INTEGER NOT NULL REFERENCES scooters(id) ON DELETE CASCADE,
      day TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER NOT NULL,
      allocated_minutes INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_scooter_sessions_day ON scooter_sessions(day);
  `);

  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (let i = 1; i <= DEFAULT_ZONE_COUNT; i++) {
      await db.runAsync(
        'INSERT INTO zones (name, current_game, position, created_at) VALUES (?, NULL, ?, ?)',
        `Zone ${i}`,
        i,
        now,
      );
    }
    for (let i = 1; i <= DEFAULT_SCOOTER_COUNT; i++) {
      await db.runAsync(
        'INSERT INTO scooters (name, started_at, allocated_minutes, position) VALUES (?, NULL, 0, ?)',
        `Scooter ${i}`,
        i,
      );
    }
  });
}

/** v2: optional named players per zone; each play can be credited to one. */
async function addPlayers(db: Database): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS zone_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_zone_players_zone ON zone_players(zone_id);

    ALTER TABLE game_plays ADD COLUMN player_id INTEGER REFERENCES zone_players(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_game_plays_player ON game_plays(player_id);
  `);
}
