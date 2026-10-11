import '../../global.css';

import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { DATABASE_NAME, migrate } from '@/db/schema';
import { restoreColorScheme } from '@/theme/themePreference';
import { ThemeRoot } from '@/theme/ThemeRoot';
import { usePalette, useScheme } from '@/theme/usePalette';

// Before the first render, so the saved light/dark choice applies with no flash.
restoreColorScheme();

function Loading() {
  const c = usePalette();
  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      <ActivityIndicator color={c.neon} />
    </View>
  );
}

export default function RootLayout() {
  const scheme = useScheme();
  const c = usePalette();

  return (
    <ThemeRoot>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Suspense fallback={<Loading />}>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate} useSuspense>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: c.canvas },
            }}
          />
        </SQLiteProvider>
      </Suspense>
    </ThemeRoot>
  );
}
