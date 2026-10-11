import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  /** Right-side controls, e.g. theme toggle and add button. */
  actions?: ReactNode;
}

export function ScreenHeader({ eyebrow, title, actions }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-end justify-between pb-4 pt-2">
      <View className="flex-1 pr-3">
        <Text className="text-xs font-semibold uppercase tracking-widest text-faint" numberOfLines={1}>
          {eyebrow}
        </Text>
        <Text className="mt-1 text-3xl font-bold tracking-tight text-ink" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {actions ? <View className="flex-row items-center gap-2">{actions}</View> : null}
    </View>
  );
}
