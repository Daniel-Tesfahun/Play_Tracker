import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { usePalette } from '@/theme/usePalette';

import { PressableScale } from './PressableScale';

interface SectionToolbarProps {
  title: string;
  resetLabel: string;
  onReset: () => void;
  resetDisabled?: boolean;
  testID?: string;
}

/** List heading with a labelled reset action, kept right above the cards it affects. */
export function SectionToolbar({ title, resetLabel, onReset, resetDisabled, testID }: SectionToolbarProps) {
  const c = usePalette();
  return (
    <View className="mb-3 mt-5 flex-row items-center justify-between">
      <Text className="text-xs font-semibold uppercase tracking-widest text-faint">{title}</Text>
      <PressableScale
        onPress={onReset}
        disabled={resetDisabled}
        accessibilityRole="button"
        accessibilityLabel={resetLabel}
        accessibilityState={{ disabled: !!resetDisabled }}
        testID={testID}
        pressedScale={0.94}
        className="h-11 flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-4"
      >
        <Ionicons name="refresh" size={16} color={c.danger} />
        <Text className="text-sm font-semibold text-danger">{resetLabel}</Text>
      </PressableScale>
    </View>
  );
}
