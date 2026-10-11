import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import type { Scooter } from '@/db/types';
import { computeTimerState, type TimerPhase } from '@/lib/timer';
import { formatClock, formatDuration, formatMinutes, type ClockPrefs } from '@/lib/time';
import { usePalette } from '@/theme/usePalette';

import { phaseStyle } from './phaseStyle';
import { PresetBubbles } from './PresetBubbles';
import { TimerProgress } from './TimerProgress';

const MINUTE = 60_000;

interface ScooterCardProps {
  scooter: Scooter;
  now: number;
  /** Device locale, time zone, and 12/24h setting for the start/end clock. */
  clock?: ClockPrefs;
  onAllocate: (id: number, minutes: number) => void;
  onClearAllocation: (id: number) => void;
  onStart: (id: number) => void;
  onStop: (id: number) => void;
  onReset: (scooter: Scooter) => void;
  onEdit: (scooter: Scooter) => void;
}

function headline(phase: TimerPhase, remainingMs: number | null, elapsedMs: number, overtimeMs: number) {
  switch (phase) {
    case 'idle':
      return remainingMs === null ? '—' : formatDuration(remainingMs);
    case 'open':
      return formatDuration(elapsedMs);
    case 'active':
    case 'warning':
      return formatDuration(remainingMs ?? 0);
    case 'expired':
      return `+${formatDuration(overtimeMs)}`;
  }
}

function caption(scooter: Scooter, phase: TimerPhase, elapsedMs: number, clock: ClockPrefs) {
  if (phase === 'idle') {
    return scooter.allocatedMinutes > 0 ? 'Booked, ready to start' : 'Add time or start an open ride';
  }
  const started = `Started ${formatClock(scooter.startedAt ?? 0, clock)}`;
  if (phase === 'open') return `${started} · counting up`;
  return `${started} · ${formatDuration(elapsedMs)} of ${formatMinutes(scooter.allocatedMinutes)}`;
}

function ScooterCardBase({
  scooter,
  now,
  clock = {},
  onAllocate,
  onClearAllocation,
  onStart,
  onStop,
  onReset,
  onEdit,
}: ScooterCardProps) {
  const c = usePalette();
  const timer = computeTimerState(scooter.startedAt, scooter.allocatedMinutes, now);
  const style = phaseStyle[timer.phase];
  const color = c[style.color];
  const running = scooter.startedAt !== null;
  const dirty = running || scooter.allocatedMinutes > 0;

  // Buzz once when a ride crosses into "ending soon" or overtime.
  const lastPhase = useRef(timer.phase);
  useEffect(() => {
    const prev = lastPhase.current;
    lastPhase.current = timer.phase;
    if (prev === timer.phase || !running) return;
    if (timer.phase === 'warning') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (timer.phase === 'expired') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [timer.phase, running]);

  const endsAt =
    running && scooter.allocatedMinutes > 0
      ? `${timer.phase === 'expired' ? 'Ended' : 'Ends'} ${formatClock(
          (scooter.startedAt ?? 0) + scooter.allocatedMinutes * MINUTE,
          clock,
        )}`
      : undefined;

  return (
    <View testID={`scooter-card-${scooter.id}`} className={`flex-1 rounded-2xl border bg-surface p-4 ${style.border}`}>
      <PresetBubbles
        scooterId={scooter.id}
        allocatedMinutes={scooter.allocatedMinutes}
        onAdd={(m) => onAllocate(scooter.id, m)}
        onClear={() => onClearAllocation(scooter.id)}
        canClear={!running}
      />

      <View className="mt-4 flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2.5">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-elevated">
            <MaterialCommunityIcons name="scooter" size={20} color={color} />
          </View>
          <Text className="flex-1 text-base font-semibold text-ink" numberOfLines={1}>
            {scooter.name}
          </Text>
        </View>
        <View testID={`scooter-badge-${scooter.id}`} className={`rounded-full px-2.5 py-1 ${style.badge}`}>
          <Text className={`text-[11px] font-bold uppercase tracking-wider ${style.badgeText}`}>{style.label}</Text>
        </View>
        <View className="-mr-2 ml-1">
          <IconButton icon="ellipsis-horizontal" label={`Edit ${scooter.name}`} onPress={() => onEdit(scooter)} />
        </View>
      </View>

      <Text
        testID={`scooter-time-${scooter.id}`}
        className={`mt-3 text-5xl font-bold tracking-tighter ${running ? 'text-ink' : 'text-faint'}`}
        style={{ fontVariant: ['tabular-nums'], color: timer.phase === 'expired' ? color : undefined }}
      >
        {headline(timer.phase, timer.remainingMs, timer.elapsedMs, timer.overtimeMs)}
      </Text>
      <Text testID={`scooter-caption-${scooter.id}`} className="mt-0.5 text-xs text-muted" numberOfLines={1}>
        {caption(scooter, timer.phase, timer.elapsedMs, clock)}
      </Text>

      {scooter.allocatedMinutes > 0 ? (
        <View className="mt-4">
          <TimerProgress
            progress={timer.progress}
            color={color}
            milestonesReached={timer.milestonesReached}
            endLabel={endsAt}
          />
        </View>
      ) : null}

      <View className="mt-4 flex-row gap-3">
        {running ? (
          <Button
            label="End ride"
            icon="stop"
            variant={timer.phase === 'expired' ? 'danger' : 'secondary'}
            onPress={() => onStop(scooter.id)}
            testID={`scooter-stop-${scooter.id}`}
            className="flex-1"
          />
        ) : (
          <Button
            label="Start ride"
            icon="play"
            variant="primary"
            onPress={() => onStart(scooter.id)}
            testID={`scooter-start-${scooter.id}`}
            className="flex-1"
          />
        )}
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
    </View>
  );
}

export const ScooterCard = memo(ScooterCardBase);
