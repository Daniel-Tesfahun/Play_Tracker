import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';

import { usePalette } from '@/theme/usePalette';

/** Track padding (p-1) and border (border) in dp; absolute children sit inside the border. */
const TRACK_PADDING = 4;
const TRACK_BORDER = 1;

/**
 * Replaces the stock tab bar with one segmented switch. A thumb slides under
 * the selected section so it's always obvious which one is open.
 */
export function SegmentedTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const c = usePalette();
  const [trackWidth, setTrackWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(state.index));

  useEffect(() => {
    Animated.spring(position, {
      toValue: state.index,
      useNativeDriver: true,
      speed: 18,
      bounciness: 4,
    }).start();
  }, [state.index, position]);

  const count = state.routes.length;
  const segment = trackWidth > 0 ? (trackWidth - TRACK_BORDER * 2 - TRACK_PADDING * 2) / count : 0;
  const translateX = position.interpolate({
    inputRange: [0, Math.max(1, count - 1)],
    outputRange: [0, segment * Math.max(1, count - 1)],
  });

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View
      className="border-t border-line bg-canvas px-4 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View
        accessibilityRole="tablist"
        onLayout={onLayout}
        className="h-14 flex-row rounded-2xl border border-line bg-surface p-1"
      >
        {segment > 0 ? (
          <Animated.View
            pointerEvents="none"
            className="absolute rounded-xl bg-ink"
            style={{
              top: TRACK_PADDING,
              bottom: TRACK_PADDING,
              left: TRACK_PADDING,
              width: segment,
              transform: [{ translateX }],
            }}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const options = descriptors[route.key]?.options;
          const label = options?.title ?? route.name;
          const focused = state.index === index;
          const color = focused ? c.canvas : c.muted;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              testID={`tab-${route.name}`}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl"
            >
              {options?.tabBarIcon?.({ focused, color, size: 18 })}
              <Text className="text-sm font-semibold" style={{ color }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
