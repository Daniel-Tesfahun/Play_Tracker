import { dayKey, formatClock, formatDuration, formatMinutes } from '../time';

describe('time helpers', () => {
  it('formats the local day key with zero padding', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('formats a 24h start clock', () => {
    expect(formatClock(new Date(2026, 9, 10, 9, 5).getTime())).toBe('09:05');
    expect(formatClock(new Date(2026, 9, 10, 21, 40).getTime())).toBe('21:40');
  });

  it('formats durations under and over an hour', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
    expect(formatDuration(-90_000)).toBe('1:30');
  });

  it('formats minute labels', () => {
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(90)).toBe('1h 30m');
  });
});
