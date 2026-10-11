import { cssInterop } from 'nativewind';
import { useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

// NativeWind only wires className into core components; Animated.View needs opting in.
cssInterop(Animated.View, { className: 'style' });

interface PressableScaleProps extends Omit<PressableProps, 'children' | 'style'> {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Applied to the animated wrapper, e.g. flex sizing inside a grid. */
  containerStyle?: StyleProp<ViewStyle>;
  containerClassName?: string;
  /** How far the element shrinks while held. */
  pressedScale?: number;
}

/**
 * Pressable with instant press feedback: a short timed shrink on touch-down
 * and a quick spring back, both on the native driver (UI thread).
 */
export function PressableScale({
  children,
  className,
  containerStyle,
  containerClassName,
  pressedScale = 0.96,
  onPressIn,
  onPressOut,
  disabled,
  hitSlop = 6,
  style,
  ...rest
}: PressableScaleProps) {
  const [progress] = useState(() => new Animated.Value(0));

  const pressIn = () =>
    Animated.timing(progress, {
      toValue: 1,
      duration: 70,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

  const pressOut = () =>
    Animated.spring(progress, { toValue: 0, useNativeDriver: true, speed: 50, bounciness: 6 }).start();

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, pressedScale] });
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] });

  return (
    // The wrapper's opacity is always the animated value. Swapping it for a plain number
    // when disabled can leave the native-driven animation in control (stuck at full
    // opacity on device), so the disabled dimming lives on the inner Pressable instead.
    <Animated.View className={containerClassName} style={[containerStyle, { transform: [{ scale }], opacity }]}>
      <Pressable
        {...rest}
        disabled={disabled}
        hitSlop={hitSlop}
        className={className}
        style={[style, disabled ? { opacity: 0.4 } : null]}
        onPressIn={(e) => {
          pressIn();
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          pressOut();
          onPressOut?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
