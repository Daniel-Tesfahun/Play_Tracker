/**
 * @jest-environment node
 */
import { MAX_ALLOCATED_MINUTES } from '@/lib/timer';
import { dayKey } from '@/lib/time';
import { createTestDatabase } from '@/test/sqljsDatabase';

import { migrate } from '../schema';
import {
  allocateMinutes,
  allocateMinutesMany,
  deleteScooters,
  getScooterDayStats,
  listScooters,
  pauseSession,
  pauseSessions,
  resetScooters,
  resumeSessions,
  startSession,
  startSessions,
  stopSessions,
} from '../scootersRepo';
import type { Database } from '../types';
import { addPlayer, deleteZones, incrementZone, listZones, resetZonesToday, setZonesGame } from '../zonesRepo';

const MIN = 60_000;
const T0 = new Date(2026, 9, 12, 15, 0).getTime();
let db: Database;

beforeEach(async () => {
  db = await createTestDatabase();
  await migrate(db);
});

const zonesById = async () => Object.fromEntries((await listZones(db, dayKey(T0))).map((z) => [z.id, z]));
const scootersById = async () => Object.fromEntries((await listScooters(db)).map((s) => [s.id, s]));

describe('bulk station actions', () => {
  it('sets one game title on several stations and can clear it', async () => {
    await setZonesGame(db, [1, 2], ' Tekken 8 ');
    let z = await zonesById();
    expect([z[1]?.currentGame, z[2]?.currentGame, z[3]?.currentGame]).toEqual(['Tekken 8', 'Tekken 8', null]);

    await setZonesGame(db, [1], '  ');
    z = await zonesById();
    expect(z[1]?.currentGame).toBeNull();
  });

  it("resets today's games on only the selected stations", async () => {
    await incrementZone(db, 1, T0);
    await incrementZone(db, 2, T0);
    await incrementZone(db, 3, T0);
    await resetZonesToday(db, [1, 3], T0);
    const z = await zonesById();
    expect([z[1]?.gamesToday, z[2]?.gamesToday, z[3]?.gamesToday]).toEqual([0, 1, 0]);
  });

  it('deletes several stations with their players and plays', async () => {
    await addPlayer(db, 1, 'Abel', T0);
    await incrementZone(db, 2, T0);
    await deleteZones(db, [1, 2]);
    const z = await zonesById();
    expect(z[1]).toBeUndefined();
    expect(z[2]).toBeUndefined();
    expect(z[3]).toBeDefined();
    expect(await db.getAllAsync('SELECT id FROM zone_players')).toHaveLength(0);
    expect(await db.getAllAsync('SELECT id FROM game_plays')).toHaveLength(0);
  });

  it('does nothing for an empty selection', async () => {
    await incrementZone(db, 1, T0);
    await resetZonesToday(db, [], T0);
    await deleteZones(db, []);
    await setZonesGame(db, [], 'X');
    expect((await zonesById())[1]?.gamesToday).toBe(1);
  });
});

describe('bulk scooter actions', () => {
  it('starts only the idle scooters and keeps running ones as they were', async () => {
    await startSession(db, 1, T0 - 10 * MIN);
    await startSessions(db, [1, 2, 3], T0);
    const s = await scootersById();
    expect(s[1]?.startedAt).toBe(T0 - 10 * MIN);
    expect(s[2]?.startedAt).toBe(T0);
    expect(s[3]?.startedAt).toBe(T0);
    expect(s[4]?.startedAt).toBeNull();
  });

  it('pauses running scooters and resumes paused ones', async () => {
    await startSessions(db, [1, 2], T0);
    await pauseSession(db, 1, T0 + MIN);
    await pauseSessions(db, [1, 2, 3], T0 + 2 * MIN);
    let s = await scootersById();
    expect(s[1]?.pausedAt).toBe(T0 + MIN); // already paused: unchanged
    expect(s[2]?.pausedAt).toBe(T0 + 2 * MIN);
    expect(s[3]?.pausedAt).toBeNull(); // idle: not paused

    await resumeSessions(db, [1, 2], T0 + 6 * MIN);
    s = await scootersById();
    expect([s[1]?.pausedAt, s[1]?.pausedMs]).toEqual([null, 5 * MIN]);
    expect([s[2]?.pausedAt, s[2]?.pausedMs]).toEqual([null, 4 * MIN]);
  });

  it('adds the same minutes to each selected scooter, capped at the maximum', async () => {
    await allocateMinutes(db, 2, MAX_ALLOCATED_MINUTES - 10);
    await allocateMinutesMany(db, [1, 2], 30);
    const s = await scootersById();
    expect(s[1]?.allocatedMinutes).toBe(30);
    expect(s[2]?.allocatedMinutes).toBe(MAX_ALLOCATED_MINUTES);
    expect(s[3]?.allocatedMinutes).toBe(0);
  });

  it('ends several rides, logging each one', async () => {
    await startSessions(db, [1, 2], T0);
    const billed = await stopSessions(db, [1, 2, 3], T0 + 10 * MIN);
    expect(billed).toBe(20);
    expect(await getScooterDayStats(db, dayKey(T0))).toEqual({ sessionsToday: 2, minutesToday: 20 });
    const s = await scootersById();
    expect([s[1]?.startedAt, s[2]?.startedAt]).toEqual([null, null]);
  });

  it('resets rides and bookings without logging them', async () => {
    await startSessions(db, [1], T0);
    await allocateMinutesMany(db, [2], 15);
    await resetScooters(db, [1, 2]);
    const s = await scootersById();
    expect(s[1]).toMatchObject({ startedAt: null, allocatedMinutes: 0 });
    expect(s[2]).toMatchObject({ startedAt: null, allocatedMinutes: 0 });
    expect((await getScooterDayStats(db, dayKey(T0))).sessionsToday).toBe(0);
  });

  it('deletes several scooters and their history', async () => {
    await startSessions(db, [1], T0);
    await stopSessions(db, [1], T0 + MIN);
    await deleteScooters(db, [1, 2]);
    const s = await scootersById();
    expect(Object.keys(s).map(Number).sort()).toEqual([3, 4]);
    expect(await db.getAllAsync('SELECT id FROM scooter_sessions')).toHaveLength(0);
  });
});
