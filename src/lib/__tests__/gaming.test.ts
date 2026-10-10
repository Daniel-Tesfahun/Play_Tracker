import type { Zone } from '@/db/types';

import { applyIncrement, nextZoneName, summarizeZones, zoneShare } from '../gaming';

const zone = (id: number, gamesToday: number, name = `Zone ${id}`): Zone => ({
  id,
  name,
  currentGame: null,
  position: id,
  gamesToday,
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

describe('summarizeZones', () => {
  it('totals games and counts zones that have been played', () => {
    const summary = summarizeZones([zone(1, 4), zone(2, 0), zone(3, 7)]);
    expect(summary).toEqual({
      totalGames: 11,
      activeZones: 2,
      zoneCount: 3,
      topZone: { id: 3, name: 'Zone 3', gamesToday: 7 },
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
    expect(nextZoneName([])).toBe('Zone 1');
    expect(nextZoneName([zone(1, 0), zone(2, 0)])).toBe('Zone 3');
    expect(nextZoneName([zone(1, 0), zone(3, 0)])).toBe('Zone 2');
  });

  it('ignores custom-named zones', () => {
    expect(nextZoneName([zone(1, 0, 'VIP Lounge')])).toBe('Zone 1');
  });
});
