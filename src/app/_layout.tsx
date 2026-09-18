import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/lib/auth';

/**
 * 앱 뼈대.
 *
 * 화면은 전부 Stack 한 겹이다 — 아래 탭을 두지 않았다. 이 앱에서 하는 일은
 * 「공간을 따라 들어갔다가 물품에서 멈추는」 한 줄기라, 탭을 두면 지금 어디에
 * 있는지가 오히려 흐려진다(기획서 §5.1 의 다섯 탭은 홈 화면의 빠른 단추로
 * 옮겼다).
 */
export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: theme.background },
          }}>
          <Stack.Screen name="index" options={{ title: '물품관리ON' }} />
          <Stack.Screen name="sign-in" options={{ title: '로그인' }} />
          <Stack.Screen name="handoff" options={{ headerShown: false }} />
          <Stack.Screen name="church/[slug]" options={{ title: '교회 물품' }} />
          <Stack.Screen name="[orgId]" options={{ title: '관리 공간' }} />
          <Stack.Screen name="[orgId]/new" options={{ title: '물품 등록' }} />
          <Stack.Screen name="[orgId]/search" options={{ title: '물품 찾기' }} />
          <Stack.Screen name="[orgId]/manage" options={{ title: '관리' }} />
          <Stack.Screen name="[orgId]/space/[spaceId]" options={{ title: '공간' }} />
          <Stack.Screen name="[orgId]/item/[itemId]" options={{ title: '물품' }} />
        </Stack>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
