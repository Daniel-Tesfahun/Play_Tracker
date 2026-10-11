/**
 * @jest-environment node
 */
import { createTestDatabase } from '@/test/sqljsDatabase';

import { DEFAULT_SCOOTER_COUNT, DEFAULT_ZONE_COUNT, migrate, SCHEMA_VERSION } from '../schema';
import type { Database } from '../types';
import {
  addPlayer,
  addZone,
  decrementPlayer,
  decrementZone,
  deleteZone,
  incrementZone,
  listZones,
  MAX_PLAYERS_PER_ZONE,
  removePlayer,
  renamePlayer,
  resetAllZonesToday,
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
  it('seeds default stations and scooters on first run', async () => {
    const zones = await listZones(db);
    expect(zones).toHaveLength(DEFAULT_ZONE_COUNT);
    expect(zones[0]?.name).toBe('Station 1');
    const scooters = await db.getAllAsync('SELECT id FROM scooters');
    expect(scooters).toHaveLength(DEFAULT_SCOOTER_COUNT);
  });

  it('is idempotent and does not reseed', async () => {
    await migrate(db);
    await migrate(db);
    expect(await listZones(db)).toHaveLength(DEFAULT_ZONE_COUNT);
  });

  it('upgrades a v1 database without losing games', async () => {
    const old = await createTestDatabase();
    // The exact v1 shape that shipped before players existed.
    await old.execAsync(`
      CREATE TABLE zones (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
        current_game TEXT, position INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
      CREATE TABLE game_plays (id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
        game_title TEXT, day TEXT NOT NULL, played_at INTEGER NOT NULL);
      CREATE TABLE scooters (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
        started_at INTEGER, allocated_minutes INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE scooter_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT,
        scooter_id INTEGER NOT NULL REFERENCES scooters(id) ON DELETE CASCADE, day TEXT NOT NULL,
        started_at INTEGER NOT NULL, ended_at INTEGER NOT NULL, allocated_minutes INTEGER NOT NULL);
      INSERT INTO zones (name, position, created_at) VALUES ('Zone 1', 1, 0);
      INSERT INTO zones (name, position, created_at) VALUES ('VIP Zone', 2, 0);
      INSERT INTO zones (name, position, created_at) VALUES ('Zone 12b', 3, 0);
      INSERT INTO game_plays (zone_id, game_title, day, played_at)
        VALUES (1, 'Tekken 8', '${dayKey(TODAY)}', ${TODAY});
      PRAGMA user_version = 1;
    `);

    await migrate(old);

    const version = await old.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(version?.user_version).toBe(SCHEMA_VERSION);
    const [zone] = await listZones(old, dayKey(TODAY));
    expect(zone).toMatchObject({ gamesToday: 1, unassignedToday: 1, players: [] });
    // v3 renamed the untouched default name, but left custom names alone.
    expect((await listZones(old, dayKey(TODAY))).map((z) => z.name)).toEqual(['Station 1', 'VIP Zone', 'Zone 12b']);

    const scooterCols = await old.getAllAsync<{ name: string }>('PRAGMA table_info(scooters)');
    expect(scooterCols.map((c) => c.name)).toEqual(expect.arrayContaining(['paused_at', 'paused_ms']));

    const playerId = await addPlayer(old, 1, 'Abel', TODAY);
    await incrementZone(old, 1, TODAY + 1, playerId);
    expect((await listZones(old, dayKey(TODAY)))[0]?.players[0]?.gamesToday).toBe(1);
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
      players: [],
      unassignedToday: 0,
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

  it('resets today on every zone at once and keeps earlier days', async () => {
    await incrementZone(db, 1, TODAY);
    await incrementZone(db, 2, TODAY);
    await incrementZone(db, 3, YESTERDAY);
    await resetAllZonesToday(db, TODAY);

    expect((await listZones(db, dayKey(TODAY))).every((z) => z.gamesToday === 0)).toBe(true);
    expect((await listZones(db, dayKey(YESTERDAY))).find((z) => z.id === 3)?.gamesToday).toBe(1);
  });

  it('deletes a zone along with its plays and players', async () => {
    await addPlayer(db, 1, 'Abel', TODAY);
    await incrementZone(db, 1, TODAY);
    await deleteZone(db, 1);
    expect(await db.getAllAsync('SELECT id FROM zone_players WHERE zone_id = 1')).toHaveLength(0);
    const zones = await listZones(db, dayKey(TODAY));
    expect(zones.find((z) => z.id === 1)).toBeUndefined();
    expect(await db.getAllAsync('SELECT id FROM game_plays WHERE zone_id = 1')).toHaveLength(0);
  });
});

describe('zone players', () => {
  const today = () => listZones(db, dayKey(TODAY));
  const zoneOne = async () => (await today()).find((z) => z.id === 1)!;

  it('adds players in order and starts them at zero', async () => {
    await addPlayer(db, 1, ' Abel ', TODAY);
    await addPlayer(db, 1, 'Sami', TODAY);
    const z = await zoneOne();
    expect(z.players.map((p) => [p.name, p.gamesToday])).toEqual([
      ['Abel', 0],
      ['Sami', 0],
    ]);
  });

  it('keeps players on their own zone', async () => {
    await addPlayer(db, 1, 'Abel', TODAY);
    await addPlayer(db, 2, 'Sami', TODAY);
    const zones = await today();
    expect(zones.find((z) => z.id === 1)?.players.map((p) => p.name)).toEqual(['Abel']);
    expect(zones.find((z) => z.id === 2)?.players.map((p) => p.name)).toEqual(['Sami']);
  });

  it("splits the zone's count across players, with the rest unassigned", async () => {
    const abel = await addPlayer(db, 1, 'Abel', TODAY);
    const sami = await addPlayer(db, 1, 'Sami', TODAY);
    await incrementZone(db, 1, TODAY + 1, abel);
    await incrementZone(db, 1, TODAY + 2, abel);
    await incrementZone(db, 1, TODAY + 3, sami);
    await incrementZone(db, 1, TODAY + 4);

    const z = await zoneOne();
    expect(z.gamesToday).toBe(4);
    expect(z.players.map((p) => p.gamesToday)).toEqual([2, 1]);
    expect(z.unassignedToday).toBe(1);
  });

  it("refuses to credit another zone's player", async () => {
    const other = await addPlayer(db, 2, 'Sami', TODAY);
    await incrementZone(db, 1, TODAY, other);
    expect((await zoneOne()).gamesToday).toBe(0);
  });

  it("undoes only that player's latest game", async () => {
    const abel = await addPlayer(db, 1, 'Abel', TODAY);
    const sami = await addPlayer(db, 1, 'Sami', TODAY);
    await incrementZone(db, 1, TODAY + 1, abel);
    await incrementZone(db, 1, TODAY + 2, sami);
    await decrementPlayer(db, abel, TODAY + 3);
    await decrementPlayer(db, abel, TODAY + 4);

    const z = await zoneOne();
    expect(z.players.map((p) => p.gamesToday)).toEqual([0, 1]);
    expect(z.gamesToday).toBe(1);
  });

  it('renames a player', async () => {
    const abel = await addPlayer(db, 1, 'Abel', TODAY);
    await renamePlayer(db, abel, ' Abel K ');
    expect((await zoneOne()).players[0]?.name).toBe('Abel K');
  });

  it('removing a player keeps their games on the zone as unassigned', async () => {
    const abel = await addPlayer(db, 1, 'Abel', TODAY);
    await incrementZone(db, 1, TODAY, abel);
    await incrementZone(db, 1, TODAY + 1, abel);
    await removePlayer(db, abel);

    const z = await zoneOne();
    expect(z.players).toHaveLength(0);
    expect(z.gamesToday).toBe(2);
    expect(z.unassignedToday).toBe(2);
  });

  it(`caps a zone at ${MAX_PLAYERS_PER_ZONE} players`, async () => {
    for (let i = 0; i < MAX_PLAYERS_PER_ZONE; i++) await addPlayer(db, 1, `P${i}`, TODAY);
    await expect(addPlayer(db, 1, 'One too many', TODAY)).rejects.toThrow('at most');
  });

  it('resetting a zone clears player counts but keeps the players', async () => {
    const abel = await addPlayer(db, 1, 'Abel', TODAY);
    await incrementZone(db, 1, TODAY, abel);
    await resetZoneToday(db, 1, TODAY);
    const z = await zoneOne();
    expect(z.players).toHaveLength(1);
    expect(z.players[0]?.gamesToday).toBe(0);
  });
});
