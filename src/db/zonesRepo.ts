import { dayKey } from '@/lib/time';

import type { Database, Zone } from './types';

export async function listZones(db: Database, day = dayKey()): Promise<Zone[]> {
  return db.getAllAsync<Zone>(
    `SELECT z.id, z.name, z.current_game AS currentGame, z.position,
            COUNT(p.id) AS gamesToday
       FROM zones z
       LEFT JOIN game_plays p ON p.zone_id = z.id AND p.day = ?
      GROUP BY z.id
      ORDER BY z.position, z.id`,
    day,
  );
}

export async function addZone(db: Database, name: string, now = Date.now()): Promise<number> {
  const max = await db.getFirstAsync<{ maxPos: number | null }>(
    'SELECT MAX(position) AS maxPos FROM zones',
  );
  const result = await db.runAsync(
    'INSERT INTO zones (name, current_game, position, created_at) VALUES (?, NULL, ?, ?)',
    name.trim(),
    (max?.maxPos ?? 0) + 1,
    now,
  );
  return result.lastInsertRowId;
}

export async function updateZone(
  db: Database,
  zoneId: number,
  details: { name: string; currentGame: string | null },
): Promise<void> {
  const game = details.currentGame?.trim() || null;
  await db.runAsync(
    'UPDATE zones SET name = ?, current_game = ? WHERE id = ?',
    details.name.trim(),
    game,
    zoneId,
  );
}

export async function deleteZone(db: Database, zoneId: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM game_plays WHERE zone_id = ?', zoneId);
    await db.runAsync('DELETE FROM zones WHERE id = ?', zoneId);
  });
}

/** Records one game on a zone, tagged with whatever title the zone is currently set to. */
export async function incrementZone(db: Database, zoneId: number, now = Date.now()): Promise<void> {
  await db.runAsync(
    `INSERT INTO game_plays (zone_id, game_title, day, played_at)
     SELECT id, current_game, ?, ? FROM zones WHERE id = ?`,
    dayKey(now),
    now,
    zoneId,
  );
}

/** Removes the most recent game logged today on a zone (undo a mis-tap). No-op at zero. */
export async function decrementZone(db: Database, zoneId: number, now = Date.now()): Promise<void> {
  await db.runAsync(
    `DELETE FROM game_plays WHERE id = (
       SELECT id FROM game_plays WHERE zone_id = ? AND day = ?
        ORDER BY played_at DESC, id DESC LIMIT 1
     )`,
    zoneId,
    dayKey(now),
  );
}

export async function resetZoneToday(db: Database, zoneId: number, now = Date.now()): Promise<void> {
  await db.runAsync('DELETE FROM game_plays WHERE zone_id = ? AND day = ?', zoneId, dayKey(now));
}

/** Today's plays on a zone grouped by title, most played first. */
export async function zoneTitleBreakdown(
  db: Database,
  zoneId: number,
  day = dayKey(),
): Promise<{ title: string; plays: number }[]> {
  return db.getAllAsync<{ title: string; plays: number }>(
    `SELECT COALESCE(game_title, 'Untitled') AS title, COUNT(*) AS plays
       FROM game_plays WHERE zone_id = ? AND day = ?
      GROUP BY title ORDER BY plays DESC, title`,
    zoneId,
    day,
  );
}
