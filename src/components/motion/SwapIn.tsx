import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

interface SwapInProps {
  /** When this changes, the content re-enters with a small spring zoom. */
  swapKey: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Zooms content in whenever `swapKey` changes: badges, pause/resume, theme icon. */
export function SwapIn({ swapKey, children, style }: SwapInProps) {
  return (
    <Animated.View key={swapKey} entering={ZoomIn.springify().damping(14).stiffness(240)} style={style}>
      {children}
    </Animated.View>
  );
}
