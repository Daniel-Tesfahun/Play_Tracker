import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useState, type ComponentProps, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, Text, useWindowDimensions, View } from 'react-native';

import type { Palette } from '@/theme/palette';
import { usePalette } from '@/theme/usePalette';

/**
 * The action is a solid panel the full height of the card. It starts exactly where
 * the card's edge was (so it lines up with the cards above and below) and keeps
 * PANEL_GAP to the slid-away card.
 */
const PANEL_WIDTH = 76;
const PANEL_GAP = 10;
/** How far the card slides to show an action, and how far you must drag to snap it open. */
export const OPEN_WIDTH = PANEL_WIDTH + PANEL_GAP;
export const OPEN_THRESHOLD = Math.round(OPEN_WIDTH / 2);
/** Past this share of the screen width, letting go runs the action straight away. */
const FULL_SWIPE_RATIO = 0.55;
/** A horizontal drag must clearly beat vertical before we take it from the list's scroll. */
const SLOP = 12;
/** Matches the cards' rounded-3xl corners. */
const RADIUS = 24;
const FILL = { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } as const;

export type SwipeTone = 'brand' | 'scoot' | 'danger';

/** Panel fill and the icon/label colour on it, per tone (pairs are covered by the contrast tests). */
const TONES: Record<SwipeTone, { fill: keyof Palette; ink: keyof Palette }> = {
  brand: { fill: 'brand', ink: 'onAccent' },
  scoot: { fill: 'scoot', ink: 'canvas' },
  danger: { fill: 'danger', ink: 'canvas' },
};

export interface SwipeAction {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  tone: SwipeTone;
  onPress: () => void;
}

interface SwipeRowProps {
  children: ReactNode;
  /** Revealed on the left when the card is dragged right (e.g. Edit). */
  left?: SwipeAction;
  /** Revealed on the right when the card is dragged left (e.g. Delete). */
  right?: SwipeAction;
  enabled?: boolean;
  testID?: string;
}

type Side = 'left' | 'right' | null;

/**
 * One drag's progress, measured from the finger's own position. Lives across re-renders
 * (each render builds a fresh responder), so a parent ticking every second can't reset it.
 */
export class DragTracker {
  private startX = 0;
  private base = 0;
  private openBuzzed = false;
  private fullBuzzed = false;

  begin(startX: number, base: number, alreadyOpen: boolean) {
    this.startX = startX;
    this.base = base;
    this.openBuzzed = alreadyOpen;
    this.fullBuzzed = false;
  }

  /** Card offset for a finger at pageX. */
  offset(pageX: number) {
    return this.base + (pageX - this.startX);
  }

  /** True the first time the drag passes the snap-open distance. */
  crossedOpen(dist: number) {
    if (this.openBuzzed || dist <= OPEN_THRESHOLD) return false;
    this.openBuzzed = true;
    return true;
  }

  /** True each time the drag moves past the full-swipe distance (re-arms when it backs off). */
  crossedFull(dist: number, full: number) {
    if (dist < full) {
      this.fullBuzzed = false;
      return false;
    }
    if (this.fullBuzzed) return false;
    this.fullBuzzed = true;
    return true;
  }
}

/**
 * Swipe-to-reveal actions built on PanResponder (no extra native modules).
 *
 * Drag right → `left` action, drag left → `right` action. A short drag snaps the
 * card open so the round action button can be tapped; a long drag (full swipe)
 * runs the action on release. Tapping the card while open closes it.
 */
