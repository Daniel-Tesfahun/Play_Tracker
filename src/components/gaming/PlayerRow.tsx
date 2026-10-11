import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Text, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import type { Player } from '@/db/types';
import { usePalette } from '@/theme/usePalette';

interface PlayerRowProps {
  player: Player;
  /** This player's share of the zone's games, 0..1. */
  share: number;
  /** The player's identifying color. */
  color: string;
  onIncrement: () => void;
  onDecrement: () => void;
}

function PlayerRowBase({ player, share, color, onIncrement, onDecrement }: PlayerRowProps) {
  const c = usePalette();
  const pct = Math.round(share * 100);

  return (
    <View testID={`player-row-${player.id}`} className="flex-row items-center gap-3 py-2">
      <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${color}26` }}>
        <Text className="text-sm font-extrabold" style={{ color }}>
          {player.name.trim().charAt(0).toUpperCase()}
        </Text>
      </View>

      <View className="flex-1">
        <View className="flex-row items-baseline justify-between">
          <Text className="flex-1 text-sm font-semibold text-ink" numberOfLines={1}>
            {player.name}
          </Text>
          <Text className="ml-2 text-xs font-medium text-faint">{pct}%</Text>
        </View>
        <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-elevated">
          <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </View>
      </View>

      <Text
        testID={`player-count-${player.id}`}
        className="w-8 text-right text-xl font-extrabold text-ink"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {player.gamesToday}
      </Text>

      <PressableScale
        onPress={onDecrement}
        disabled={player.gamesToday === 0}
        accessibilityRole="button"
        accessibilityLabel={`Remove a game from ${player.name}`}
        testID={`player-minus-${player.id}`}
        pressedScale={0.9}
        className="h-11 w-11 items-center justify-center rounded-xl border border-line bg-elevated"
      >
        <Ionicons name="remove" size={18} color={c.muted} />
      </PressableScale>
      <PressableScale
        onPress={onIncrement}
        accessibilityRole="button"
        accessibilityLabel={`Add a game for ${player.name}`}
        testID={`player-plus-${player.id}`}
        pressedScale={0.9}
        className="h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: color }}
      >
        <Ionicons name="add" size={22} color={c.canvas} />
      </PressableScale>
    </View>
  );
}

export const PlayerRow = memo(PlayerRowBase);
