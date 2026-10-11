import { dayKey } from '@/lib/time';

import { placeholders } from './sql';
import type { Database, Player, Zone } from './types';

export const MAX_PLAYERS_PER_ZONE = 8;

type ZoneRow = Omit<Zone, 'players' | 'unassignedToday'>;

export async function listZones(db: Database, day = dayKey()): Promise<Zone[]> {
  const [zones, players] = await Promise.all([
    db.getAllAsync<ZoneRow>(
      `SELECT z.id, z.name, z.current_game AS currentGame, z.position,
              COUNT(p.id) AS gamesToday
         FROM zones z
         LEFT JOIN game_plays p ON p.zone_id = z.id AND p.day = ?
        GROUP BY z.id
        ORDER BY z.position, z.id`,
      day,
    ),
    db.getAllAsync<Player>(
      `SELECT pl.id, pl.zone_id AS zoneId, pl.name, pl.position,
              COUNT(gp.id) AS gamesToday
         FROM zone_players pl
         LEFT JOIN game_plays gp ON gp.player_id = pl.id AND gp.day = ?
        GROUP BY pl.id
        ORDER BY pl.position, pl.id`,
      day,
    ),
  ]);

  const byZone = new Map<number, Player[]>();
  for (const player of players) {
    const list = byZone.get(player.zoneId) ?? [];
    list.push(player);
    byZone.set(player.zoneId, list);
  }

  return zones.map((zone) => {
    const zonePlayers = byZone.get(zone.id) ?? [];
    const credited = zonePlayers.reduce((sum, p) => sum + p.gamesToday, 0);
    return { ...zone, players: zonePlayers, unassignedToday: zone.gamesToday - credited };
  });
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
    await db.runAsync('DELETE FROM zone_players WHERE zone_id = ?', zoneId);
    await db.runAsync('DELETE FROM zones WHERE id = ?', zoneId);
  });
}

/**
 * Records one game on a zone, tagged with the zone's current title.
 * Pass a playerId to credit it to a player; it must belong to the zone.
 */
export async function incrementZone(
  db: Database,
  zoneId: number,
  now = Date.now(),
  playerId: number | null = null,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO game_plays (zone_id, game_title, day, played_at, player_id)
     SELECT z.id, z.current_game, ?, ?, ?
       FROM zones z
      WHERE z.id = ?
        AND (? IS NULL OR EXISTS (SELECT 1 FROM zone_players WHERE id = ? AND zone_id = z.id))`,
    dayKey(now),
    now,
    playerId,
    zoneId,
    playerId,
    playerId,
  );
}

/** Removes the most recent game logged today on a zone, whoever it was credited to. */
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

/** Removes a player's most recent game today. No-op at zero. */
export async function decrementPlayer(db: Database, playerId: number, now = Date.now()): Promise<void> {
  await db.runAsync(
    `DELETE FROM game_plays WHERE id = (
       SELECT id FROM game_plays WHERE player_id = ? AND day = ?
        ORDER BY played_at DESC, id DESC LIMIT 1
     )`,
    playerId,
    dayKey(now),
  );
}

export async function resetZoneToday(db: Database, zoneId: number, now = Date.now()): Promise<void> {
  await db.runAsync('DELETE FROM game_plays WHERE zone_id = ? AND day = ?', zoneId, dayKey(now));
}

/** Clears today's games on every zone. Earlier days are kept. */
export async function resetAllZonesToday(db: Database, now = Date.now()): Promise<void> {
  await db.runAsync('DELETE FROM game_plays WHERE day = ?', dayKey(now));
}

export async function addPlayer(
  db: Database,
  zoneId: number,
  name: string,
  now = Date.now(),
): Promise<number> {
  const stats = await db.getFirstAsync<{ count: number; maxPos: number | null }>(
    'SELECT COUNT(*) AS count, MAX(position) AS maxPos FROM zone_players WHERE zone_id = ?',
    zoneId,
  );
  if ((stats?.count ?? 0) >= MAX_PLAYERS_PER_ZONE) {
    throw new Error(`A station can have at most ${MAX_PLAYERS_PER_ZONE} players`);
  }
  const result = await db.runAsync(
    'INSERT INTO zone_players (zone_id, name, position, created_at) VALUES (?, ?, ?, ?)',
    zoneId,
    name.trim(),
    (stats?.maxPos ?? 0) + 1,
    now,
  );
  return result.lastInsertRowId;
}

export async function renamePlayer(db: Database, playerId: number, name: string): Promise<void> {
  await db.runAsync('UPDATE zone_players SET name = ? WHERE id = ?', name.trim(), playerId);
}

/** Removes a player. Their games stay on the zone total as unassigned. */
export async function removePlayer(db: Database, playerId: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE game_plays SET player_id = NULL WHERE player_id = ?', playerId);
    await db.runAsync('DELETE FROM zone_players WHERE id = ?', playerId);
  });
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

// ---- Bulk actions (selection mode). Each is a no-op for an empty list.

/** Sets (or clears, with null/blank) the game title on several stations at once. */
export async function setZonesGame(db: Database, zoneIds: readonly number[], game: string | null): Promise<void> {
  if (zoneIds.length === 0) return;
  await db.runAsync(
    `UPDATE zones SET current_game = ? WHERE id IN (${placeholders(zoneIds)})`,
    game?.trim() || null,
    ...zoneIds,
  );
}

/** Clears today's games on the given stations. Earlier days are kept. */
export async function resetZonesToday(db: Database, zoneIds: readonly number[], now = Date.now()): Promise<void> {
  if (zoneIds.length === 0) return;
  await db.runAsync(
    `DELETE FROM game_plays WHERE day = ? AND zone_id IN (${placeholders(zoneIds)})`,
    dayKey(now),
    ...zoneIds,
  );
}

export async function deleteZones(db: Database, zoneIds: readonly number[]): Promise<void> {
  if (zoneIds.length === 0) return;
  const list = placeholders(zoneIds);
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM game_plays WHERE zone_id IN (${list})`, ...zoneIds);
    await db.runAsync(`DELETE FROM zone_players WHERE zone_id IN (${list})`, ...zoneIds);
    await db.runAsync(`DELETE FROM zones WHERE id IN (${list})`, ...zoneIds);
  });
}
