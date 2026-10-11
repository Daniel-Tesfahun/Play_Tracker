import {
  activeElapsedMs,
  addAllocation,
  billableMinutes,
  computeTimerState,
  MAX_ALLOCATED_MINUTES,
  parseCustomMinutes,
  warningThresholdMs,
} from '../timer';

const MIN = 60_000;
const START = new Date(2026, 9, 10, 14, 0, 0).getTime();

describe('computeTimerState', () => {
  it('is idle with no start time and reports the pre-allocated time as remaining', () => {
    const state = computeTimerState(null, 30, START);
    expect(state.phase).toBe('idle');
    expect(state.elapsedMs).toBe(0);
    expect(state.remainingMs).toBe(30 * MIN);
  });

  it('is idle with no allocation and no remaining time', () => {
    expect(computeTimerState(null, 0, START).remainingMs).toBeNull();
  });

  it('counts up in open mode when nothing is allocated', () => {
    const state = computeTimerState(START, 0, START + 17 * MIN);
    expect(state.phase).toBe('open');
    expect(state.elapsedMs).toBe(17 * MIN);
    expect(state.remainingMs).toBeNull();
    expect(state.progress).toBe(0);
  });

  it('counts down while comfortably inside the allocation', () => {
    const state = computeTimerState(START, 30, START + 10 * MIN);
    expect(state.phase).toBe('active');
    expect(state.remainingMs).toBe(20 * MIN);
    expect(state.overtimeMs).toBe(0);
    expect(state.progress).toBeCloseTo(1 / 3);
  });

  it('switches to warning at 5 minutes left for long rides', () => {
    expect(computeTimerState(START, 60, START + 54 * MIN).phase).toBe('active');
    expect(computeTimerState(START, 60, START + 55 * MIN).phase).toBe('warning');
  });

  it('uses 20% of the allocation as the warning window for short rides', () => {
    // 15 min ride → warning in the last 3 minutes.
    expect(warningThresholdMs(15)).toBe(3 * MIN);
    expect(computeTimerState(START, 15, START + 11 * MIN).phase).toBe('active');
    expect(computeTimerState(START, 15, START + 12 * MIN).phase).toBe('warning');
  });

  it('expires exactly at the allocation and tracks overtime after it', () => {
    const atEnd = computeTimerState(START, 15, START + 15 * MIN);
    expect(atEnd.phase).toBe('expired');
    expect(atEnd.remainingMs).toBe(0);

    const over = computeTimerState(START, 15, START + 22 * MIN);
    expect(over.phase).toBe('expired');
    expect(over.overtimeMs).toBe(7 * MIN);
    expect(over.progress).toBe(1);
  });

  it('reports milestones as they are passed', () => {
    expect(computeTimerState(START, 60, START + 10 * MIN).milestonesReached).toEqual([]);
    expect(computeTimerState(START, 60, START + 30 * MIN).milestonesReached).toEqual([0.25, 0.5]);
    expect(computeTimerState(START, 60, START + 61 * MIN).milestonesReached).toEqual([
      0.25, 0.5, 0.75, 1,
    ]);
  });

  it('never reports negative elapsed time if the device clock moves backwards', () => {
    const state = computeTimerState(START, 30, START - 5 * MIN);
    expect(state.elapsedMs).toBe(0);
    expect(state.remainingMs).toBe(30 * MIN);
  });

  it('moves from expired back to active when time is added mid-ride', () => {
    const now = START + 20 * MIN;
    expect(computeTimerState(START, 15, now).phase).toBe('expired');
    expect(computeTimerState(START, addAllocation(15, 30), now).phase).toBe('active');
  });
});

describe('addAllocation', () => {
  it('stacks preset bubbles', () => {
    expect(addAllocation(0, 15)).toBe(15);
    expect(addAllocation(15, 30)).toBe(45);
    expect(addAllocation(45, 60)).toBe(105);
  });

  it('caps the allocation and never goes below zero', () => {
    expect(addAllocation(MAX_ALLOCATED_MINUTES - 10, 60)).toBe(MAX_ALLOCATED_MINUTES);
    expect(addAllocation(10, -60)).toBe(0);
  });
});

describe('billableMinutes', () => {
  it('rounds partial minutes up', () => {
    expect(billableMinutes(0)).toBe(0);
    expect(billableMinutes(1)).toBe(1);
    expect(billableMinutes(60_000)).toBe(1);
    expect(billableMinutes(61_000)).toBe(2);
  });
});

describe('pausing', () => {
  it('freezes the clock while paused', () => {
    const pause = { pausedAt: START + 10 * MIN, pausedMs: 0 };
    const atPause = computeTimerState(START, 30, START + 10 * MIN, pause);
    const later = computeTimerState(START, 30, START + 25 * MIN, pause);
    expect(later.paused).toBe(true);
    expect(later.elapsedMs).toBe(10 * MIN);
    expect(later.remainingMs).toBe(atPause.remainingMs);
  });

  it('excludes finished pauses after resuming', () => {
    // Rode 10 min, paused 5 min, now 4 more minutes of riding.
    const state = computeTimerState(START, 30, START + 19 * MIN, { pausedAt: null, pausedMs: 5 * MIN });
    expect(state.paused).toBe(false);
    expect(state.elapsedMs).toBe(14 * MIN);
    expect(state.remainingMs).toBe(16 * MIN);
  });

  it('cannot slip into overtime while paused', () => {
    const pause = { pausedAt: START + 14 * MIN, pausedMs: 0 };
    expect(computeTimerState(START, 15, START + 60 * MIN, pause).phase).toBe('warning');
  });

  it('works for open-ended rides too', () => {
    const state = computeTimerState(START, 0, START + 20 * MIN, { pausedAt: START + 8 * MIN, pausedMs: 2 * MIN });
    expect(state.phase).toBe('open');
    expect(state.elapsedMs).toBe(6 * MIN);
    expect(state.paused).toBe(true);
  });

  it('idle scooters are never paused', () => {
    expect(computeTimerState(null, 30, START).paused).toBe(false);
  });

  it('activeElapsedMs never goes negative', () => {
    expect(activeElapsedMs(START, START - MIN)).toBe(0);
    expect(activeElapsedMs(START, START + MIN, { pausedAt: null, pausedMs: 5 * MIN })).toBe(0);
  });
});

describe('parseCustomMinutes', () => {
  it('accepts whole minutes in range', () => {
    expect(parseCustomMinutes('25')).toBe(25);
    expect(parseCustomMinutes(' 90 ')).toBe(90);
    expect(parseCustomMinutes(String(MAX_ALLOCATED_MINUTES))).toBe(MAX_ALLOCATED_MINUTES);
  });

  it('rejects empty, zero, decimals, negatives, and too much', () => {
    for (const bad of ['', '0', '1.5', '-5', 'abc', '15m', String(MAX_ALLOCATED_MINUTES + 1)]) {
      expect(parseCustomMinutes(bad)).toBeNull();
    }
  });
});
