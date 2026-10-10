/**
 * @jest-environment node
 */
import { computeTimerState } from '@/lib/timer';
import { dayKey } from '@/lib/time';
import { createTestDatabase } from '@/test/sqljsDatabase';

import { migrate } from '../schema';
import {
  addScooter,
  allocateMinutes,
  clearAllocation,
  deleteScooter,
  getScooterDayStats,
  listScooters,
  renameScooter,
  startSession,
  stopSession,
} from '../scootersRepo';
import type { Database } from '../types';

const MIN = 60_000;
const T0 = new Date(2026, 9, 10, 16, 0).getTime();

let db: Database;

const scooter = async (id: number) => (await listScooters(db)).find((s) => s.id === id);

beforeEach(async () => {
  db = await createTestDatabase();
  await migrate(db);
});

describe('scooters repository', () => {
  it('saves and retrieves a new idle scooter', async () => {
    const id = await addScooter(db, 'Scooter X');
    expect(await scooter(id)).toMatchObject({
      name: 'Scooter X',
      startedAt: null,
      allocatedMinutes: 0,
    });
  });

  it('renames and deletes scooters', async () => {
    await renameScooter(db, 1, ' Blue ');
    expect((await scooter(1))?.name).toBe('Blue');
    await deleteScooter(db, 1);
    expect(await scooter(1)).toBeUndefined();
  });

  it('pre-allocates minutes from stacked preset bubbles while idle', async () => {
    await allocateMinutes(db, 1, 15);
    await allocateMinutes(db, 1, 30);
    const s = await scooter(1);
    expect(s?.allocatedMinutes).toBe(45);
    expect(s?.startedAt).toBeNull();
  });

  it('clears a pre-allocation', async () => {
    await allocateMinutes(db, 1, 60);
    await clearAllocation(db, 1);
    expect((await scooter(1))?.allocatedMinutes).toBe(0);
  });

  it('throws when allocating to a missing scooter', async () => {
    await expect(allocateMinutes(db, 999, 15)).rejects.toThrow('not found');
  });

  it('stamps the start time and keeps it if start is pressed again', async () => {
    await startSession(db, 1, T0);
    await startSession(db, 1, T0 + 5 * MIN);
    expect((await scooter(1))?.startedAt).toBe(T0);
  });

  it('runs a full allocated ride through the timer phases', async () => {
    await allocateMinutes(db, 1, 15);
    await startSession(db, 1, T0);
    const s = await scooter(1);
    if (!s) throw new Error('missing scooter');

    expect(computeTimerState(s.startedAt, s.allocatedMinutes, T0 + 5 * MIN).phase).toBe('active');
    expect(computeTimerState(s.startedAt, s.allocatedMinutes, T0 + 13 * MIN).phase).toBe('warning');
    expect(computeTimerState(s.startedAt, s.allocatedMinutes, T0 + 16 * MIN).phase).toBe('expired');
  });

  it('extends a running ride without resetting the start', async () => {
    await allocateMinutes(db, 1, 15);
    await startSession(db, 1, T0);
    await allocateMinutes(db, 1, 30);
    expect(await scooter(1)).toMatchObject({ startedAt: T0, allocatedMinutes: 45 });
  });

  it('stops a ride, logs it, and resets the scooter', async () => {
    await allocateMinutes(db, 1, 30);
    await startSession(db, 1, T0);
    const billed = await stopSession(db, 1, T0 + 32 * MIN + 10_000);

    expect(billed).toBe(33);
    expect(await scooter(1)).toMatchObject({ startedAt: null, allocatedMinutes: 0 });
    expect(await getScooterDayStats(db, dayKey(T0))).toEqual({
      sessionsToday: 1,
      minutesToday: 33,
    });
  });

  it('returns null when stopping an idle scooter and logs nothing', async () => {
    expect(await stopSession(db, 1, T0)).toBeNull();
    expect((await getScooterDayStats(db, dayKey(T0))).sessionsToday).toBe(0);
  });

  it('aggregates multiple rides for the day', async () => {
    await startSession(db, 1, T0);
    await stopSession(db, 1, T0 + 10 * MIN);
    await startSession(db, 2, T0);
    await stopSession(db, 2, T0 + 20 * MIN);
    expect(await getScooterDayStats(db, dayKey(T0))).toEqual({
      sessionsToday: 2,
      minutesToday: 30,
    });
  });
});
