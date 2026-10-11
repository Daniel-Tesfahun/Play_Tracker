import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo } from 'react';
import { Text, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import type { Zone } from '@/db/types';
import { MAX_PLAYERS_PER_ZONE } from '@/db/zonesRepo';
import { playerShare } from '@/lib/gaming';
import { usePalette } from '@/theme/usePalette';

import { PlayerRow } from './PlayerRow';

interface ZoneCardProps {
  zone: Zone;
  /** Fraction of today's total games played on this zone (0..1). */
  share: number;
  onIncrement: (zoneId: number, playerId?: number | null) => void;
  onDecrementPlayer: (zoneId: number, playerId: number) => void;
  onUndo: (zoneId: number) => void;
  onReset: (zone: Zone) => void;
  onAddPlayer: (zone: Zone) => void;
  onEdit: (zone: Zone) => void;
}

function ZoneCardBase({
  zone,
  share,
  onIncrement,
  onDecrementPlayer,
  onUndo,
  onReset,
  onAddPlayer,
  onEdit,
}: ZoneCardProps) {
  const c = usePalette();
  const played = zone.gamesToday > 0;
  const hasPlayers = zone.players.length > 0;

  return (
    <PressableScale
      testID={`zone-card-${zone.id}`}
      onPress={() => onIncrement(zone.id)}
      onLongPress={() => onEdit(zone)}
      delayLongPress={350}
      pressedScale={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${zone.name}, ${zone.gamesToday} games today`}
      accessibilityHint="Tap to add a game. Long press to edit."
      containerStyle={{ flex: 1 }}
      className={`flex-1 rounded-2xl border bg-surface p-4 ${played ? 'border-neon/30' : 'border-line'}`}
    >
      {/* Header: identity + quick actions */}
      <View className="flex-row items-center gap-3">
        <View
          className={`h-10 w-10 items-center justify-center rounded-xl ${played ? 'bg-neonDim' : 'bg-elevated'}`}
        >
          <MaterialCommunityIcons name="sony-playstation" size={20} color={played ? c.neon : c.idle} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-ink" numberOfLines={1}>
            {zone.name}
          </Text>
          <Text className="text-xs text-muted" numberOfLines={1}>
            {zone.currentGame ?? 'No game set'}
          </Text>
        </View>
        <IconButton
          icon="refresh"
          label={`Reset today on ${zone.name}`}
          onPress={() => onReset(zone)}
          testID={`zone-reset-${zone.id}`}
        />
        <View className="-mr-2">
          <IconButton
            icon="ellipsis-horizontal"
            label={`Edit ${zone.name}`}
            onPress={() => onEdit(zone)}
            testID={`zone-edit-${zone.id}`}
          />
        </View>
      </View>

      {/* Count + primary controls */}
      <View className="mt-4 flex-row items-end">
        <View className="flex-1">
          <Text
            testID={`zone-count-${zone.id}`}
            className={`text-6xl font-bold tracking-tighter ${played ? 'text-ink' : 'text-faint'}`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {zone.gamesToday}
          </Text>
          <Text className="-mt-1 text-xs text-muted">games today</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <IconButton
            icon="arrow-undo"
            label={`Undo last game on ${zone.name}`}
            variant="filled"
            onPress={() => onUndo(zone.id)}
            testID={`zone-undo-${zone.id}`}
          />
          <PressableScale
            onPress={() => onIncrement(zone.id)}
            accessibilityRole="button"
            accessibilityLabel={`Add a game on ${zone.name}`}
            testID={`zone-plus-${zone.id}`}
            pressedScale={0.92}
            className="h-14 min-w-[72px] flex-row items-center justify-center gap-1 rounded-2xl bg-ink px-4"
          >
            <Ionicons name="add" size={22} color={c.canvas} />
            <Text className="text-lg font-bold text-canvas">1</Text>
          </PressableScale>
        </View>
      </View>

      <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-elevated">
        <View className="h-full rounded-full bg-neon" style={{ width: `${Math.round(share * 100)}%` }} />
      </View>

      {/* Players */}
      {hasPlayers ? (
        <View className="mt-4 border-t border-line pt-2">
          {zone.players.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              share={playerShare(player, zone)}
              onIncrement={() => onIncrement(zone.id, player.id)}
              onDecrement={() => onDecrementPlayer(zone.id, player.id)}
            />
          ))}
          {zone.unassignedToday > 0 ? (
            <Text className="pt-1 text-xs text-faint">
              {zone.unassignedToday} {zone.unassignedToday === 1 ? 'game' : 'games'} not credited to a player
            </Text>
          ) : null}
        </View>
      ) : null}

      {zone.players.length < MAX_PLAYERS_PER_ZONE ? (
        <PressableScale
          onPress={() => onAddPlayer(zone)}
          accessibilityRole="button"
          accessibilityLabel={`Add a player to ${zone.name}`}
          testID={`zone-add-player-${zone.id}`}
          pressedScale={0.95}
          containerClassName="mt-3 self-start"
          className="h-11 flex-row items-center gap-2 rounded-full border border-dashed border-lineStrong px-4"
        >
          <Ionicons name="person-add-outline" size={16} color={c.muted} />
          <Text className="text-sm font-medium text-muted">{hasPlayers ? 'Add player' : 'Add players (optional)'}</Text>
        </PressableScale>
      ) : null}
    </PressableScale>
  );
}

export const ZoneCard = memo(ZoneCardBase);
