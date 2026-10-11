import { activeElapsedMs, addAllocation, billableMinutes, MAX_ALLOCATED_MINUTES } from '@/lib/timer';
import { dayKey } from '@/lib/time';

import { placeholders } from './sql';
import type { Database, Scooter, ScooterDayStats } from './types';

const SCOOTER_COLUMNS = `id, name, started_at AS startedAt, allocated_minutes AS allocatedMinutes,
  paused_at AS pausedAt, paused_ms AS pausedMs, position`;

/** Back to idle: no ride, no booking, no pause. */
const IDLE_SET = 'started_at = NULL, allocated_minutes = 0, paused_at = NULL, paused_ms = 0';

export async function listScooters(db: Database): Promise<Scooter[]> {
  return db.getAllAsync<Scooter>(`SELECT ${SCOOTER_COLUMNS} FROM scooters ORDER BY position, id`);
}

async function getScooter(db: Database, scooterId: number): Promise<Scooter | null> {
  return db.getFirstAsync<Scooter>(`SELECT ${SCOOTER_COLUMNS} FROM scooters WHERE id = ?`, scooterId);
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

/** Adds minutes (preset or custom) to a scooter, whether idle (booking) or mid-ride (extending). */
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
    `UPDATE scooters SET started_at = ?, paused_at = NULL, paused_ms = 0
      WHERE id = ? AND started_at IS NULL`,
    now,
    scooterId,
  );
}

/** Freezes a running ride's clock. No-op if idle or already paused. */
export async function pauseSession(db: Database, scooterId: number, now = Date.now()): Promise<void> {
  await db.runAsync(
    'UPDATE scooters SET paused_at = ? WHERE id = ? AND started_at IS NOT NULL AND paused_at IS NULL',
    now,
    scooterId,
  );
}

/** Restarts a paused ride's clock, banking the time spent paused. No-op if not paused. */
export async function resumeSession(db: Database, scooterId: number, now = Date.now()): Promise<void> {
  await db.runAsync(
    `UPDATE scooters SET paused_ms = paused_ms + MAX(0, ? - paused_at), paused_at = NULL
      WHERE id = ? AND paused_at IS NOT NULL`,
    now,
    scooterId,
  );
}

/**
 * Ends the ride (even mid-pause), writes it to history, and returns the scooter to idle.
 * Returns the billable minutes, which exclude paused time, or null if it wasn't running.
 */
export async function stopSession(
  db: Database,
  scooterId: number,
  now = Date.now(),
): Promise<number | null> {
  const scooter = await getScooter(db, scooterId);
  if (!scooter || scooter.startedAt === null) return null;
  const startedAt = scooter.startedAt;
  const pause = { pausedAt: scooter.pausedAt, pausedMs: scooter.pausedMs };
  const ridden = activeElapsedMs(startedAt, now, pause);
  const totalPausedMs = Math.max(0, now - startedAt - ridden);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO scooter_sessions (scooter_id, day, started_at, ended_at, allocated_minutes, paused_ms)
       VALUES (?, ?, ?, ?, ?, ?)`,
      scooterId,
      dayKey(startedAt),
      startedAt,
      now,
      scooter.allocatedMinutes,
      totalPausedMs,
    );
    await db.runAsync(`UPDATE scooters SET ${IDLE_SET} WHERE id = ?`, scooterId);
  });

  return billableMinutes(ridden);
}

/** Cancels a ride (or booking) without logging it, returning the scooter to idle. */
export async function resetScooter(db: Database, scooterId: number): Promise<void> {
  await db.runAsync(`UPDATE scooters SET ${IDLE_SET} WHERE id = ?`, scooterId);
}

/** Cancels every ride and booking and clears today's ride history. Earlier days are kept. */
export async function resetScootersDay(db: Database, now = Date.now()): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE scooters SET ${IDLE_SET}`);
    await db.runAsync('DELETE FROM scooter_sessions WHERE day = ?', dayKey(now));
  });
}

export async function getScooterDayStats(db: Database, day = dayKey()): Promise<ScooterDayStats> {
  const rows = await db.getAllAsync<{ startedAt: number; endedAt: number; pausedMs: number }>(
    `SELECT started_at AS startedAt, ended_at AS endedAt, paused_ms AS pausedMs
       FROM scooter_sessions WHERE day = ?`,
    day,
  );
  return {
    sessionsToday: rows.length,
    minutesToday: rows.reduce((sum, r) => sum + billableMinutes(r.endedAt - r.startedAt - r.pausedMs), 0),
  };
}

// ---- Bulk actions (selection mode). Each only touches scooters it applies to,
// and is a no-op for an empty list.

/** Starts rides on the idle scooters among `ids`; running ones keep their start. */
export async function startSessions(db: Database, ids: readonly number[], now = Date.now()): Promise<void> {
  if (ids.length === 0) return;
  await db.runAsync(
    `UPDATE scooters SET started_at = ?, paused_at = NULL, paused_ms = 0
      WHERE started_at IS NULL AND id IN (${placeholders(ids)})`,
    now,
    ...ids,
  );
}

export async function pauseSessions(db: Database, ids: readonly number[], now = Date.now()): Promise<void> {
  if (ids.length === 0) return;
  await db.runAsync(
    `UPDATE scooters SET paused_at = ?
      WHERE started_at IS NOT NULL AND paused_at IS NULL AND id IN (${placeholders(ids)})`,
    now,
    ...ids,
  );
}

export async function resumeSessions(db: Database, ids: readonly number[], now = Date.now()): Promise<void> {
  if (ids.length === 0) return;
  await db.runAsync(
    `UPDATE scooters SET paused_ms = paused_ms + MAX(0, ? - paused_at), paused_at = NULL
      WHERE paused_at IS NOT NULL AND id IN (${placeholders(ids)})`,
    now,
    ...ids,
  );
}

/** Adds the same minutes to every scooter in `ids`, each capped at MAX_ALLOCATED_MINUTES. */
export async function allocateMinutesMany(db: Database, ids: readonly number[], minutes: number): Promise<void> {
  if (ids.length === 0) return;
  await db.runAsync(
    `UPDATE scooters SET allocated_minutes = MIN(?, MAX(0, allocated_minutes + ?))
      WHERE id IN (${placeholders(ids)})`,
    MAX_ALLOCATED_MINUTES,
    minutes,
    ...ids,
  );
}

/**
 * Ends every running ride among `ids` and logs each one, exactly like ending
 * them one by one. Returns the total billable minutes.
 */
export async function stopSessions(db: Database, ids: readonly number[], now = Date.now()): Promise<number> {
  let billed = 0;
  for (const id of ids) billed += (await stopSession(db, id, now)) ?? 0;
  return billed;
}

/** Cancels rides and bookings without logging them. */
export async function resetScooters(db: Database, ids: readonly number[]): Promise<void> {
  if (ids.length === 0) return;
  await db.runAsync(`UPDATE scooters SET ${IDLE_SET} WHERE id IN (${placeholders(ids)})`, ...ids);
}

export async function deleteScooters(db: Database, ids: readonly number[]): Promise<void> {
  if (ids.length === 0) return;
  const list = placeholders(ids);
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM scooter_sessions WHERE scooter_id IN (${list})`, ...ids);
    await db.runAsync(`DELETE FROM scooters WHERE id IN (${list})`, ...ids);
  });
}
