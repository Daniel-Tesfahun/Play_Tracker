import { getCalendars, getLocales } from 'expo-localization';
import { useState } from 'react';

import type { ClockPrefs } from '@/lib/time';

/** Reads the phone's own locale, time zone, and 12/24-hour setting. */
export function readClockPrefs(): ClockPrefs {
  const calendar = getCalendars()[0];
  const locale = getLocales()[0];
  return {
    locale: locale?.languageTag,
    timeZone: calendar?.timeZone ?? undefined,
    hour12: calendar?.uses24hourClock == null ? undefined : !calendar.uses24hourClock,
  };
}

/** Read once per mount; the screen remounts when the app restarts. */
export function useClockPrefs(): ClockPrefs {
  const [prefs] = useState(readClockPrefs);
  return prefs;
}
