import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { captureSupported, consumeSharedText, drainCaptured } from '@/lib/capture';
import { parseCardMessages } from '@/lib/cardMessage';
import { saveTxns } from '@/db/store';

/**
 * 앱이 앞으로 나올 때마다 **알림이 모아 둔 문자와 공유로 넘어온 글을 받아 온다.**
 *
 * 알림으로 온 것은 바로 담는다 — 자동수집을 켜 둔 사람이 앱을 열 때마다
 * 「이것을 담을까요」를 물으면 자동이 아니다. 공유로 보낸 것은 사람이 방금
 * 손으로 고른 것이라 미리보기 화면으로 데려간다.
 */
function useCapture() {
  const busy = useRef(false);

  const pull = useCallback(async () => {
    if (!captureSupported || busy.current) return;
    busy.current = true;
    try {
      const captured = drainCaptured();
      if (captured.length > 0) {
        const { txns } = parseCardMessages(captured.join('\n\n'));
        if (txns.length > 0) await saveTxns(txns, 'notification');
      }
      const shared = consumeSharedText();
      if (shared && shared.trim().length > 0) {
        router.push({ pathname: '/paste', params: { text: shared } });
      }
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    // 웹에서는 captureSupported 가 false 라 이 효과가 하는 일이 없다.
    // 정적 내보내기(prerender)에서도 안전한 이유다.
    void pull();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void pull();
    });
    return () => sub.remove();
  }, [pull]);
}

export default function RootLayout() {
  const { palette, dark } = useTheme();
  useCapture();

  return (
    <SafeAreaProvider>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: palette.background },
          headerBackTitle: Platform.OS === 'ios' ? '뒤로' : undefined,
        }}>
        <Stack.Screen name="index" options={{ title: '카드가계부' }} />
        <Stack.Screen name="paste" options={{ title: '문자 넣기' }} />
        <Stack.Screen name="txns" options={{ title: '전체 내역' }} />
        <Stack.Screen name="stats" options={{ title: '달마다 흐름' }} />
        <Stack.Screen name="settings" options={{ title: '설정' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
