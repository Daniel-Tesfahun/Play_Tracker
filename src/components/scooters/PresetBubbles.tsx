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

export function PresetBubbles({ scooterId, allocatedMinutes, onAdd, onClear, canClear }: PresetBubblesProps) {
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
          containerStyle={{ flex: 1 }}
          className="h-11 items-center justify-center rounded-full border border-scoot/30 bg-scootDim"
        >
          <Text className="text-sm font-bold text-scoot">+{formatMinutes(m)}</Text>
        </PressableScale>
      ))}
      {allocatedMinutes > 0 && canClear ? (
        <PressableScale
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear booked time"
          testID={`preset-clear-${scooterId}`}
          pressedScale={0.9}
          className="h-11 w-11 items-center justify-center rounded-full border border-line bg-elevated"
        >
          <Ionicons name="close" size={18} color={c.muted} />
        </PressableScale>
      ) : null}
    </View>
  );
}
