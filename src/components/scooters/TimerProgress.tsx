import { Text, View } from 'react-native';

import { AnimatedBar } from '@/components/motion/AnimatedBar';
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
        <Text className="text-sm font-extrabold" style={{ color, fontVariant: ['tabular-nums'] }}>
          {pct}%
        </Text>
        {endLabel ? <Text className="text-xs font-semibold text-muted">{endLabel}</Text> : null}
      </View>

      <View className="h-5 overflow-hidden rounded-full bg-elevated">
        {/* Ticks once a second, so a 1s linear glide makes the bar move continuously. */}
        <AnimatedBar percent={progress * 100} color={color} duration={1000} linear testID="timer-progress-fill" />
        {inner.map((m) => (
          <View key={m} className="absolute bottom-0 top-0 w-0.5 bg-surface/80" style={{ left: `${m * 100}%` }} />
        ))}
      </View>

      <View className="mt-1.5 h-4">
        {inner.map((m) => {
          const reached = milestonesReached.includes(m);
          return (
            <Text
              key={m}
              className={`absolute w-10 text-center text-[11px] ${reached ? 'font-bold' : 'font-medium text-faint'}`}
              // No `color` key unless reached: undefined would wipe text-faint and render black.
              style={[{ left: `${m * 100}%`, marginLeft: -20 }, reached ? { color } : null]}
            >
              {m * 100}%
            </Text>
          );
        })}
      </View>
    </View>
  );
}
