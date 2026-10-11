import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { SwapIn } from '@/components/motion/SwapIn';
import { usePalette } from '@/theme/usePalette';

import { PressableScale } from './PressableScale';

interface SelectRowProps {
  id: number;
  title: string;
  subtitle: string;
  selected: boolean;
  onToggle: (id: number) => void;
  /** Right side, e.g. a count or a live timer. */
  trailing?: ReactNode;
  /** Section accent for the selected state. */
  tone: 'brand' | 'scoot';
  testID?: string;
}

/**
 * Compact, tap-to-select version of a card shown in bulk-select mode.
 * It has no action buttons, so nothing can be counted or started by accident.
 */
function SelectRowBase({ id, title, subtitle, selected, onToggle, trailing, tone, testID }: SelectRowProps) {
  const c = usePalette();
  const accent = tone === 'brand' ? c.brandInk : c.scoot;
  const selectedBox = tone === 'brand' ? 'border-brand bg-brandDim' : 'border-scoot bg-scootDim';

  return (
    <PressableScale
      onPress={() => onToggle(id)}
      accessibilityRole="checkbox"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ checked: selected }}
      testID={testID}
      pressedScale={0.98}
      containerStyle={{ flex: 1 }}
      className={`flex-1 flex-row items-center gap-3 rounded-3xl border-2 px-4 py-3 ${selected ? selectedBox : 'border-line bg-surface'}`}
    >
      <SwapIn swapKey={selected ? 'on' : 'off'}>
        <View
          className={`h-7 w-7 items-center justify-center rounded-full border-2 ${selected ? '' : 'border-lineStrong'}`}
          style={selected ? { backgroundColor: accent, borderColor: accent } : undefined}
        >
          {selected ? <Ionicons name="checkmark" size={18} color={c.canvas} /> : null}
        </View>
      </SwapIn>
      <View className="flex-1">
        <Text className="text-base font-bold text-ink" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-xs font-medium text-muted" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {trailing}
    </PressableScale>
  );
}

export const SelectRow = memo(SelectRowBase);
