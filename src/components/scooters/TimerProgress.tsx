import { Text, View } from 'react-native';

import { MILESTONES } from '@/lib/timer';

interface TimerProgressProps {
  progress: number;
  color: string;
  milestonesReached: number[];
  /** Right-aligned caption, e.g. "Ends 2:45 PM". */
  endLabel?: string;
}

/** Tall progress track with labelled milestone ticks; passed milestones light up. */
export function TimerProgress({ progress, color, milestonesReached, endLabel }: TimerProgressProps) {
  const pct = Math.round(progress * 100);
  const inner = MILESTONES.filter((m) => m < 1);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      testID="timer-progress"
    >
      <View className="mb-2 flex-row items-baseline justify-between">
        <Text className="text-sm font-semibold text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          {pct}%
        </Text>
        {endLabel ? <Text className="text-xs text-muted">{endLabel}</Text> : null}
      </View>

      <View className="h-4 overflow-hidden rounded-full bg-elevated">
        <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        {inner.map((m) => (
          <View
            key={m}
            className="absolute bottom-0 top-0 w-0.5 bg-canvas/70"
            style={{ left: `${m * 100}%` }}
          />
        ))}
      </View>

      <View className="mt-1.5 h-4">
        {inner.map((m) => {
          const reached = milestonesReached.includes(m);
          return (
            <Text
              key={m}
              className={`absolute w-10 text-center text-[11px] ${reached ? 'font-semibold' : 'text-faint'}`}
              style={{ left: `${m * 100}%`, marginLeft: -20, color: reached ? color : undefined }}
            >
              {m * 100}%
            </Text>
          );
        })}
      </View>
    </View>
  );
}
