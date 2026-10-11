import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/PressableScale';
import { usePalette } from '@/theme/usePalette';

interface CollapseButtonProps {
  collapsed: boolean;
  label: string;
  onPress: () => void;
  testID?: string;
}

/** 44×44 chevron that rotates between collapsed (down) and expanded (up). */
export function CollapseButton({ collapsed, label, onPress, testID }: CollapseButtonProps) {
  const c = usePalette();
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(collapsed ? 0 : 180);

  useEffect(() => {
    const target = collapsed ? 0 : 180;
    turn.value = reduceMotion ? target : withSpring(target, { damping: 16, stiffness: 220 });
  }, [collapsed, reduceMotion, turn]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: !collapsed }}
      testID={testID}
      pressedScale={0.9}
      className="h-11 w-11 items-center justify-center rounded-xl"
    >
      <Animated.View style={spin}>
        <Ionicons name="chevron-down" size={20} color={c.muted} />
      </Animated.View>
    </PressableScale>
  );
}
