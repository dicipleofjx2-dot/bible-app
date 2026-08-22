import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Redirect, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useRef } from 'react';
import { ActivityIndicator, useColorScheme } from 'react-native';

import { AuthProvider } from '@/lib/auth';
import { SkinProvider } from '@/lib/skin';
import { SQLiteRecoveryBoundary } from '@/components/SQLiteRecoveryBoundary';
import { AppDbLock } from '@/components/AppDbLock';
import { YieldedNotice } from '@/components/YieldedNotice';
import { hasYielded } from '@/lib/tabPresence';
import { FONT_ASSETS } from '@/constants/typography';

SplashScreen.preventAutoHideAsync();

// Hoisted to a stable module-level reference so it's never a fresh object on
// re-render (SQLiteProvider treats a changed assetSource as a reason to
// re-run its suspending init).
const BIBLE_DB_ASSET_SOURCE = { assetId: require('../../assets/bible-data/bible.db') };

// assets/bible-data/bible.db를 고쳤으면 이 이름을 반드시 같이 올려야 한다.
//
// expo-sqlite는 `importAssetDatabaseAsync(..., forceOverwrite = false)`로
// 복사한다 — 같은 이름의 파일이 이미 기기(웹은 OPFS)에 있으면 새 asset을
// 그냥 무시한다. 이름을 안 올리면 이미 앱을 써 본 사람에게는 옛 DB가 그대로
// 남아, 새로 넣은 번역본이나 본문이 통째로 안 보인다.
//
// v6: 개역개정(krv)을 넣었는데 이름을 안 올려서, 기존 사용자에게 큐티 본문이
//     빈칸으로 나왔다. 큐티는 번역본을 고르는 화면이 아니라 개역개정으로
//     고정 조회하기 때문에 한 절도 안 나온 것이다.
// v7: 큐티 일정 23일치를 고쳤는데(에스겔 9장을 11절까지인데 13절부터로 잡는 등)
//     **또 이름을 안 올려서** 고친 것이 안 나갔다. 위 경고를 그대로 적어 두고도
//     같은 실수를 반복했다. bible.db 를 건드리면 이 줄부터 고칠 것.
// v8: v7 로 올릴 때 build-bible-db.mjs 로 DB 를 다시 만들었는데, 그 스크립트가
//     **개역개정(krv)을 안 넣는다.** 큐티는 krv 로 고정 조회하므로 2178일이
//     전부 빈칸인 DB 가 그대로 나갔다. 백업에서 krv 를 되살려 다시 만들었다.
const BIBLE_DB_NAME = 'bible-v9.db';

// 이름을 올리면 옛 파일(약 30MB)이 그대로 남는다. 웹은 OPFS 용량이 넉넉하지
// 않으므로 한 번 지워 준다. 이미 없으면 조용히 넘어간다.
const STALE_BIBLE_DB_NAMES = ['bible-v5.db', 'bible-v6.db', 'bible-v7.db', 'bible-v8.db'];

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();

  // 폰트는 불러오되 화면을 막지 않는다. 정적 웹 내보내기는 Node에서 프리렌더를
  // 도는데, 거기서는 폰트가 절대 로드되지 않으므로 로딩 중에 null을 돌려주면
  // 모든 페이지가 빈 HTML로 나온다. 준비되기 전 잠깐 기본 서체로 보이는 편이
  // 낫다.
  useFonts(FONT_ASSETS);

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
  // 이 탭이 다른 탭에게 자리를 내주고 물러났는가. 물러난 탭은 DB를 다시 잡으러
  // 들면 안 된다 — 두 탭이 서로 뺏느라 새로고침만 반복하게 된다. 화면만 띄우고
  // 사용자가 "여기서 열기"를 누를 때만 되돌아간다.
  //
  // ref가 아니라 그냥 읽는 이유: 이 값은 새로고침으로만 바뀐다(sessionStorage).
  // 한 번 그려지는 동안 달라질 일이 없다.
  const yielded = hasYielded();

  const alreadyRedirected = useRef(false);
  const shouldShowIntro = pathname === '/' && !alreadyRedirected.current;
  if (shouldShowIntro) {
    alreadyRedirected.current = true;
  }

  if (yielded) {
    return (
      <SkinProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <YieldedNotice />
        </ThemeProvider>
      </SkinProvider>
    );
  }

  return (
    <SkinProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SQLiteRecoveryBoundary>
          <Suspense fallback={<ActivityIndicator style={{ flex: 1 }} />}>
            <SQLiteProvider
              databaseName={BIBLE_DB_NAME}
              assetSource={BIBLE_DB_ASSET_SOURCE}
              useSuspense>
              <AuthProvider>
                <AppDbLock staleDbNames={STALE_BIBLE_DB_NAMES} />
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
                  <Stack.Screen name="boards" options={{ headerShown: true, title: '게시판' }} />
                  <Stack.Screen name="boards/[slug]" options={{ headerShown: true, title: '게시판' }} />
                  <Stack.Screen name="boards/post/[id]" options={{ headerShown: true, title: '글' }} />
                  <Stack.Screen name="boards/settings" options={{ headerShown: true, title: '게시판 관리' }} />
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
                  <Stack.Screen
                    name="r2m/leader-assign"
                    options={{ headerShown: true, title: '리더 지정 · 멤버 배정' }}
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
