import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ProgressProvider } from '@/lib/progress';

/**
 * Stack 한 겹. 매일 여는 화면은 「오늘」 하나이고 나머지는 거기서 들른다.
 * 탭을 두면 아이가 학습 중에 딴 칸으로 새기 쉽다.
 */
export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return (
    <ProgressProvider>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.background },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="diagnose" options={{ title: '진단' }} />
          <Stack.Screen name="study" options={{ title: '오늘의 학습', gestureEnabled: false }} />
          <Stack.Screen name="roots" options={{ title: '어근 지도' }} />
          <Stack.Screen name="report" options={{ title: '성장 보고서' }} />
          <Stack.Screen name="word/[id]" options={{ title: '단어 카드' }} />
        </Stack>
      </SafeAreaProvider>
    </ProgressProvider>
  );
}
