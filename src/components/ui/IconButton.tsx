import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { usePalette } from '@/theme/usePalette';

import { PressableScale } from './PressableScale';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  variant?: 'ghost' | 'filled';
  /** md = 44dp (minimum target), lg = 48dp to sit beside a Button. */
  size?: 'md' | 'lg';
  disabled?: boolean;
  testID?: string;
}

/** Square icon target. `label` is read by screen readers. */
export function IconButton({
  icon,
  label,
  onPress,
  color,
  variant = 'ghost',
  size = 'md',
  disabled,
  testID,
}: IconButtonProps) {
  const c = usePalette();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      pressedScale={0.9}
      className={`items-center justify-center rounded-xl ${size === 'lg' ? 'h-12 w-12' : 'h-11 w-11'} ${
        variant === 'filled' ? 'border border-line bg-elevated' : ''
      }`}
    >
      <Ionicons name={icon} size={20} color={color ?? c.muted} />
    </PressableScale>
  );
}
