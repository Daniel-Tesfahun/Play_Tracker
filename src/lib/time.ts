const pad = (n: number): string => String(n).padStart(2, '0');

export interface ClockPrefs {
  /** BCP 47 tag, e.g. "en-US", "am-ET". Undefined uses the runtime default. */
  locale?: string;
  /** IANA zone, e.g. "Africa/Addis_Ababa". Undefined uses the device zone. */
  timeZone?: string;
  /** Device 12/24h setting; undefined lets the locale decide. */
  hour12?: boolean;
}

/** Local calendar day as YYYY-MM-DD; used to bucket "today" metrics. */
export function dayKey(at: number | Date = Date.now()): string {
  const d = at instanceof Date ? at : new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Wall-clock time in the device's own time zone and format,
 * e.g. "2:05 PM" for en-US or "14:05" with a 24-hour setting.
 */
export function formatClock(at: number, prefs: ClockPrefs = {}): string {
  try {
    return new Intl.DateTimeFormat(prefs.locale, {
      // 24-hour clocks conventionally pad the hour (09:05); 12-hour ones don't (9:05 AM).
      hour: prefs.hour12 === false ? '2-digit' : 'numeric',
      minute: '2-digit',
      hour12: prefs.hour12,
      timeZone: prefs.timeZone,
    }).format(at);
  } catch {
    // Unknown locale or zone: fall back to plain 24h.
    const d = new Date(at);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

/** Short zone label such as "EAT" or "GMT+3"; empty if the runtime can't name it. */
export function formatTimeZoneName(at: number, prefs: ClockPrefs = {}): string {
  try {
    const parts = new Intl.DateTimeFormat(prefs.locale, {
      timeZoneName: 'short',
      timeZone: prefs.timeZone,
    }).formatToParts(at);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

/** Duration as M:SS below an hour and H:MM:SS above it. Negative input is treated as its magnitude. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Compact minute label for bubbles and stats, e.g. "45m", "1h 30m". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
