import type { Player, Zone } from '@/db/types';

import { applyIncrement, nextZoneName, playerShare, summarizeZones, zoneShare } from '../gaming';

const zone = (id: number, gamesToday: number, name = `Station ${id}`): Zone => ({
  id,
  name,
  currentGame: null,
  position: id,
  gamesToday,
  players: [],
  unassignedToday: gamesToday,
});

const player = (id: number, zoneId: number, gamesToday: number): Player => ({
  id,
  zoneId,
  name: `P${id}`,
  position: id,
  gamesToday,
});

/** Zone 1 with Abel (10) on 3 games and Sami (11) on 1, plus 2 unassigned = 6 total. */
const withPlayers = (): Zone => ({
  ...zone(1, 6),
  players: [player(10, 1, 3), player(11, 1, 1)],
  unassignedToday: 2,
});

describe('applyIncrement', () => {
  it('increments only the targeted zone', () => {
    const zones = [zone(1, 0), zone(2, 3)];
    const next = applyIncrement(zones, 2);
    expect(next.map((z) => z.gamesToday)).toEqual([0, 4]);
  });

  it('does not mutate the input list', () => {
    const zones = [zone(1, 2)];
    applyIncrement(zones, 1);
    expect(zones[0]?.gamesToday).toBe(2);
  });

  it('supports undo with a negative delta and clamps at zero', () => {
    const zones = [zone(1, 1)];
    const once = applyIncrement(zones, 1, -1);
    expect(once[0]?.gamesToday).toBe(0);
    expect(applyIncrement(once, 1, -1)[0]?.gamesToday).toBe(0);
  });

  it('accumulates over repeated taps', () => {
    let zones = [zone(1, 0)];
    for (let i = 0; i < 12; i++) zones = applyIncrement(zones, 1);
    expect(zones[0]?.gamesToday).toBe(12);
  });

  it('ignores unknown zone ids', () => {
    const zones = [zone(1, 5)];
    expect(applyIncrement(zones, 99)).toEqual(zones);
  });
});

describe('applyIncrement with players', () => {
  it('credits the player and the zone total together', () => {
    const [next] = applyIncrement([withPlayers()], 1, 1, 10);
    expect(next?.gamesToday).toBe(7);
    expect(next?.players.map((p) => p.gamesToday)).toEqual([4, 1]);
    expect(next?.unassignedToday).toBe(2);
  });

  it('adds to unassigned when no player is given', () => {
    const [next] = applyIncrement([withPlayers()], 1, 1);
    expect(next?.gamesToday).toBe(7);
    expect(next?.unassignedToday).toBe(3);
    expect(next?.players.map((p) => p.gamesToday)).toEqual([3, 1]);
  });

  it("removes a player's game and never takes a player below zero", () => {
    let zones = [withPlayers()];
    zones = applyIncrement(zones, 1, -1, 11);
    zones = applyIncrement(zones, 1, -1, 11);
    expect(zones[0]?.players[1]?.gamesToday).toBe(0);
    // Only one game was really removed, so the total only drops by one.
    expect(zones[0]?.gamesToday).toBe(5);
  });

  it('keeps the zone total equal to players plus unassigned', () => {
    let zones = [withPlayers()];
    zones = applyIncrement(zones, 1, 1, 10);
    zones = applyIncrement(zones, 1, 1, 11);
    zones = applyIncrement(zones, 1, 1);
    const z = zones[0]!;
    const credited = z.players.reduce((sum, p) => sum + p.gamesToday, 0);
    expect(z.gamesToday).toBe(credited + z.unassignedToday);
  });

  it('ignores a player that is not on the zone', () => {
    const zones = [withPlayers()];
    expect(applyIncrement(zones, 1, 1, 999)).toEqual(zones);
  });
});

describe('playerShare', () => {
  it("is the player's fraction of the zone's games", () => {
    const z = withPlayers();
    expect(playerShare(z.players[0]!, z)).toBe(0.5);
    expect(playerShare(player(1, 1, 0), zone(1, 0))).toBe(0);
  });
});

describe('summarizeZones', () => {
  it('totals games and counts zones that have been played', () => {
    const summary = summarizeZones([zone(1, 4), zone(2, 0), zone(3, 7)]);
    expect(summary).toEqual({
      totalGames: 11,
      activeZones: 2,
      zoneCount: 3,
      topZone: { id: 3, name: 'Station 3', gamesToday: 7 },
    });
  });

  it('has no top zone before anything is played', () => {
    expect(summarizeZones([zone(1, 0), zone(2, 0)]).topZone).toBeNull();
    expect(summarizeZones([]).totalGames).toBe(0);
  });

  it('keeps the first zone on a tie', () => {
    expect(summarizeZones([zone(1, 3), zone(2, 3)]).topZone?.id).toBe(1);
  });
});

describe('zoneShare', () => {
  it('is the fraction of total games', () => {
    expect(zoneShare(zone(1, 3), 12)).toBe(0.25);
    expect(zoneShare(zone(1, 0), 0)).toBe(0);
  });
});

describe('nextZoneName', () => {
  it('fills the lowest free number', () => {
    expect(nextZoneName([])).toBe('Station 1');
    expect(nextZoneName([zone(1, 0), zone(2, 0)])).toBe('Station 3');
    expect(nextZoneName([zone(1, 0), zone(3, 0)])).toBe('Station 2');
  });

  it('ignores custom-named zones', () => {
    expect(nextZoneName([zone(1, 0, 'VIP Lounge')])).toBe('Station 1');
  });
});
