import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense } from 'react';
import { ActivityIndicator, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/lib/auth';
import { SkinProvider } from '@/lib/skin';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <SkinProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Suspense fallback={<ActivityIndicator style={{ flex: 1 }} />}>
          <SQLiteProvider
            databaseName="bible-v5.db"
            assetSource={{ assetId: require('../../assets/bible-data/bible.db') }}
            useSuspense>
            <AuthProvider>
              <AnimatedSplashOverlay />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="plans" options={{ headerShown: true, title: '읽기 계획' }} />
                <Stack.Screen
                  name="plans/[slug]"
                  options={{ headerShown: true, title: '읽기 계획' }}
                />
                <Stack.Screen name="post/[id]" options={{ headerShown: true, title: '게시글' }} />
                <Stack.Screen name="profile" options={{ headerShown: true, title: '프로필' }} />
                <Stack.Screen name="rooms" options={{ headerShown: true, title: '읽기방' }} />
                <Stack.Screen name="rooms/[id]" options={{ headerShown: true, title: '읽기방' }} />
                <Stack.Screen name="calendar" options={{ headerShown: true, title: '달력' }} />
                <Stack.Screen
                  name="spiritual-journal"
                  options={{ headerShown: true, title: '영성일기' }}
                />
                <Stack.Screen
                  name="priorities"
                  options={{ headerShown: true, title: '우선순위' }}
                />
                <Stack.Screen
                  name="kingdom-finance"
                  options={{ headerShown: true, title: '천국재정' }}
                />
                <Stack.Screen
                  name="prayer-group"
                  options={{ headerShown: true, title: '샬롬기도단' }}
                />
                <Stack.Screen
                  name="privacy-policy"
                  options={{ headerShown: true, title: '개인정보처리방침' }}
                />
              </Stack>
            </AuthProvider>
          </SQLiteProvider>
        </Suspense>
      </ThemeProvider>
    </SkinProvider>
  );
}
