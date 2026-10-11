import Storage from 'expo-sqlite/kv-store';
import { colorScheme, useColorScheme } from 'nativewind';

import type { ColorScheme } from './palette';

const KEY = 'playtracker.colorScheme';
/** The brand look is dark, so that's what a fresh install starts in. */
const DEFAULT_SCHEME: ColorScheme = 'dark';

/** Applies the saved scheme synchronously at startup so the first frame is already right. */
export function restoreColorScheme(): void {
  let saved: string | null = null;
  try {
    saved = Storage.getItemSync(KEY);
  } catch {
    // Storage unavailable: fall back to the default.
  }
  colorScheme.set(saved === 'light' || saved === 'dark' ? saved : DEFAULT_SCHEME);
}

export function useColorSchemeToggle() {
  const { colorScheme: current, setColorScheme } = useColorScheme();
  const scheme: ColorScheme = current === 'light' ? 'light' : 'dark';

  const toggle = () => {
    const next: ColorScheme = scheme === 'dark' ? 'light' : 'dark';
    setColorScheme(next);
    try {
      Storage.setItemSync(KEY, next);
    } catch {
      // Not persisted; the toggle still applies for this session.
    }
  };

  return { scheme, toggle };
}
