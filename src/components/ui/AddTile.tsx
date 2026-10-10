import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import palette from '@/theme/palette';

interface AddTileProps {
  label: string;
  onPress: () => void;
  minHeight?: number;
}

/** Dashed placeholder tile that sits at the end of a grid. */
export function AddTile({ label, onPress, minHeight = 168 }: AddTileProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      containerStyle={{ flex: 1 }}
      className="flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed border-lineStrong"
      style={{ minHeight }}
    >
      <Ionicons name="add" size={22} color={palette.muted} />
      <Text className="text-sm font-medium text-muted">{label}</Text>
    </PressableScale>
  );
}
