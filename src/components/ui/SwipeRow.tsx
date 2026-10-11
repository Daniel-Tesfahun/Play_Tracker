import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';

import type { Palette } from '@/theme/palette';
import { usePalette } from '@/theme/usePalette';

/** Width of a revealed action, and how far you must drag to snap it open. */
const ACTION_WIDTH = 104;
const OPEN_THRESHOLD = 64;
/** A horizontal drag must win clearly over vertical before we take it from the list's scroll. */
const SLOP = 12;

interface SwipeAction {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  /** Fill and foreground tokens. */
  fill: keyof Palette;
  ink: keyof Palette;
}

interface SwipeRowProps {
  children: ReactNode;
  /** Revealed on the left when dragging right, e.g. Delete. */
  left?: SwipeAction;
  /** Revealed on the right when dragging left, e.g. Edit. */
  right?: SwipeAction;
  enabled?: boolean;
  testID?: string;
}

type Side = 'left' | 'right' | null;

/**
 * Swipe-to-reveal actions built on PanResponder (no extra native modules).
 * Drag right → left action, drag left → right action. Tapping the card while
 * it's open closes it; tapping the revealed action runs it and closes.
 */
export function SwipeRow({ children, left, right, enabled = true, testID }: SwipeRowProps) {
  const c = usePalette();
  const [x] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState<Side>(null);
  const hasLeft = left !== undefined;
  const hasRight = right !== undefined;

  /** Snap open to a side (or closed) and remember it. Stable, so the responder memo holds. */
  const settle = useCallback(
    (side: Side) => {
      setOpen(side);
      Animated.spring(x, {
        toValue: side === 'left' ? ACTION_WIDTH : side === 'right' ? -ACTION_WIDTH : 0,
        useNativeDriver: false,
        speed: 22,
        bounciness: 6,
      }).start();
    },
    [x],
  );

  // Rebuilt only when these inputs change, which happens between drags (on release),
  // never mid-gesture, so a parent re-rendering every second can't interrupt a swipe.
  const responder = useMemo(() => {
    const base = open === 'left' ? ACTION_WIDTH : open === 'right' ? -ACTION_WIDTH : 0;
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) =>
        enabled && Math.abs(g.dx) > SLOP && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        let next = base + g.dx;
        // Only drag toward sides that have an action; allow a little stretch past the action width.
        if (!hasLeft) next = Math.min(0, next);
        if (!hasRight) next = Math.max(0, next);
        const limit = ACTION_WIDTH * 1.3;
        x.setValue(Math.max(-limit, Math.min(limit, next)));
      },
      onPanResponderRelease: (_, g) => {
        const at = base + g.dx;
        const side: Side = at > OPEN_THRESHOLD && hasLeft ? 'left' : at < -OPEN_THRESHOLD && hasRight ? 'right' : null;
        if (side && side !== open) void Haptics.selectionAsync();
        settle(side);
      },
      onPanResponderTerminate: () => settle(open),
    });
  }, [open, enabled, hasLeft, hasRight, x, settle]);

  const run = (action: SwipeAction) => {
    settle(null);
    action.onPress();
  };

  // Each action fades in only as the card moves toward its side. At rest both are invisible,
  // so their colors can't bleed through the card's anti-aliased rounded edges.
  const leftOpacity = x.interpolate({ inputRange: [0, 16], outputRange: [0, 1], extrapolate: 'clamp' });
  const rightOpacity = x.interpolate({ inputRange: [-16, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  const actionButton = (action: SwipeAction, side: 'left' | 'right') => (
    <Animated.View style={{ opacity: side === 'left' ? leftOpacity : rightOpacity }}>
      <Pressable
        onPress={() => run(action)}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        testID={testID ? `${testID}-swipe-${side}` : undefined}
        style={{ width: ACTION_WIDTH, height: '100%', backgroundColor: c[action.fill] }}
        className={`items-center justify-center gap-1 ${side === 'left' ? 'rounded-l-3xl' : 'rounded-r-3xl'}`}
      >
        <Ionicons name={action.icon} size={22} color={c[action.ink]} />
        <Text className="text-xs font-bold" style={{ color: c[action.ink] }}>
          {action.label}
        </Text>
      </Pressable>
    </Animated.View>
  );

  return (
    <View testID={testID} className="flex-1">
      {/* Actions sit behind the card and show as it slides away. */}
      {enabled ? (
        <View className="absolute bottom-0 left-0 right-0 top-0 flex-row justify-between overflow-hidden rounded-3xl">
          {left ? actionButton(left, 'left') : <View />}
          {right ? actionButton(right, 'right') : <View />}
        </View>
      ) : null}
      <Animated.View style={{ transform: [{ translateX: x }] }} {...responder.panHandlers}>
        {children}
        {/* While open, a tap on the card closes it instead of reaching the card. */}
        {open !== null ? (
          <Pressable
            onPress={() => settle(null)}
            accessibilityRole="button"
            accessibilityLabel="Close actions"
            testID={testID ? `${testID}-close` : undefined}
            className="absolute bottom-0 left-0 right-0 top-0"
          />
        ) : null}
      </Animated.View>
    </View>
  );
}
