import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

import { CollapseButton } from '@/components/motion/CollapseButton';
import { Pulse } from '@/components/motion/Pulse';
import { SwapIn } from '@/components/motion/SwapIn';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import type { Scooter } from '@/db/types';
import { computeTimerState, type TimerPhase } from '@/lib/timer';
import { formatClock, formatDuration, formatMinutes, type ClockPrefs } from '@/lib/time';
import { usePalette } from '@/theme/usePalette';

import { pausedStyle, phaseStyle } from './phaseStyle';
import { PresetBubbles } from './PresetBubbles';
import { headline } from './scooterStatus';
import { TimerProgress } from './TimerProgress';

const MINUTE = 60_000;

interface ScooterCardProps {
  scooter: Scooter;
  now: number;
  /** Device locale, time zone, and 12/24h setting for the start/end clock. */
  clock?: ClockPrefs;
  collapsed?: boolean;
  onToggleCollapse?: (id: number) => void;
  /** Press and hold the header: enter select mode with this card selected. */
  onLongPressSelect?: (id: number) => void;
  onAllocate: (id: number, minutes: number) => void;
  onClearAllocation: (id: number) => void;
  onStart: (id: number) => void;
  onStop: (id: number) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
  /** Opens the custom-minutes sheet for this scooter. */
  onCustomMinutes: (scooter: Scooter) => void;
  onReset: (scooter: Scooter) => void;
  onEdit: (scooter: Scooter) => void;
}

function caption(scooter: Scooter, phase: TimerPhase, elapsedMs: number, clock: ClockPrefs) {
  if (scooter.pausedAt !== null) {
    return `Paused at ${formatClock(scooter.pausedAt, clock)} · clock stopped, tap Resume`;
  }
  if (phase === 'idle') {
    return scooter.allocatedMinutes > 0
      ? `${formatMinutes(scooter.allocatedMinutes)} booked · tap Start when they ride off`
      : 'Book time below, or start an open ride';
  }
  const started = `Started ${formatClock(scooter.startedAt ?? 0, clock)}`;
  if (phase === 'open') return `${started} · counting up`;
  if (phase === 'expired')
    return `${started} · over by ${formatDuration(elapsedMs - scooter.allocatedMinutes * MINUTE)}`;
  return `${started} · ${formatDuration(elapsedMs)} of ${formatMinutes(scooter.allocatedMinutes)}`;
}

