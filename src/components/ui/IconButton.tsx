import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import palette from '@/theme/palette';

import { PressableScale } from './PressableScale';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  variant?: 'ghost' | 'filled';
  testID?: string;
}

/** 44×44 icon target. `label` is read by screen readers. */
export function IconButton({
  icon,
  label,
  onPress,
  color = palette.muted,
  variant = 'ghost',
  testID,
}: IconButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      pressedScale={0.9}
      className={`h-11 w-11 items-center justify-center rounded-xl ${
        variant === 'filled' ? 'border border-line bg-elevated' : ''
      }`}
    >
      <Ionicons name={icon} size={20} color={color} />
    </PressableScale>
  );
}
