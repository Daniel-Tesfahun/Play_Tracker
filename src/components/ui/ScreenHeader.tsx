import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}

export function ScreenHeader({ eyebrow, title, action }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-end justify-between pb-4 pt-2">
      <View className="flex-1">
        <Text className="text-xs font-semibold uppercase tracking-widest text-faint">{eyebrow}</Text>
        <Text className="mt-1 text-3xl font-bold tracking-tight text-ink">{title}</Text>
      </View>
      {action}
    </View>
  );
}
