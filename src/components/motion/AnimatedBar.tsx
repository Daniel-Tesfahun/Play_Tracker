import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedBarProps {
  /** 0..100 */
  percent: number;
  color: string;
  /**
   * How long the fill takes to reach a new value. Timers that update every
   * second use ~1s with linear easing so the bar moves continuously.
   */
  duration?: number;
  linear?: boolean;
  testID?: string;
}

/** Progress fill that glides to its new width instead of jumping. Place inside a track View. */
export function AnimatedBar({ percent, color, duration = 450, linear = false, testID }: AnimatedBarProps) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, percent));
  const width = useSharedValue(clamped);

  useEffect(() => {
    width.value = reduceMotion
      ? clamped
      : withTiming(clamped, { duration, easing: linear ? Easing.linear : Easing.out(Easing.cubic) });
  }, [clamped, duration, linear, reduceMotion, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <Animated.View
      testID={testID}
      style={[{ height: '100%', borderRadius: 999, backgroundColor: color }, fillStyle]}
    />
  );
}
