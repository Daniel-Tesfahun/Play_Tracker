import '../../global.css';

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { createQueryClient } from '@/data/queryClient';
import { DATABASE_NAME, migrate } from '@/db/schema';
import { restoreColorScheme } from '@/theme/themePreference';
import { ThemeRoot } from '@/theme/ThemeRoot';
import { usePalette, useScheme } from '@/theme/usePalette';

// Before the first render, so the saved light/dark choice applies with no flash.
restoreColorScheme();
// Keep the splash up until fonts are ready, so text never flashes in the system font.
void SplashScreen.preventAutoHideAsync();

function Loading() {
  const c = usePalette();
  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      <ActivityIndicator color={c.brand} />
    </View>
  );
}

export default function RootLayout() {
  const scheme = useScheme();
  const c = usePalette();
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeRoot>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Suspense fallback={<Loading />}>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate} useSuspense>
          <QueryClientProvider client={queryClient}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'none',
                contentStyle: { backgroundColor: c.canvas },
              }}
            />
          </QueryClientProvider>
        </SQLiteProvider>
      </Suspense>
    </ThemeRoot>
  );
}
