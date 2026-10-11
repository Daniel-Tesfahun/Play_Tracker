import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { usePalette } from '@/theme/usePalette';

import { PressableScale } from './PressableScale';

interface SectionHeadingProps {
  title: string;
  /** Shows a "Select" button that turns on bulk-select mode. */
  onSelect?: () => void;
  selecting?: boolean;
}

/** Small uppercase label above a list, e.g. "Stations · 6", with an optional Select toggle. */
export function SectionHeading({ title, onSelect, selecting = false }: SectionHeadingProps) {
  const c = usePalette();
  return (
    <View className="mb-3 mt-6 flex-row items-center justify-between">
      <Text className="text-xs font-semibold uppercase tracking-widest text-faint" accessibilityRole="header">
        {title}
      </Text>
      {onSelect && !selecting ? (
        <PressableScale
          onPress={onSelect}
          accessibilityRole="button"
          accessibilityLabel="Select for bulk actions"
          testID="start-selecting"
          pressedScale={0.94}
          className="h-11 flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-4"
        >
          <Ionicons name="checkmark-circle-outline" size={18} color={c.ink} />
          <Text className="text-sm font-bold text-ink">Select</Text>
        </PressableScale>
      ) : null}
      {selecting ? <Text className="text-xs font-semibold text-muted">Tap to select</Text> : null}
    </View>
  );
}
