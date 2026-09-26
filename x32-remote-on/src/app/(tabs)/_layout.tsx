import { Tabs } from 'expo-router/js-tabs';
import { Text } from 'react-native';
import { C } from '@/constants/theme';

const icon = (e: string) => ({ focused }: { focused: boolean }) => <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{e}</Text>;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.text,
        tabBarInactiveTintColor: C.sub,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.line, height: 64 },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700' },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: icon('⛪') }} />
      <Tabs.Screen name="mixer" options={{ title: '빠른믹서', tabBarIcon: icon('🎚️') }} />
      <Tabs.Screen name="scenes" options={{ title: '장면', tabBarIcon: icon('🎬') }} />
      <Tabs.Screen name="settings" options={{ title: '설정', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
