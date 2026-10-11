import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { IconButton } from './IconButton';

interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  /** Right-side controls, e.g. theme toggle and add button. */
  actions?: ReactNode;
  /** Shows a back arrow (to the landing screen) left of the title. */
  onBack?: () => void;
}

export function ScreenHeader({ eyebrow, title, actions, onBack }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-end gap-2 pb-4 pt-2">
      {onBack ? (
        <View className="-ml-2 mb-0.5">
          <IconButton icon="chevron-back" label="Back to home" onPress={onBack} testID="header-back" />
        </View>
      ) : null}
      <View className="flex-1 pr-1">
        <Text className="text-xs font-semibold uppercase tracking-widest text-faint" numberOfLines={1}>
          {eyebrow}
        </Text>
        <Text className="mt-1 text-[32px] font-extrabold tracking-tight text-ink" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {actions ? <View className="flex-row items-center gap-2">{actions}</View> : null}
    </View>
  );
}
