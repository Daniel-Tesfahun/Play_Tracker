import { dayKey, formatClock, formatDuration, formatMinutes, formatTimeZoneName } from '../time';

describe('time helpers', () => {
  it('formats the local day key with zero padding', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('formats the clock with a 24-hour device setting', () => {
    const prefs = { locale: 'en-GB', hour12: false };
    expect(formatClock(new Date(2026, 9, 10, 9, 5).getTime(), prefs)).toBe('09:05');
    expect(formatClock(new Date(2026, 9, 10, 21, 40).getTime(), prefs)).toBe('21:40');
  });

  it('formats the clock with a 12-hour device setting', () => {
    const at = new Date(2026, 9, 10, 14, 5).getTime();
    expect(formatClock(at, { locale: 'en-US', hour12: true })).toMatch(/^2:05\sPM$/);
  });

  it("uses the device's time zone", () => {
    const at = Date.UTC(2026, 9, 10, 12, 0);
    const prefs = { locale: 'en-GB', hour12: false };
    expect(formatClock(at, { ...prefs, timeZone: 'Africa/Addis_Ababa' })).toBe('15:00');
    expect(formatClock(at, { ...prefs, timeZone: 'UTC' })).toBe('12:00');
  });

  it('falls back to 24h when the zone is unknown', () => {
    const at = new Date(2026, 9, 10, 7, 30).getTime();
    expect(formatClock(at, { timeZone: 'Not/AZone' })).toBe('07:30');
  });

  it('names the time zone', () => {
    const at = Date.UTC(2026, 9, 10, 12, 0);
    expect(formatTimeZoneName(at, { locale: 'en-US', timeZone: 'UTC' })).toBe('UTC');
    expect(formatTimeZoneName(at, { timeZone: 'Not/AZone' })).toBe('');
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
