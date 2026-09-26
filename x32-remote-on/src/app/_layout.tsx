import { useKeepAwake } from 'expo-keep-awake';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusHeader } from '@/components/StatusHeader';
import { Toast } from '@/components/ui';
import { C } from '@/constants/theme';
import { StoreProvider } from '@/lib/store';

export default function RootLayout() {
  // 예배 중 화면이 꺼지면 다시 켜는 사이에 마이크 타이밍을 놓친다.
  useKeepAwake();
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <StoreProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
          <StatusHeader />
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
          </View>
          <Toast />
        </SafeAreaView>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
