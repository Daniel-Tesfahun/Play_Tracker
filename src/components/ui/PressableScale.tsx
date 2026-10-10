import { useState, type ReactNode } from 'react';
import { cssInterop } from 'nativewind';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

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
 * Pressable with a spring scale + opacity response. Uses the core Animated API
 * on the native driver so the feedback stays on the UI thread.
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

  const animateTo = (toValue: number) =>
    Animated.spring(progress, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: toValue === 0 ? 6 : 0,
    }).start();

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, pressedScale] });
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] });

  return (
    <Animated.View
      className={containerClassName}
      style={[containerStyle, { transform: [{ scale }], opacity: disabled ? 0.4 : opacity }]}
    >
      <Pressable
        {...rest}
        disabled={disabled}
        hitSlop={hitSlop}
        className={className}
        style={style}
        onPressIn={(e) => {
          animateTo(1);
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          animateTo(0);
          onPressOut?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