function ScooterCardBase({
  scooter,
  now,
  clock = {},
  collapsed = false,
  onToggleCollapse,
  onLongPressSelect,
  onAllocate,
  onClearAllocation,
  onStart,
  onStop,
  onPause,
  onResume,
  onCustomMinutes,
  onReset,
  onEdit,
}: ScooterCardProps) {
  const c = usePalette();
  const timer = computeTimerState(scooter.startedAt, scooter.allocatedMinutes, now, {
    pausedAt: scooter.pausedAt,
    pausedMs: scooter.pausedMs,
  });
  const paused = timer.paused;
  const style = paused ? pausedStyle : phaseStyle[timer.phase];
  const color = c[style.color];
  const running = scooter.startedAt !== null;
  const dirty = running || scooter.allocatedMinutes > 0;
  const idleAndEmpty = timer.phase === 'idle' && scooter.allocatedMinutes === 0;
  // Running: full-strength timer. Booked: dimmer countdown preview. Empty: a quiet "Ready".
  const headlineClass = running ? 'text-6xl text-ink' : idleAndEmpty ? 'text-4xl text-muted' : 'text-6xl text-muted';
  // Explicit line heights (~1.2× the size) so Plus Jakarta's descenders, like the "y" in
  // "Ready", are never clipped on Android. Mirrors the fontSize scale in tailwind.config.js.
  const headlineLineHeight = collapsed ? 26 : idleAndEmpty ? 44 : 72;

  // Buzz once when a ride crosses into "ending soon" or overtime.
  const lastPhase = useRef(timer.phase);
  useEffect(() => {
    const prev = lastPhase.current;
    lastPhase.current = timer.phase;
    if (prev === timer.phase || !running || paused) return;
    if (timer.phase === 'warning') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (timer.phase === 'expired') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [timer.phase, running, paused]);

  // Paused time pushes the end back, so it's added in; while paused there is no end time yet.
  const endsAt =
    running && scooter.allocatedMinutes > 0
      ? paused
        ? 'On hold'
        : `${timer.phase === 'expired' ? 'Ended' : 'Ends'} ${formatClock(
            (scooter.startedAt ?? 0) + scooter.pausedMs + scooter.allocatedMinutes * MINUTE,
            clock,
          )}`
      : undefined;

  const pauseButton = (size: 'md' | 'lg') => (
    <SwapIn swapKey={paused ? 'resume' : 'pause'}>
      {paused ? (
        <IconButton
          icon="play"
          label={`Resume ride on ${scooter.name}`}
          variant="filled"
          size={size}
          color={c.neon}
          onPress={() => onResume(scooter.id)}
          testID={`scooter-resume-${scooter.id}`}
        />
      ) : (
        <IconButton
          icon="pause"
          label={`Pause ride on ${scooter.name}`}
          variant="filled"
          size={size}
          color={c.ink}
          onPress={() => onPause(scooter.id)}
          testID={`scooter-pause-${scooter.id}`}
        />
      )}
    </SwapIn>
  );

  const timeText = (
    <Text
      testID={`scooter-time-${scooter.id}`}
      className={
        collapsed
          ? `text-lg font-extrabold ${running ? 'text-ink' : 'text-muted'}`
          : `mt-3 font-extrabold ${headlineClass}`
      }
      // Only set `color` when overriding: a `color: undefined` key would wipe the class color (→ black).
      style={[
        { fontVariant: ['tabular-nums'], lineHeight: headlineLineHeight },
        paused ? { color: c.muted } : timer.phase === 'expired' ? { color } : null,
      ]}
    >
      {headline(timer.phase, timer.remainingMs, timer.elapsedMs, timer.overtimeMs)}
    </Text>
  );

  const overtime = timer.phase === 'expired' && !paused;

  const badge = (
    <SwapIn swapKey={style.label} style={{ alignSelf: 'flex-start' }}>
      <Pulse active={overtime}>
        <View testID={`scooter-badge-${scooter.id}`} className={`rounded-full px-2.5 py-1 ${style.badge}`}>
          <Text className={`text-[10px] font-extrabold uppercase tracking-wider ${style.badgeText}`} numberOfLines={1}>
            {style.label}
          </Text>
        </View>
      </Pulse>
    </SwapIn>
  );

  return (
    <View
      testID={`scooter-card-${scooter.id}`}
      className={`flex-1 overflow-hidden rounded-3xl border bg-surface ${style.border}`}
    >
      <Pulse active={overtime}>
        <View className={`h-1 ${style.strip}`} />
      </Pulse>

      <View className={collapsed ? 'px-4 py-3' : 'p-4 pt-3'}>
        {/*
          The whole header row toggles collapse on tap and starts selecting on press-and-hold;
          buttons inside it keep their own presses. It's touch-only (accessible={false}) because
          an accessible container would hide those buttons from screen readers, which instead
          use the collapse button and the list's Select button.
        */}
        <PressableScale
          onPress={() => onToggleCollapse?.(scooter.id)}
          onLongPress={() => onLongPressSelect?.(scooter.id)}
          delayLongPress={350}
          pressedScale={0.99}
          accessible={false}
          testID={`scooter-header-${scooter.id}`}
          className="flex-row items-center gap-3"
        >
          <View
            accessible
            accessibilityLabel={`${scooter.name}, ${style.label}${collapsed ? `, ${headline(timer.phase, timer.remainingMs, timer.elapsedMs, timer.overtimeMs)}` : ''}`}
            className="flex-1 flex-row items-center gap-3"
          >
            <View
              className={`h-11 w-11 items-center justify-center rounded-2xl ${running ? style.badge : 'bg-scootDim'}`}
            >
              <MaterialCommunityIcons name="scooter" size={22} color={running ? color : c.scoot} />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-base font-bold text-ink" numberOfLines={1}>
                {scooter.name}
              </Text>
              {collapsed ? (
                // Collapsed rows are tight: badge + live time share the line under the name,
                // leaving the right side for the action buttons only.
                <View className="flex-row items-center gap-2">
                  {badge}
                  {timeText}
                </View>
              ) : (
                badge
              )}
            </View>
          </View>

          {collapsed ? (
            <>
              {running ? pauseButton('md') : null}
              {running ? (
                <IconButton
                  icon="stop"
                  label={`End ride on ${scooter.name}`}
                  variant="filled"
                  color={timer.phase === 'expired' ? c.danger : c.ink}
                  onPress={() => onStop(scooter.id)}
                  testID={`scooter-stop-${scooter.id}`}
                />
              ) : (
                <IconButton
                  icon="play"
                  label={`Start ride on ${scooter.name}`}
                  variant="filled"
                  color={c.neon}
                  onPress={() => onStart(scooter.id)}
                  testID={`scooter-start-${scooter.id}`}
                />
              )}
            </>
          ) : (
            <IconButton
              icon="ellipsis-horizontal"
              label={`Edit ${scooter.name}`}
              onPress={() => onEdit(scooter)}
              testID={`scooter-edit-${scooter.id}`}
            />
          )}
          {onToggleCollapse ? (
            <View className="-mr-2">
              <CollapseButton
                collapsed={collapsed}
                label={collapsed ? `Expand ${scooter.name}` : `Collapse ${scooter.name}`}
                onPress={() => onToggleCollapse(scooter.id)}
                testID={`scooter-collapse-${scooter.id}`}
              />
            </View>
          ) : null}
        </PressableScale>

        {collapsed ? null : (
          <>
            {timeText}
            <Text
              testID={`scooter-caption-${scooter.id}`}
              className="mt-0.5 text-xs font-medium text-muted"
              numberOfLines={1}
            >
              {caption(scooter, timer.phase, timer.elapsedMs, clock)}
            </Text>

            {scooter.allocatedMinutes > 0 ? (
              <View className="mt-4">
                <TimerProgress
                  progress={timer.progress}
                  color={running ? color : c.scoot}
                  milestonesReached={timer.milestonesReached}
                  endLabel={endsAt}
                />
              </View>
            ) : null}

            <View className="mt-4">
              <PresetBubbles
                scooterId={scooter.id}
                allocatedMinutes={scooter.allocatedMinutes}
                onAdd={(m) => onAllocate(scooter.id, m)}
                onClear={() => onClearAllocation(scooter.id)}
                onCustom={() => onCustomMinutes(scooter)}
                canClear={!running}
              />
            </View>

            <View className="mt-3 flex-row gap-3">
              {running ? (
                <Button
                  label="End ride"
                  icon="stop"
                  variant={timer.phase === 'expired' ? 'dangerSolid' : 'secondary'}
                  onPress={() => onStop(scooter.id)}
                  testID={`scooter-stop-${scooter.id}`}
                  className="flex-1"
                />
              ) : (
                <Button
                  label="Start ride"
                  icon="play"
                  variant="go"
                  onPress={() => onStart(scooter.id)}
                  testID={`scooter-start-${scooter.id}`}
                  className="flex-1"
                />
              )}
              {running ? pauseButton('lg') : null}
              <IconButton
                icon="refresh"
                label={running ? `Cancel ride on ${scooter.name} without saving` : `Reset ${scooter.name}`}
                variant="filled"
                size="lg"
                onPress={() => onReset(scooter)}
                testID={`scooter-reset-${scooter.id}`}
                disabled={!dirty}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export const ScooterCard = memo(ScooterCardBase);
