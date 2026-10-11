import { useEffect, type ReactNode } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface PulseProps {
  /** Pulse only while true, e.g. a ride in overtime. */
  active: boolean;
  children: ReactNode;
  /** Lowest opacity in the cycle. */
  min?: number;
}

/** Gently breathes its children's opacity to draw the eye; still when inactive or with reduced motion. */
export function Pulse({ active, children, min = 0.45 }: PulseProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (active && !reduceMotion) {
      opacity.value = withRepeat(
        withSequence(withTiming(min, { duration: 650 }), withTiming(1, { duration: 650 })),
        -1,
      );
    } else {
      cancelAnimation(opacity);
      opacity.value = withTiming(1, { duration: 150 });
    }
    return () => cancelAnimation(opacity);
  }, [active, min, reduceMotion, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
