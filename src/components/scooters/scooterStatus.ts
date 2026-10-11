import type { Scooter } from '@/db/types';
import { computeTimerState, type TimerPhase, type TimerState } from '@/lib/timer';
import { formatDuration } from '@/lib/time';

import { pausedStyle, phaseStyle } from './phaseStyle';

/** The big time on a scooter: countdown, count-up, overtime, or "Ready". */
export function headline(phase: TimerPhase, remainingMs: number | null, elapsedMs: number, overtimeMs: number): string {
  switch (phase) {
    case 'idle':
      return remainingMs === null ? 'Ready' : formatDuration(remainingMs);
    case 'open':
      return formatDuration(elapsedMs);
    case 'active':
    case 'warning':
      return formatDuration(remainingMs ?? 0);
    case 'expired':
      return `+${formatDuration(overtimeMs)}`;
  }
}

/** Timer state plus its visual style and display time, shared by cards and select rows. */
export function scooterStatus(scooter: Scooter, now: number): { timer: TimerState; style: typeof pausedStyle; time: string } {
  const timer = computeTimerState(scooter.startedAt, scooter.allocatedMinutes, now, {
    pausedAt: scooter.pausedAt,
    pausedMs: scooter.pausedMs,
  });
  return {
    timer,
    style: timer.paused ? pausedStyle : phaseStyle[timer.phase],
    time: headline(timer.phase, timer.remainingMs, timer.elapsedMs, timer.overtimeMs),
  };
}

/** Which bulk actions apply to a scooter right now. */
export const canStart = (s: Scooter) => s.startedAt === null;
export const canPause = (s: Scooter) => s.startedAt !== null && s.pausedAt === null;
export const canResume = (s: Scooter) => s.pausedAt !== null;
export const canEnd = (s: Scooter) => s.startedAt !== null;
export const canReset = (s: Scooter) => s.startedAt !== null || s.allocatedMinutes > 0;
