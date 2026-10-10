import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo } from 'react';
import { Text, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import type { Zone } from '@/db/types';
import palette from '@/theme/palette';

interface ZoneCardProps {
  zone: Zone;
  /** Fraction of today's total games played on this zone (0..1). */
  share: number;
  onIncrement: (zoneId: number) => void;
  onEdit: (zone: Zone) => void;
}

function ZoneCardBase({ zone, share, onIncrement, onEdit }: ZoneCardProps) {
  const played = zone.gamesToday > 0;

  return (
    <PressableScale
      testID={`zone-card-${zone.id}`}
      onPress={() => onIncrement(zone.id)}
      onLongPress={() => onEdit(zone)}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={`${zone.name}, ${zone.gamesToday} games today`}
      accessibilityHint="Tap to add a game. Long press to edit."
      containerStyle={{ flex: 1 }}
      className={`min-h-[168px] flex-1 rounded-2xl border bg-surface p-4 ${
        played ? 'border-neonDim' : 'border-line'
      }`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center gap-2">
          <View
            className={`h-8 w-8 items-center justify-center rounded-lg ${
              played ? 'bg-neonDim' : 'bg-elevated'
            }`}
          >
            <MaterialCommunityIcons
              name="sony-playstation"
              size={16}
              color={played ? palette.neon : palette.idle}
            />
          </View>
          <View className={`h-1.5 w-1.5 rounded-full ${played ? 'bg-neon' : 'bg-lineStrong'}`} />
        </View>
        <View className="-mr-2 -mt-2">
          <IconButton
            icon="ellipsis-horizontal"
            label={`Edit ${zone.name}`}
            onPress={() => onEdit(zone)}
            testID={`zone-edit-${zone.id}`}
          />
        </View>
      </View>

      <Text className="mt-1 text-sm font-semibold text-ink" numberOfLines={1}>
        {zone.name}
      </Text>

      <View className="mt-auto">
        <Text
          testID={`zone-count-${zone.id}`}
          className={`text-5xl font-bold tracking-tighter ${played ? 'text-ink' : 'text-faint'}`}
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {zone.gamesToday}
        </Text>
        <Text className="text-xs text-muted" numberOfLines={1}>
          {zone.currentGame ?? 'No game set'}
        </Text>

        <View className="mt-3 h-1 overflow-hidden rounded-full bg-elevated">
          <View
            className="h-full rounded-full bg-neon"
            style={{ width: `${Math.round(share * 100)}%` }}
          />
        </View>
      </View>
    </PressableScale>
  );
}

export const ZoneCard = memo(ZoneCardBase);
