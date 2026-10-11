import { router } from 'expo-router';
import { Image, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SectionCard } from '@/components/navigation/SectionCard';
import { SECTIONS } from '@/components/navigation/sections';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useScooters } from '@/hooks/useScooters';
import { useZones } from '@/hooks/useZones';
import { summarizeZones } from '@/lib/gaming';
import { formatMinutes } from '@/lib/time';

const todayLabel = () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

/**
 * Where every session starts: pick PS or Scooters. Both sections' data loads
 * here into the query cache, so opening either one is instant.
 */
export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const zones = useZones();
  const scooters = useScooters();

  const ps = summarizeZones(zones.zones);
  const riding = scooters.scooters.filter((s) => s.startedAt !== null).length;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}>
        <View className="flex-row items-center gap-3 pb-6 pt-2">
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: 44, height: 44, borderRadius: 12 }}
            accessibilityIgnoresInvertColors
          />
          <View className="flex-1">
            <Text className="text-lg font-extrabold text-ink">PlayTracker</Text>
            <Text className="text-xs font-semibold uppercase tracking-widest text-faint" numberOfLines={1}>
              {todayLabel()}
            </Text>
          </View>
          <ThemeToggle />
        </View>

        <Text className="text-[32px] font-extrabold leading-10 tracking-tight text-ink">What are you running?</Text>
        <Text className="mb-6 mt-1 text-base font-medium text-muted">
          Pick a section. You can come back here anytime.
        </Text>

        <View className="gap-4">
          <Animated.View entering={FadeInDown.delay(60).springify().damping(18)}>
            <SectionCard
              section={SECTIONS.ps}
              stats={[
                { label: 'Games today', value: String(ps.totalGames) },
                { label: 'Active', value: `${ps.activeZones}/${ps.zoneCount}` },
              ]}
              onOpen={() => router.push(SECTIONS.ps.href)}
            />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(150).springify().damping(18)}>
            <SectionCard
              section={SECTIONS.scooters}
              stats={[
                { label: 'Riding now', value: `${riding}/${scooters.scooters.length}` },
                { label: 'Ride time', value: formatMinutes(scooters.stats.minutesToday) },
              ]}
              onOpen={() => router.push(SECTIONS.scooters.href)}
            />
          </Animated.View>
        </View>

        <Text className="mt-8 text-center text-xs font-medium text-faint">
          Everything is saved on this phone. No internet needed.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
