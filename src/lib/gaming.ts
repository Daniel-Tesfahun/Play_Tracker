import type { Zone } from '@/db/types';

export interface ZoneSummary {
  totalGames: number;
  activeZones: number;
  zoneCount: number;
  topZone: Pick<Zone, 'id' | 'name' | 'gamesToday'> | null;
}

/**
 * Returns a new list with one zone's count shifted by `delta`, never below zero.
 * Used for optimistic UI so a tap feels instant while the write lands in SQLite.
 */
export function applyIncrement(zones: readonly Zone[], zoneId: number, delta = 1): Zone[] {
  return zones.map((zone) =>
    zone.id === zoneId ? { ...zone, gamesToday: Math.max(0, zone.gamesToday + delta) } : zone,
  );
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

/** Picks the lowest "Zone N" name not already taken, so deleted numbers get reused. */
export function nextZoneName(zones: readonly Pick<Zone, 'name'>[]): string {
  const taken = new Set(zones.map((z) => z.name.trim().toLowerCase()));
  let n = 1;
  while (taken.has(`zone ${n}`)) n++;
  return `Zone ${n}`;
}
