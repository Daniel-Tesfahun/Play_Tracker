import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { usePalette } from '@/theme/usePalette';

import { PressableScale } from './PressableScale';

interface SectionToolbarProps {
  title: string;
  resetLabel: string;
  onReset: () => void;
  resetDisabled?: boolean;
  /** Collapse / expand every card in the list. */
  allCollapsed?: boolean;
  onToggleAll?: () => void;
  testID?: string;
}

/** List heading with its bulk actions, kept right above the cards they affect. */
export function SectionToolbar({
  title,
  resetLabel,
  onReset,
  resetDisabled,
  allCollapsed,
  onToggleAll,
  testID,
}: SectionToolbarProps) {
  const c = usePalette();
  return (
    <View className="mb-3 mt-6 flex-row items-center gap-2">
      <Text className="flex-1 text-xs font-semibold uppercase tracking-widest text-faint">{title}</Text>
      {onToggleAll ? (
        <PressableScale
          onPress={onToggleAll}
          accessibilityRole="button"
          accessibilityLabel={allCollapsed ? 'Expand all' : 'Collapse all'}
          testID={testID ? `${testID}-toggle-all` : undefined}
          pressedScale={0.94}
          className="h-11 flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-4"
        >
          <Ionicons name={allCollapsed ? 'chevron-expand' : 'chevron-collapse'} size={16} color={c.muted} />
          <Text className="text-sm font-bold text-muted">{allCollapsed ? 'Expand' : 'Collapse'}</Text>
        </PressableScale>
      ) : null}
      <PressableScale
        onPress={onReset}
        disabled={resetDisabled}
        accessibilityRole="button"
        accessibilityLabel={resetLabel}
        accessibilityState={{ disabled: !!resetDisabled }}
        testID={testID}
        pressedScale={0.94}
        className="h-11 flex-row items-center gap-1.5 rounded-full border border-danger/30 bg-dangerDim px-4"
      >
        <Ionicons name="refresh" size={16} color={c.danger} />
        <Text className="text-sm font-bold text-danger">{resetLabel}</Text>
      </PressableScale>
    </View>
  );
}
