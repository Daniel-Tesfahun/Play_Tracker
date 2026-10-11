import { Tabs } from 'expo-router/js-tabs';

import { SectionSwitcher } from '@/components/navigation/SectionSwitcher';
import { SECTIONS } from '@/components/navigation/sections';
import { usePalette } from '@/theme/usePalette';

export default function TabLayout() {
  const c = usePalette();

  return (
    <Tabs
      tabBar={(props) => <SectionSwitcher {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: c.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: SECTIONS.index?.title }} />
      <Tabs.Screen name="scooters" options={{ title: SECTIONS.scooters?.title }} />
    </Tabs>
  );
}
