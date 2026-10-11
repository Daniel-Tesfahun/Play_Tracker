import { addAllocation, billableMinutes } from '@/lib/timer';
import { dayKey } from '@/lib/time';

import type { Database, Scooter, ScooterDayStats } from './types';

export async function listScooters(db: Database): Promise<Scooter[]> {
  return db.getAllAsync<Scooter>(
    `SELECT id, name, started_at AS startedAt, allocated_minutes AS allocatedMinutes, position
       FROM scooters ORDER BY position, id`,
  );
}

async function getScooter(db: Database, scooterId: number): Promise<Scooter | null> {
  return db.getFirstAsync<Scooter>(
    `SELECT id, name, started_at AS startedAt, allocated_minutes AS allocatedMinutes, position
       FROM scooters WHERE id = ?`,
    scooterId,
  );
}

export async function addScooter(db: Database, name: string): Promise<number> {
  const max = await db.getFirstAsync<{ maxPos: number | null }>(
    'SELECT MAX(position) AS maxPos FROM scooters',
  );
  const result = await db.runAsync(
    'INSERT INTO scooters (name, started_at, allocated_minutes, position) VALUES (?, NULL, 0, ?)',
    name.trim(),
    (max?.maxPos ?? 0) + 1,
  );
  return result.lastInsertRowId;
}

export async function renameScooter(db: Database, scooterId: number, name: string): Promise<void> {
  await db.runAsync('UPDATE scooters SET name = ? WHERE id = ?', name.trim(), scooterId);
}

export async function deleteScooter(db: Database, scooterId: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM scooter_sessions WHERE scooter_id = ?', scooterId);
    await db.runAsync('DELETE FROM scooters WHERE id = ?', scooterId);
  });
}

/** Adds preset minutes to a scooter, whether idle (pre-allocating) or mid-ride (extending). */
export async function allocateMinutes(
  db: Database,
  scooterId: number,
  minutes: number,
): Promise<number> {
  const scooter = await getScooter(db, scooterId);
  if (!scooter) throw new Error(`Scooter ${scooterId} not found`);
  const next = addAllocation(scooter.allocatedMinutes, minutes);
  await db.runAsync('UPDATE scooters SET allocated_minutes = ? WHERE id = ?', next, scooterId);
  return next;
}

export async function clearAllocation(db: Database, scooterId: number): Promise<void> {
  await db.runAsync('UPDATE scooters SET allocated_minutes = 0 WHERE id = ?', scooterId);
}

/** Starts a ride stamped with the current time. Starting a running scooter keeps its original start. */
export async function startSession(db: Database, scooterId: number, now = Date.now()): Promise<void> {
  await db.runAsync(
    'UPDATE scooters SET started_at = COALESCE(started_at, ?) WHERE id = ?',
    now,
    scooterId,
  );
}

/**
 * Ends the ride, writes it to history, and returns the scooter to idle with no allocation.
 * Returns the billable minutes, or null if the scooter wasn't running.
 */
export async function stopSession(
  db: Database,
  scooterId: number,
  now = Date.now(),
): Promise<number | null> {
  const scooter = await getScooter(db, scooterId);
  if (!scooter || scooter.startedAt === null) return null;
  const startedAt = scooter.startedAt;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO scooter_sessions (scooter_id, day, started_at, ended_at, allocated_minutes)
       VALUES (?, ?, ?, ?, ?)`,
      scooterId,
      dayKey(startedAt),
      startedAt,
      now,
      scooter.allocatedMinutes,
    );
    await db.runAsync(
      'UPDATE scooters SET started_at = NULL, allocated_minutes = 0 WHERE id = ?',
      scooterId,
    );
  });

  return billableMinutes(now - startedAt);
}

/** Cancels a ride (or booking) without logging it, returning the scooter to idle. */
export async function resetScooter(db: Database, scooterId: number): Promise<void> {
  await db.runAsync(
    'UPDATE scooters SET started_at = NULL, allocated_minutes = 0 WHERE id = ?',
    scooterId,
  );
}

/** Cancels every ride and booking and clears today's ride history. Earlier days are kept. */
export async function resetScootersDay(db: Database, now = Date.now()): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE scooters SET started_at = NULL, allocated_minutes = 0');
    await db.runAsync('DELETE FROM scooter_sessions WHERE day = ?', dayKey(now));
  });
}

export async function getScooterDayStats(db: Database, day = dayKey()): Promise<ScooterDayStats> {
  const rows = await db.getAllAsync<{ startedAt: number; endedAt: number }>(
    'SELECT started_at AS startedAt, ended_at AS endedAt FROM scooter_sessions WHERE day = ?',
    day,
  );
  return {
    sessionsToday: rows.length,
    minutesToday: rows.reduce((sum, r) => sum + billableMinutes(r.endedAt - r.startedAt), 0),
  };
}
