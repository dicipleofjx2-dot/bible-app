import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/lib/auth';
import { HouseholdProvider } from '@/lib/household';

/**
 * 앱 뼈대.
 *
 * 화면은 Stack 한 겹이다 — 아래 탭을 두지 않았다. 이 앱에서 매일 여는 화면은
 * 「오늘」 하나뿐이고 나머지는 가끔 들르는 자리라, 탭을 두면 쓰지 않는 칸이
 * 늘 자리를 차지한다. 나머지는 「오늘」 아래 빠른 단추로 간다.
 */
export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <AuthProvider>
      <HouseholdProvider>
        <SafeAreaProvider>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.background },
              headerTintColor: theme.text,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: theme.background },
            }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="sign-in" options={{ title: '로그인' }} />
            <Stack.Screen name="join" options={{ title: '우리 집' }} />
            <Stack.Screen name="chores" options={{ title: '집안일' }} />
            <Stack.Screen name="chore/[id]" options={{ title: '집안일 고치기' }} />
            <Stack.Screen name="schedule" options={{ title: '이번 주 배치' }} />
            <Stack.Screen name="review" options={{ title: '확인함' }} />
            <Stack.Screen name="scores" options={{ title: '점수판' }} />
            <Stack.Screen name="members" options={{ title: '식구' }} />
          </Stack>
        </SafeAreaProvider>
      </HouseholdProvider>
    </AuthProvider>
  );
}
