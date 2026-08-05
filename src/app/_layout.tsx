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

  // 앱을 그냥 열었을 때(경로가 '/')만 /intro를 거친다. "시작하기"는
  // router.replace('/')로 빠져나가는데, 이 앱의 다른 링크와 똑같은 평범한
  // 화면 이동이다. 명령형 router.replace()를 useEffect에서 부르면 정적 웹
  // 내보내기의 프리렌더 단계가 통째로 깨져서(빈 화면, 아무도 안 잡아서 콘솔
  // 에러도 없음) 선언형 <Redirect>를 쓴다. alreadyRedirected는 state가 아니라
  // ref라서 리다이렉트 판단 자체가 리렌더를 부르지 않고, RootLayout이 한 번
  // 마운트된 동안만 살아 있으면 되므로 /intro를 떠난 뒤 다시 끌려오지 않는다.
  //
  // 경로를 '/'로 좁힌 이유: 새부대교회 홈페이지가 /library, /meditation 같은
  // 개별 기능으로 바로 링크를 건다. 예전처럼 모든 경로를 intro로 보내면 그
  // 링크들이 전부 인트로 화면에서 끊긴다(시작하기는 '/'로만 가므로 원래
  // 가려던 화면으로 돌아갈 방법이 없다).
  const alreadyRedirected = useRef(false);
  const shouldShowIntro = pathname === '/' && !alreadyRedirected.current;
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
                  <Stack.Screen name="meditation" options={{ headerShown: true, title: '오늘의 말씀' }} />
                  <Stack.Screen name="word-notes" options={{ headerShown: true, title: 'Q.T묵상' }} />
                  <Stack.Screen
                    name="word-notes/[id]"
                    options={{ headerShown: true, title: '묵상 노트' }}
                  />
                  <Stack.Screen name="notes" options={{ headerShown: true, title: '구절묵상' }} />
                  <Stack.Screen name="community" options={{ headerShown: true, title: '커뮤니티' }} />
                  <Stack.Screen name="read" options={{ headerShown: true, title: '성경읽기' }} />
                  <Stack.Screen
                    name="shepherd-letters"
                    options={{ headerShown: true, title: '목자의 편지' }}
                  />
                  <Stack.Screen
                    name="shepherd-letters/[id]"
                    options={{ headerShown: true, title: '목자의 편지' }}
                  />
                  <Stack.Screen
                    name="shepherd-letters/admin"
                    options={{ headerShown: true, title: '목자의 편지 관리' }}
                  />
                  <Stack.Screen name="notice-board" options={{ headerShown: true, title: '알림마당' }} />
                  <Stack.Screen
                    name="notice-board/[id]"
                    options={{ headerShown: true, title: '알림마당' }}
                  />
                  <Stack.Screen
                    name="notice-board/admin"
                    options={{ headerShown: true, title: '알림마당 관리' }}
                  />
                  <Stack.Screen name="support" options={{ headerShown: true, title: '후원' }} />
                  <Stack.Screen
                    name="support/admin"
                    options={{ headerShown: true, title: '후원정보 관리' }}
                  />
                  <Stack.Screen
                    name="r2m/courses"
                    options={{ headerShown: true, title: '훈련과정' }}
                  />
                  <Stack.Screen
                    name="r2m/courses/[id]"
                    options={{ headerShown: true, title: '훈련과정' }}
                  />
                  <Stack.Screen
                    name="r2m/courses/admin"
                    options={{ headerShown: true, title: 'R2M 훈련과정 관리' }}
                  />
                  <Stack.Screen
                    name="r2m/gratitude"
                    options={{ headerShown: true, title: '감사노트' }}
                  />
                  <Stack.Screen
                    name="r2m/progress"
                    options={{ headerShown: true, title: '성장기록' }}
                  />
                  <Stack.Screen
                    name="r2m/leaders"
                    options={{ headerShown: true, title: '리더관리' }}
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
