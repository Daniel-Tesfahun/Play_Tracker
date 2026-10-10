import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Text } from 'react-native';

import palette from '@/theme/palette';

import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'secondary' | 'danger';

const styles: Record<Variant, { box: string; text: string; icon: string }> = {
  primary: { box: 'bg-ink', text: 'text-canvas', icon: palette.canvas },
  secondary: { box: 'border border-line bg-elevated', text: 'text-ink', icon: palette.ink },
  danger: { box: 'border border-dangerDim bg-dangerDim', text: 'text-danger', icon: palette.danger },
};

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  className?: string;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'secondary',
  icon,
  disabled,
  className = '',
  testID,
}: ButtonProps) {
  const s = styles[variant];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      containerClassName={className}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 ${s.box}`}
    >
      {icon ? <Ionicons name={icon} size={18} color={s.icon} /> : null}
      <Text className={`text-base font-semibold ${s.text}`}>{label}</Text>
    </PressableScale>
  );
}
