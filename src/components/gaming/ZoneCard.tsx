import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo } from 'react';
import { Text, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import type { Zone } from '@/db/types';
import { MAX_PLAYERS_PER_ZONE } from '@/db/zonesRepo';
import { playerShare } from '@/lib/gaming';
import { usePalette, usePlayerColor } from '@/theme/usePalette';

import { PlayerRow } from './PlayerRow';

interface ZoneCardProps {
  zone: Zone;
  /** Fraction of today's total games played on this station (0..1). */
  share: number;
  collapsed?: boolean;
  onToggleCollapse?: (zoneId: number) => void;
  onIncrement: (zoneId: number, playerId?: number | null) => void;
  onDecrementPlayer: (zoneId: number, playerId: number) => void;
  onUndo: (zoneId: number) => void;
  onReset: (zone: Zone) => void;
  onAddPlayer: (zone: Zone) => void;
  onEdit: (zone: Zone) => void;
}

function subtitle(zone: Zone): string {
  const game = zone.currentGame ?? 'No game set';
  if (zone.players.length === 0) return game;
  return `${game} · ${zone.players.length} ${zone.players.length === 1 ? 'player' : 'players'}`;
}

/**
 * One PS + TV station. Games are added only with the +1 / player buttons;
 * tapping the header (icon + name) collapses or expands the card, long-press edits.
 */
function ZoneCardBase({
  zone,
  share,
  collapsed = false,
  onToggleCollapse,
  onIncrement,
  onDecrementPlayer,
  onUndo,
  onReset,
  onAddPlayer,
  onEdit,
}: ZoneCardProps) {
  const c = usePalette();
  const playerColor = usePlayerColor();
  const played = zone.gamesToday > 0;
  const hasPlayers = zone.players.length > 0;

  const plusButton = (size: 'sm' | 'lg') => (
    <PressableScale
      onPress={() => onIncrement(zone.id)}
      accessibilityRole="button"
      accessibilityLabel={`Add a game on ${zone.name}`}
      testID={`zone-plus-${zone.id}`}
      pressedScale={0.92}
      className={`flex-row items-center justify-center gap-1 rounded-2xl bg-brand ${
        size === 'lg' ? 'h-14 min-w-[84px] px-5' : 'h-11 min-w-[56px] px-3'
      }`}
    >
      <Ionicons name="add" size={size === 'lg' ? 24 : 20} color={c.onAccent} />
      <Text className={`font-extrabold text-onAccent ${size === 'lg' ? 'text-xl' : 'text-base'}`}>1</Text>
    </PressableScale>
  );

  return (
    <View
      testID={`zone-card-${zone.id}`}
      className={`flex-1 overflow-hidden rounded-3xl border bg-surface ${played ? 'border-brand/40' : 'border-line'}`}
    >
      {/* Accent strip: lights up once the station has been played today. */}
      <View className={`h-1 ${played ? 'bg-brand' : 'bg-transparent'}`} />

      <View className={collapsed ? 'px-4 py-3' : 'p-4 pt-3'}>
        <View className="flex-row items-center gap-3">
          <PressableScale
            onPress={() => onToggleCollapse?.(zone.id)}
            onLongPress={() => onEdit(zone)}
            delayLongPress={350}
            pressedScale={0.98}
            accessibilityRole="button"
            accessibilityLabel={`${zone.name}, ${zone.gamesToday} games today`}
            accessibilityHint={`Tap to ${collapsed ? 'expand' : 'collapse'}. Long press to edit.`}
            accessibilityState={{ expanded: !collapsed }}
            testID={`zone-header-${zone.id}`}
            containerStyle={{ flex: 1 }}
            className="flex-row items-center gap-3"
          >
            <View
              className={`h-11 w-11 items-center justify-center rounded-2xl ${played ? 'bg-brandDim' : 'bg-elevated'}`}
            >
              <MaterialCommunityIcons name="sony-playstation" size={22} color={played ? c.brandInk : c.idle} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-ink" numberOfLines={1}>
                {zone.name}
              </Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                <Ionicons name="disc-outline" size={12} color={zone.currentGame ? c.muted : c.faint} />
                <Text
                  className={`flex-1 text-xs font-medium ${zone.currentGame ? 'text-muted' : 'text-faint'}`}
                  numberOfLines={1}
                >
                  {subtitle(zone)}
                </Text>
              </View>
            </View>
          </PressableScale>

          {collapsed ? (
            <>
              <Text
                testID={`zone-count-${zone.id}`}
                className={`min-w-[36px] text-right text-3xl font-extrabold ${played ? 'text-ink' : 'text-faint'}`}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {zone.gamesToday}
              </Text>
              {plusButton('sm')}
            </>
          ) : (
            <IconButton
              icon="ellipsis-horizontal"
              label={`Edit ${zone.name}`}
              onPress={() => onEdit(zone)}
              testID={`zone-edit-${zone.id}`}
            />
          )}
          {onToggleCollapse ? (
            <View className="-mr-2">
              <IconButton
                icon={collapsed ? 'chevron-down' : 'chevron-up'}
                label={collapsed ? `Expand ${zone.name}` : `Collapse ${zone.name}`}
                onPress={() => onToggleCollapse(zone.id)}
                testID={`zone-collapse-${zone.id}`}
              />
            </View>
          ) : null}
        </View>

        {collapsed ? null : (
          <>
            <View className="mt-3 flex-row items-end">
              <View className="flex-1">
                <Text
                  testID={`zone-count-${zone.id}`}
                  className={`text-6xl font-extrabold ${played ? 'text-ink' : 'text-faint'}`}
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {zone.gamesToday}
                </Text>
                <Text className="-mt-1 text-xs font-semibold uppercase tracking-wider text-faint">games today</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <IconButton
                  icon="refresh"
                  label={`Reset today on ${zone.name}`}
                  variant="filled"
                  size="lg"
                  onPress={() => onReset(zone)}
                  testID={`zone-reset-${zone.id}`}
                />
                <IconButton
                  icon="arrow-undo"
                  label={`Undo last game on ${zone.name}`}
                  variant="filled"
                  size="lg"
                  onPress={() => onUndo(zone.id)}
                  testID={`zone-undo-${zone.id}`}
                />
                {plusButton('lg')}
              </View>
            </View>

            <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-elevated">
              <View className="h-full rounded-full bg-brand" style={{ width: `${Math.round(share * 100)}%` }} />
            </View>

            {hasPlayers ? (
              <View className="mt-3 border-t border-line pt-1">
                {zone.players.map((player, i) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    share={playerShare(player, zone)}
                    color={playerColor(i)}
                    onIncrement={() => onIncrement(zone.id, player.id)}
                    onDecrement={() => onDecrementPlayer(zone.id, player.id)}
                  />
                ))}
                {zone.unassignedToday > 0 ? (
                  <Text className="pt-1 text-xs font-medium text-faint">
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
                className="h-11 flex-row items-center gap-2 rounded-full border border-dashed border-brand/40 px-4"
              >
                <Ionicons name="person-add-outline" size={16} color={c.brandInk} />
                <Text className="text-sm font-semibold text-brandInk">
                  {hasPlayers ? 'Add player' : 'Add players (optional)'}
                </Text>
              </PressableScale>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

export const ZoneCard = memo(ZoneCardBase);
