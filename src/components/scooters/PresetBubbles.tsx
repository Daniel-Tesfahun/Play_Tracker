import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { PRESET_MINUTES } from '@/lib/timer';
import { formatMinutes } from '@/lib/time';
import { usePalette } from '@/theme/usePalette';

interface PresetBubblesProps {
  scooterId: number;
  allocatedMinutes: number;
  onAdd: (minutes: number) => void;
  onClear: () => void;
  /** Clearing mid-ride would silently turn a booking into open-ended time, so it's hidden then. */
  canClear: boolean;
}

export function PresetBubbles({
  scooterId,
  allocatedMinutes,
  onAdd,
  onClear,
  canClear,
}: PresetBubblesProps) {
  const c = usePalette();
  return (
    <View className="flex-row items-center gap-2">
      {PRESET_MINUTES.map((m) => (
        <PressableScale
          key={m}
          testID={`preset-${scooterId}-${m}`}
          onPress={() => onAdd(m)}
          accessibilityRole="button"
          accessibilityLabel={`Add ${m} minutes`}
          pressedScale={0.9}
          className="h-11 min-w-[56px] items-center justify-center rounded-full border border-line bg-elevated px-3"
        >
          <Text className="text-sm font-semibold text-ink">+{formatMinutes(m)}</Text>
        </PressableScale>
      ))}
      <View className="flex-1" />
      {allocatedMinutes > 0 && canClear ? (
        <PressableScale
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear allocated time"
          pressedScale={0.9}
          className="h-11 flex-row items-center gap-1 rounded-full px-3"
        >
          <Text className="text-xs font-semibold text-muted">{formatMinutes(allocatedMinutes)}</Text>
          <Ionicons name="close-circle" size={16} color={c.faint} />
        </PressableScale>
      ) : null}
    </View>
  );
}
