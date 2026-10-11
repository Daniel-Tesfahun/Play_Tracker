import { useColorScheme } from 'nativewind';

import { gradients, playerColors, themes, type ColorScheme, type Palette } from './palette';

export function useScheme(): ColorScheme {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'light' ? 'light' : 'dark';
}

/** Raw color values for the active scheme, for props that can't take a className. */
export function usePalette(): Palette {
  return themes[useScheme()];
}

export function useGradients() {
  return gradients[useScheme()];
}

/** Stable color for the nth player on a zone (wraps after 8). */
export function usePlayerColor(): (index: number) => string {
  const colors = playerColors[useScheme()];
  return (index) => colors[index % colors.length] ?? colors[0]!;
}
