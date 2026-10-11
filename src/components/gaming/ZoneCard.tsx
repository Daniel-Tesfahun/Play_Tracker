import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { AnimatedBar } from '@/components/motion/AnimatedBar';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { CollapseButton } from '@/components/motion/CollapseButton';

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
  /** Press and hold the header: enter select mode with this card selected. */
  onLongPressSelect?: (zoneId: number) => void;
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
  onLongPressSelect,
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

  // With players, every game belongs to someone: the station-level +1 goes away.
  // Collapsed, a players chip stands in for it and opens the card to pick a player.
  const playersChip = (
    <PressableScale
      onPress={() => onToggleCollapse?.(zone.id)}
      accessibilityRole="button"
      accessibilityLabel={`${zone.players.length} players on ${zone.name}. Expand to add a game for a player`}
      testID={`zone-players-chip-${zone.id}`}
      pressedScale={0.92}
      className="h-11 min-w-[56px] flex-row items-center justify-center gap-1.5 rounded-2xl border border-brand/40 bg-brandDim px-3"
    >
      <Ionicons name="people" size={18} color={c.brandInk} />
      <Text className="text-base font-extrabold text-brandInk">{zone.players.length}</Text>
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
        {/*
          The whole header row toggles collapse on tap and starts selecting on press-and-hold;
          buttons inside it keep their own presses. It's touch-only (accessible={false}) because
          an accessible container would hide those buttons from screen readers, which instead
          use the collapse button and the list's Select button.
        */}
        <PressableScale
          onPress={() => onToggleCollapse?.(zone.id)}
          onLongPress={() => onLongPressSelect?.(zone.id)}
          delayLongPress={350}
          pressedScale={0.99}
          accessible={false}
          testID={`zone-header-${zone.id}`}
          className="flex-row items-center gap-3"
        >
          <View
            accessible
            accessibilityLabel={`${zone.name}, ${zone.gamesToday} games today`}
            className="flex-1 flex-row items-center gap-3"
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
          </View>

          {collapsed ? (
            <>
              <AnimatedNumber
                testID={`zone-count-${zone.id}`}
                value={zone.gamesToday}
                className={`min-w-[36px] text-right text-3xl font-extrabold ${played ? 'text-ink' : 'text-faint'}`}
              />
              {hasPlayers ? playersChip : plusButton('sm')}
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
              <CollapseButton
                collapsed={collapsed}
                label={collapsed ? `Expand ${zone.name}` : `Collapse ${zone.name}`}
                onPress={() => onToggleCollapse(zone.id)}
                testID={`zone-collapse-${zone.id}`}
              />
            </View>
          ) : null}
        </PressableScale>

        {collapsed ? null : (
          <>
            <View className="mt-3 flex-row items-end">
              <View className="flex-1">
                <AnimatedNumber
                  testID={`zone-count-${zone.id}`}
                  value={zone.gamesToday}
                  className={`text-6xl font-extrabold ${played ? 'text-ink' : 'text-faint'}`}
                  containerStyle={{ alignSelf: 'flex-start' }}
                />
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
                {hasPlayers ? null : plusButton('lg')}
              </View>
            </View>

            <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-elevated">
              <AnimatedBar percent={Math.round(share * 100)} color={c.brand} />
            </View>

            {hasPlayers ? (
              <View className="mt-3 border-t border-line pt-1">
                {zone.players.map((player, i) => (
                  // Players fade in when added, out when removed, and the rest slide into place.
                  <Animated.View
                    key={player.id}
                    entering={FadeIn.duration(220)}
                    exiting={FadeOut.duration(160)}
                    layout={LinearTransition.duration(200)}
                  >
                    <PlayerRow
                      player={player}
                      share={playerShare(player, zone)}
                      color={playerColor(i)}
                      onIncrement={() => onIncrement(zone.id, player.id)}
                      onDecrement={() => onDecrementPlayer(zone.id, player.id)}
                    />
                  </Animated.View>
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
