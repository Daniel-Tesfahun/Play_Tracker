import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router/js-tabs';

import { SegmentedTabBar } from '@/components/navigation/SegmentedTabBar';
import { usePalette } from '@/theme/usePalette';

export default function TabLayout() {
  const c = usePalette();

  return (
    <Tabs
      tabBar={(props) => <SegmentedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.canvas },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Gaming Zones',
          tabBarIcon: ({ color, size }) => <Ionicons name="game-controller" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scooters"
        options={{
          title: 'Scooters',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="scooter" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
