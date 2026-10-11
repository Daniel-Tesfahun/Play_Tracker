import { useColorSchemeToggle } from '@/theme/themePreference';
import { usePalette } from '@/theme/usePalette';

import { IconButton } from './IconButton';

export function ThemeToggle() {
  const { scheme, toggle } = useColorSchemeToggle();
  const c = usePalette();
  const toLight = scheme === 'dark';

  return (
    <IconButton
      icon={toLight ? 'sunny-outline' : 'moon-outline'}
      label={toLight ? 'Switch to light mode' : 'Switch to dark mode'}
      variant="filled"
      color={c.ink}
      onPress={toggle}
      testID="theme-toggle"
    />
  );
}
