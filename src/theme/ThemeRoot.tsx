import { vars } from 'nativewind';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cssVariables } from './palette';
import { useScheme } from './usePalette';

const schemeVars = {
  light: vars(cssVariables('light')),
  dark: vars(cssVariables('dark')),
};

/** Supplies the active scheme's CSS variables to every className below it. */
export function ThemeRoot({ children }: { children: ReactNode }) {
  const scheme = useScheme();
  return <View style={[{ flex: 1 }, schemeVars[scheme]]}>{children}</View>;
}
