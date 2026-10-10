/**
 * @jest-environment node
 */
import { createTestDatabase } from '@/test/sqljsDatabase';

import { DEFAULT_SCOOTER_COUNT, DEFAULT_ZONE_COUNT, migrate } from '../schema';
import type { Database } from '../types';
import {
  addZone,
  decrementZone,
  deleteZone,
  incrementZone,
  listZones,
  resetZoneToday,
  updateZone,
  zoneTitleBreakdown,
} from '../zonesRepo';
import { dayKey } from '@/lib/time';

const TODAY = new Date(2026, 9, 10, 15, 0).getTime();
const YESTERDAY = new Date(2026, 9, 9, 22, 0).getTime();

let db: Database;

beforeEach(async () => {
  db = await createTestDatabase();
  await migrate(db);
});

describe('migrate', () => {
  it('seeds default zones and scooters on first run', async () => {
    expect(await listZones(db)).toHaveLength(DEFAULT_ZONE_COUNT);
    const scooters = await db.getAllAsync('SELECT id FROM scooters');
    expect(scooters).toHaveLength(DEFAULT_SCOOTER_COUNT);
  });

  it('is idempotent and does not reseed', async () => {
    await migrate(db);
    await migrate(db);
    expect(await listZones(db)).toHaveLength(DEFAULT_ZONE_COUNT);
  });
});

describe('zones repository', () => {
  it('saves and retrieves a new zone at the end of the grid', async () => {
    const id = await addZone(db, '  VIP Lounge  ', TODAY);
    const zones = await listZones(db, dayKey(TODAY));
    const last = zones[zones.length - 1];
    expect(last).toEqual({
      id,
      name: 'VIP Lounge',
      currentGame: null,
      position: DEFAULT_ZONE_COUNT + 1,
      gamesToday: 0,
    });
  });

  it('supports growing past 12 sections', async () => {
    for (let i = 0; i < 10; i++) await addZone(db, `Extra ${i}`, TODAY);
    expect(await listZones(db)).toHaveLength(DEFAULT_ZONE_COUNT + 10);
  });

  it('persists edited details and trims empty titles to null', async () => {
    await updateZone(db, 1, { name: 'Zone A', currentGame: ' EA FC 26 ' });
    let [first] = await listZones(db);
    expect(first?.name).toBe('Zone A');
    expect(first?.currentGame).toBe('EA FC 26');

    await updateZone(db, 1, { name: 'Zone A', currentGame: '   ' });
    [first] = await listZones(db);
    expect(first?.currentGame).toBeNull();
  });

  it('increments the game count for one zone only', async () => {
    await incrementZone(db, 2, TODAY);
    await incrementZone(db, 2, TODAY + 1000);
    await incrementZone(db, 3, TODAY);

    const zones = await listZones(db, dayKey(TODAY));
    const counts = Object.fromEntries(zones.map((z) => [z.id, z.gamesToday]));
    expect(counts[1]).toBe(0);
    expect(counts[2]).toBe(2);
    expect(counts[3]).toBe(1);
  });

  it('only counts games from the requested day', async () => {
    await incrementZone(db, 1, YESTERDAY);
    await incrementZone(db, 1, TODAY);
    const [zone] = await listZones(db, dayKey(TODAY));
    expect(zone?.gamesToday).toBe(1);
  });

  it('tags each play with the title set at the time', async () => {
    await updateZone(db, 1, { name: 'Zone 1', currentGame: 'Tekken 8' });
    await incrementZone(db, 1, TODAY);
    await incrementZone(db, 1, TODAY + 1);
    await updateZone(db, 1, { name: 'Zone 1', currentGame: 'EA FC 26' });
    await incrementZone(db, 1, TODAY + 2);

    expect(await zoneTitleBreakdown(db, 1, dayKey(TODAY))).toEqual([
      { title: 'Tekken 8', plays: 2 },
      { title: 'EA FC 26', plays: 1 },
    ]);
  });

  it('undoes the latest play and stops at zero', async () => {
    await incrementZone(db, 1, TODAY);
    await incrementZone(db, 1, TODAY + 1);
    await decrementZone(db, 1, TODAY + 2);
    expect((await listZones(db, dayKey(TODAY)))[0]?.gamesToday).toBe(1);

    await decrementZone(db, 1, TODAY + 3);
    await decrementZone(db, 1, TODAY + 4);
    expect((await listZones(db, dayKey(TODAY)))[0]?.gamesToday).toBe(0);
  });

  it('does not let undo remove plays from a previous day', async () => {
    await incrementZone(db, 1, YESTERDAY);
    await decrementZone(db, 1, TODAY);
    expect((await listZones(db, dayKey(YESTERDAY)))[0]?.gamesToday).toBe(1);
  });

  it('resets today without touching history', async () => {
    await incrementZone(db, 1, YESTERDAY);
    await incrementZone(db, 1, TODAY);
    await incrementZone(db, 1, TODAY);
    await resetZoneToday(db, 1, TODAY);

    expect((await listZones(db, dayKey(TODAY)))[0]?.gamesToday).toBe(0);
    expect((await listZones(db, dayKey(YESTERDAY)))[0]?.gamesToday).toBe(1);
  });

  it('deletes a zone along with its plays', async () => {
    await incrementZone(db, 1, TODAY);
    await deleteZone(db, 1);
    const zones = await listZones(db, dayKey(TODAY));
    expect(zones.find((z) => z.id === 1)).toBeUndefined();
    expect(await db.getAllAsync('SELECT id FROM game_plays WHERE zone_id = 1')).toHaveLength(0);
  });
});
