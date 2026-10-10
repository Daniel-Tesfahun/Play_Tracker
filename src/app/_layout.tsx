import '../../global.css';

import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { DATABASE_NAME, migrate } from '@/db/schema';
import palette from '@/theme/palette';

function Loading() {
  return (
    <View className="flex-1 items-center justify-center bg-canvas">
      <ActivityIndicator color={palette.neon} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <Suspense fallback={<Loading />}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate} useSuspense>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.canvas },
          }}
        />
      </SQLiteProvider>
    </Suspense>
  );
}
