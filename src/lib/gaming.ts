import type { Player, Zone } from '@/db/types';

export interface ZoneSummary {
  totalGames: number;
  activeZones: number;
  zoneCount: number;
  topZone: Pick<Zone, 'id' | 'name' | 'gamesToday'> | null;
}

/**
 * Returns a new list with one zone's count shifted by `delta`, never below zero.
 * With a playerId the change is credited to that player; otherwise to "unassigned".
 * Used for optimistic UI so a tap feels instant while the write lands in SQLite.
 */
export function applyIncrement(
  zones: readonly Zone[],
  zoneId: number,
  delta = 1,
  playerId: number | null = null,
): Zone[] {
  return zones.map((zone) => {
    if (zone.id !== zoneId) return zone;

    if (playerId === null) {
      const unassignedToday = Math.max(0, zone.unassignedToday + delta);
      const applied = unassignedToday - zone.unassignedToday;
      return { ...zone, unassignedToday, gamesToday: zone.gamesToday + applied };
    }

    const player = zone.players.find((p) => p.id === playerId);
    if (!player) return zone;
    const playerGames = Math.max(0, player.gamesToday + delta);
    const applied = playerGames - player.gamesToday;
    return {
      ...zone,
      gamesToday: zone.gamesToday + applied,
      players: zone.players.map((p) => (p.id === playerId ? { ...p, gamesToday: playerGames } : p)),
    };
  });
}

/** Share of a zone's games a player accounts for, 0..1. */
export function playerShare(player: Player, zone: Zone): number {
  return zone.gamesToday === 0 ? 0 : player.gamesToday / zone.gamesToday;
}

export function summarizeZones(zones: readonly Zone[]): ZoneSummary {
  let totalGames = 0;
  let activeZones = 0;
  let top: Zone | null = null;

  for (const zone of zones) {
    totalGames += zone.gamesToday;
    if (zone.gamesToday > 0) activeZones++;
    if (zone.gamesToday > 0 && (top === null || zone.gamesToday > top.gamesToday)) top = zone;
  }

  return {
    totalGames,
    activeZones,
    zoneCount: zones.length,
    topZone: top ? { id: top.id, name: top.name, gamesToday: top.gamesToday } : null,
  };
}

/** Share of today's games a zone accounts for, 0..1. */
export function zoneShare(zone: Zone, totalGames: number): number {
  return totalGames === 0 ? 0 : zone.gamesToday / totalGames;
}

/** Picks the lowest "Station N" name not already taken, so deleted numbers get reused. */
export function nextZoneName(zones: readonly Pick<Zone, 'name'>[]): string {
  const taken = new Set(zones.map((z) => z.name.trim().toLowerCase()));
  let n = 1;
  while (taken.has(`station ${n}`)) n++;
  return `Station ${n}`;
}
