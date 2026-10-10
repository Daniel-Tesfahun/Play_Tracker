export const PRESET_MINUTES = [15, 30, 60] as const;
export const MAX_ALLOCATED_MINUTES = 12 * 60;
export const MILESTONES = [0.25, 0.5, 0.75, 1] as const;

const MINUTE = 60_000;
/** Amber warning starts at 5 minutes left, or 20% of the allocation for short rides. */
const WARNING_CAP_MS = 5 * MINUTE;
const WARNING_RATIO = 0.2;

/**
 * idle     – no session running
 * open     – running with no allocation, counts up
 * active   – running, comfortably inside the allocation
 * warning  – running, close to the end of the allocation
 * expired  – running past the allocation (overtime)
 */
export type TimerPhase = 'idle' | 'open' | 'active' | 'warning' | 'expired';

export interface TimerState {
  phase: TimerPhase;
  elapsedMs: number;
  /** Time left in the allocation; null when no allocation is set. */
  remainingMs: number | null;
  overtimeMs: number;
  /** Fraction of the allocation used, clamped to 0..1. 0 when open-ended. */
  progress: number;
  /** Milestones from MILESTONES that have been passed. */
  milestonesReached: number[];
}

export function warningThresholdMs(allocatedMinutes: number): number {
  return Math.min(WARNING_CAP_MS, allocatedMinutes * MINUTE * WARNING_RATIO);
}

export function computeTimerState(
  startedAt: number | null,
  allocatedMinutes: number,
  now: number,
): TimerState {
  if (startedAt === null) {
    return {
      phase: 'idle',
      elapsedMs: 0,
      remainingMs: allocatedMinutes > 0 ? allocatedMinutes * MINUTE : null,
      overtimeMs: 0,
      progress: 0,
      milestonesReached: [],
    };
  }

  // A clock change on the device could put "now" before the start; never show negative time.
  const elapsedMs = Math.max(0, now - startedAt);

  if (allocatedMinutes <= 0) {
    return {
      phase: 'open',
      elapsedMs,
      remainingMs: null,
      overtimeMs: 0,
      progress: 0,
      milestonesReached: [],
    };
  }

  const allocatedMs = allocatedMinutes * MINUTE;
  const remainingMs = allocatedMs - elapsedMs;
  const progress = Math.min(1, elapsedMs / allocatedMs);

  let phase: TimerPhase;
  if (remainingMs <= 0) phase = 'expired';
  else if (remainingMs <= warningThresholdMs(allocatedMinutes)) phase = 'warning';
  else phase = 'active';

  return {
    phase,
    elapsedMs,
    remainingMs: Math.max(0, remainingMs),
    overtimeMs: Math.max(0, -remainingMs),
    progress,
    milestonesReached: MILESTONES.filter((m) => progress >= m),
  };
}

/** Adds preset minutes to an allocation, capped so a mis-tap can't book a scooter for days. */
export function addAllocation(currentMinutes: number, addMinutes: number): number {
  return Math.min(MAX_ALLOCATED_MINUTES, Math.max(0, currentMinutes + addMinutes));
}

/** Whole minutes ridden, rounded up: a 61-second ride bills as 2 minutes. */
export function billableMinutes(elapsedMs: number): number {
  return Math.ceil(Math.max(0, elapsedMs) / MINUTE);
}
