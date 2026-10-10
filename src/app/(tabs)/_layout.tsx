import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';

import palette from '@/theme/palette';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.neon,
        tabBarInactiveTintColor: palette.faint,
        tabBarStyle: {
          backgroundColor: palette.canvas,
          borderTopColor: palette.line,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: palette.canvas },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Gaming Zones',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="game-controller" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scooters"
        options={{
          title: 'Scooters',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="scooter" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