export function SwipeRow({ children, left, right, enabled = true, testID }: SwipeRowProps) {
  const c = usePalette();
  const { width: screenWidth } = useWindowDimensions();
  const [x] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState<Side>(null);
  const hasLeft = left !== undefined;
  const hasRight = right !== undefined;
  const fullSwipe = Math.max(OPEN_WIDTH * 1.6, screenWidth * FULL_SWIPE_RATIO);

  /** Snap open to a side (or closed). Stable, so the responder memo holds. */
  const settle = useCallback(
    (side: Side) => {
      setOpen(side);
      Animated.spring(x, {
        toValue: side === 'left' ? OPEN_WIDTH : side === 'right' ? -OPEN_WIDTH : 0,
        useNativeDriver: false,
        speed: 20,
        bounciness: 7,
      }).start();
    },
    [x],
  );

  const run = useCallback(
    (action: SwipeAction) => {
      settle(null);
      action.onPress();
    },
    [settle],
  );

  // A fresh responder per render is fine: the tracker carries the drag across renders
  // (the Scooters screen re-renders every second while a ride runs).
  const [drag] = useState(() => new DragTracker());

  const responder = PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) =>
      enabled && Math.abs(g.dx) > SLOP && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (_, g) =>
      drag.begin(g.x0, open === 'left' ? OPEN_WIDTH : open === 'right' ? -OPEN_WIDTH : 0, open !== null),
    onPanResponderMove: (e) => {
      let next = drag.offset(e.nativeEvent.pageX);
      if (!hasLeft) next = Math.min(0, next);
      if (!hasRight) next = Math.max(0, next);
      // A little rubber-band past the full-swipe point.
      const limit = fullSwipe * 1.15;
      next = Math.max(-limit, Math.min(limit, next));
      x.setValue(next);

      const dist = Math.abs(next);
      if (drag.crossedOpen(dist)) void Haptics.selectionAsync();
      if (drag.crossedFull(dist, fullSwipe)) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onPanResponderRelease: (e) => {
      const at = drag.offset(e.nativeEvent.pageX);
      if (at > fullSwipe && left) return run(left);
      if (at < -fullSwipe && right) return run(right);
      settle(at > OPEN_THRESHOLD && hasLeft ? 'left' : at < -OPEN_THRESHOLD && hasRight ? 'right' : null);
    },
    onPanResponderTerminate: () => settle(open),
  });

  /** Full-height action panel in the space the card uncovers. */
  const underlay = (action: SwipeAction, side: 'left' | 'right') => {
    const t = TONES[action.tone];
    const isLeft = side === 'left';
    // Drag distance toward this side: rest → open → full swipe.
    const range = isLeft ? [0, OPEN_WIDTH, fullSwipe] : [-fullSwipe, -OPEN_WIDTH, 0];
    const along = (rest: number, opened: number, full: number) =>
      isLeft ? [rest, opened, full] : [full, opened, rest];

    // Invisible at rest so the fill can't bleed through the card's anti-aliased corners.
    const opacity = x.interpolate({
      inputRange: isLeft ? [0, 12] : [-12, 0],
      outputRange: isLeft ? [0, 1] : [1, 0],
      extrapolate: 'clamp',
    });
    // The uncovered width (minus the gap to the card) is the panel's width.
    const width = x.interpolate({
      inputRange: range,
      outputRange: along(0, PANEL_WIDTH, fullSwipe - PANEL_GAP),
      extrapolate: 'clamp',
    });
    // Icon + label appear once there's room for them, and pop slightly on a full swipe.
    const contentOpacity = x.interpolate({
      inputRange: isLeft ? [0, OPEN_THRESHOLD, OPEN_WIDTH] : [-OPEN_WIDTH, -OPEN_THRESHOLD, 0],
      outputRange: isLeft ? [0, 0.4, 1] : [1, 0.4, 0],
      extrapolate: 'clamp',
    });
    const iconScale = x.interpolate({ inputRange: range, outputRange: along(0.7, 1, 1.15), extrapolate: 'clamp' });

    return (
      <Animated.View
        pointerEvents="box-none"
        style={[FILL, { opacity, flexDirection: 'row', justifyContent: isLeft ? 'flex-start' : 'flex-end' }]}
      >
        <Animated.View style={{ width }}>
          <Pressable
            onPress={() => run(action)}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            testID={testID ? `${testID}-swipe-${side}` : undefined}
            style={{
              flex: 1,
              borderRadius: RADIUS,
              backgroundColor: c[t.fill],
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Animated.View style={{ alignItems: 'center', opacity: contentOpacity, transform: [{ scale: iconScale }] }}>
              <Ionicons name={action.icon} size={22} color={c[t.ink]} />
              <Text className="mt-1 text-[11px] font-bold" style={{ color: c[t.ink] }} numberOfLines={1}>
                {action.label}
              </Text>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  };

  return (
    <View testID={testID} className="flex-1">
      {enabled && left ? underlay(left, 'left') : null}
      {enabled && right ? underlay(right, 'right') : null}

      <Animated.View style={{ transform: [{ translateX: x }] }} {...responder.panHandlers}>
        {children}
        {/* While open, a tap on the card closes it instead of reaching the card. */}
        {open !== null ? (
          <Pressable
            onPress={() => settle(null)}
            accessibilityRole="button"
            accessibilityLabel="Close actions"
            testID={testID ? `${testID}-close` : undefined}
            style={FILL}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}
