import { View } from 'react-native';

import { MILESTONES } from '@/lib/timer';

interface TimerProgressProps {
  progress: number;
  color: string;
  milestonesReached: number[];
}

/** Progress track with tick marks at each milestone; passed ticks light up. */
export function TimerProgress({ progress, color, milestonesReached }: TimerProgressProps) {
  return (
    <View className="h-5 justify-center">
      <View className="h-1.5 overflow-hidden rounded-full bg-elevated">
        <View
          className="h-full rounded-full"
          style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: color }}
        />
      </View>
      {MILESTONES.filter((m) => m < 1).map((m) => {
        const reached = milestonesReached.includes(m);
        return (
          <View
            key={m}
            className={`absolute h-3 w-0.5 rounded-full ${reached ? '' : 'bg-lineStrong'}`}
            style={{ left: `${m * 100}%`, backgroundColor: reached ? color : undefined }}
          />
        );
      })}
    </View>
  );
}
