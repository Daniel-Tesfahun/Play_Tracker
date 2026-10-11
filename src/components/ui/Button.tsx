import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Text } from 'react-native';

import type { Palette } from '@/theme/palette';
import { usePalette } from '@/theme/usePalette';

import { PressableScale } from './PressableScale';

export type ButtonVariant = 'primary' | 'brand' | 'scoot' | 'go' | 'secondary' | 'danger' | 'dangerSolid';

const styles: Record<ButtonVariant, { box: string; text: string; icon: keyof Palette }> = {
  primary: { box: 'bg-ink', text: 'text-canvas', icon: 'canvas' },
  brand: { box: 'bg-brand', text: 'text-onAccent', icon: 'onAccent' },
  scoot: { box: 'bg-scoot', text: 'text-canvas', icon: 'canvas' },
  go: { box: 'bg-neon', text: 'text-canvas', icon: 'canvas' },
  secondary: { box: 'border border-line bg-elevated', text: 'text-ink', icon: 'ink' },
  danger: { box: 'border border-danger/30 bg-dangerDim', text: 'text-danger', icon: 'danger' },
  dangerSolid: { box: 'bg-danger', text: 'text-canvas', icon: 'canvas' },
};

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
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
  const c = usePalette();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      containerClassName={className}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-2xl px-4 ${s.box}`}
    >
      {icon ? <Ionicons name={icon} size={18} color={c[s.icon]} /> : null}
      <Text className={`text-base font-bold ${s.text}`}>{label}</Text>
    </PressableScale>
  );
}
