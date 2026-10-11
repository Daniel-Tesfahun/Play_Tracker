import { useColorScheme } from 'nativewind';

import { themes, type ColorScheme, type Palette } from './palette';

export function useScheme(): ColorScheme {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'light' ? 'light' : 'dark';
}

/** Raw color values for the active scheme, for props that can't take a className. */
export function usePalette(): Palette {
  return themes[useScheme()];
}
