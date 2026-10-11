import { useEffect, useRef } from 'react';
import { Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedNumberProps {
  value: number | string;
  className?: string;
  style?: StyleProp<TextStyle>;
  /** Wrapper layout, e.g. { alignSelf: 'flex-start' } so the pop centers on the text, not the row. */
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
}

/** Text that gives a quick "pop" whenever its value changes (not on first render). */
export function AnimatedNumber({
  value,
  className,
  style,
  containerStyle,
  testID,
  numberOfLines,
  adjustsFontSizeToFit,
}: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduceMotion) return;
    scale.value = withSequence(
      withTiming(1.18, { duration: 90 }),
      withSpring(1, { damping: 11, stiffness: 280 }),
    );
  }, [value, reduceMotion, scale]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[containerStyle, popStyle]}>
      <Text
        testID={testID}
        className={className}
        style={[{ fontVariant: ['tabular-nums'] }, style]}
        numberOfLines={numberOfLines}
        adjustsFontSizeToFit={adjustsFontSizeToFit}
      >
        {value}
      </Text>
    </Animated.View>
  );
}
