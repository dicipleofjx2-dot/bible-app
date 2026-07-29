import { DarkTheme, DefaultTheme, Redirect, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useRef } from 'react';
import { ActivityIndicator, useColorScheme } from 'react-native';

import { AuthProvider } from '@/lib/auth';
import { SkinProvider } from '@/lib/skin';
import { SQLiteRecoveryBoundary } from '@/components/SQLiteRecoveryBoundary';

SplashScreen.preventAutoHideAsync();

// Hoisted to a stable module-level reference so it's never a fresh object on
// re-render (SQLiteProvider treats a changed assetSource as a reason to
// re-run its suspending init).
const BIBLE_DB_ASSET_SOURCE = { assetId: require('../../assets/bible-data/bible.db') };

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();

  // Every launch lands on /intro first, regardless of which route was
  // actually requested — "시작하기" leaves via router.replace('/'), the
  // same plain in-app navigation every other link in this app already
  // uses. Declarative <Redirect> rather than an imperative router.replace()
  // call in a useEffect — the imperative version broke the static web
  // export's prerender pass entirely (blank page, no console error since
  // nothing caught it). alreadyRedirected is a ref, not state, so deciding
  // to redirect doesn't itself trigger a re-render; it just has to survive
  // for RootLayout's one mount per app session so later in-app navigation
  // away from /intro never redirects back to it.
  const alreadyRedirected = useRef(false);
  const shouldShowIntro = pathname !== '/intro' && !alreadyRedirected.current;
  if (shouldShowIntro) {
    alreadyRedirected.current = true;
  }

  return (
    <SkinProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SQLiteRecoveryBoundary>
          <Suspense fallback={<ActivityIndicator style={{ flex: 1 }} />}>
            <SQLiteProvider
              databaseName="bible-v5.db"
              assetSource={BIBLE_DB_ASSET_SOURCE}
              useSuspense>
              <AuthProvider>
                {shouldShowIntro && <Redirect href="/intro" />}
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="intro" options={{ headerShown: false, gestureEnabled: false }} />
                  <Stack.Screen name="plans" options={{ headerShown: true, title: '읽기 계획' }} />
                  <Stack.Screen
                    name="plans/[slug]"
                    options={{ headerShown: true, title: '읽기 계획' }}
                  />
                  <Stack.Screen name="post/[id]" options={{ headerShown: true, title: '게시글' }} />
                  <Stack.Screen name="profile" options={{ headerShown: true, title: '마이페이지' }} />
                  <Stack.Screen name="rooms" options={{ headerShown: true, title: '읽기방' }} />
                  <Stack.Screen name="rooms/[id]" options={{ headerShown: true, title: '읽기방' }} />
                  <Stack.Screen name="calendar" options={{ headerShown: true, title: '달력' }} />
                  <Stack.Screen
                    name="bible-study"
                    options={{ headerShown: true, title: '성경연구' }}
                  />
                  <Stack.Screen name="search" options={{ headerShown: true, title: '성경검색' }} />
                  <Stack.Screen name="commentary" options={{ headerShown: true, title: '주석' }} />
                  <Stack.Screen
                    name="bible-maps"
                    options={{ headerShown: true, title: '성경지도' }}
                  />
                  <Stack.Screen
                    name="spiritual-journal"
                    options={{ headerShown: true, title: '순종일기' }}
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
        </SQLiteRecoveryBoundary>
      </ThemeProvider>
    </SkinProvider>
  );
}
