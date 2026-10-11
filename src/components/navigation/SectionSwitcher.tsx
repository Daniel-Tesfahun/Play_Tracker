import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { Sheet } from '@/components/ui/Sheet';
import { usePalette } from '@/theme/usePalette';

import { SectionIcon } from './SectionIcon';
import { SECTIONS } from './sections';

/**
 * Shows only the section you're in. Zones and Scooters are separate jobs, so
 * switching goes through a confirmation instead of a one-tap tab change.
 */
export function SectionSwitcher({ state, navigation, insets }: BottomTabBarProps) {
  const c = usePalette();
  const [confirming, setConfirming] = useState(false);

  const current = state.routes[state.index];
  const target = state.routes.find((_, i) => i !== state.index);
  const here = current ? SECTIONS[current.name] : undefined;
  const there = target ? SECTIONS[target.name] : undefined;
  if (!current || !target || !here || !there) return null;

  const switchNow = () => {
    setConfirming(false);
    void Haptics.selectionAsync();
    navigation.navigate(target.name, target.params);
  };

  return (
    <View className="bg-canvas px-4 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      <PressableScale
        onPress={() => setConfirming(true)}
        accessibilityRole="button"
        accessibilityLabel={`Current section: ${here.title}. Switch to ${there.title}`}
        testID="section-switcher"
        pressedScale={0.98}
        className="h-16 flex-row items-center gap-3 rounded-2xl border border-line bg-surface pl-2 pr-3"
      >
        <View className={`h-12 w-12 items-center justify-center rounded-xl ${here.tileClass}`}>
          <SectionIcon icon={here.icon} size={22} color={c[here.accent]} />
        </View>
        <View className="flex-1">
          <Text className="text-[11px] font-semibold uppercase tracking-widest text-faint">{"You're in"}</Text>
          <Text className="text-base font-bold text-ink" numberOfLines={1}>
            {here.title}
          </Text>
        </View>
        <View className="h-10 flex-row items-center gap-1.5 rounded-full bg-elevated px-3">
          <Ionicons name="swap-horizontal" size={16} color={c.muted} />
          <Text className="text-sm font-semibold text-muted">Switch</Text>
        </View>
      </PressableScale>

      <Sheet visible={confirming} title="Switch section?" onClose={() => setConfirming(false)}>
        <Text className="mb-4 text-sm font-medium text-muted">
          {"PS and Scooters track different things. Anything running keeps running while you're away."}
        </Text>
        <View className="mb-5 flex-row items-center gap-3 rounded-2xl border border-line bg-elevated p-4">
          <View className={`h-12 w-12 items-center justify-center rounded-xl ${there.tileClass}`}>
            <SectionIcon icon={there.icon} size={22} color={c[there.accent]} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-ink">{there.title}</Text>
            <Text className="text-xs font-medium text-muted">{there.description}</Text>
          </View>
        </View>
        <Button
          label={`Switch to ${there.title}`}
          variant={there.accent === 'brand' ? 'brand' : 'scoot'}
          icon="swap-horizontal"
          onPress={switchNow}
          testID="section-switch-confirm"
          className="mb-3"
        />
        <Button label={`Stay on ${here.title}`} onPress={() => setConfirming(false)} testID="section-switch-cancel" />
      </Sheet>
    </View>
  );
}
