import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import type { GradientStops } from '@/theme/palette';

interface HeroCardProps {
  label: string;
  value: string;
  caption: string;
  colors: GradientStops;
  /** Small stat pills along the bottom. */
  children?: ReactNode;
  testID?: string;
}

/** The screen's headline number on a gradient, so the most-checked stat stands out. */
export function HeroCard({ label, value, caption, colors, children, testID }: HeroCardProps) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 24, padding: 20 }}
      testID={testID}
    >
      <Text className="text-xs font-bold uppercase tracking-widest text-white/80">{label}</Text>
      <View className="mt-1 flex-row items-end gap-2">
        <Text className="text-6xl font-extrabold text-white" style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
        <Text className="mb-2.5 flex-1 text-sm font-medium text-white/80" numberOfLines={1}>
          {caption}
        </Text>
      </View>
      {children ? <View className="mt-4 flex-row gap-2">{children}</View> : null}
    </LinearGradient>
  );
}

export function HeroPill({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-white/15 px-3 py-2.5">
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-white/75" numberOfLines={1}>
        {label}
      </Text>
      <Text
        className="mt-0.5 text-lg font-bold text-white"
        style={{ fontVariant: ['tabular-nums'] }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}
