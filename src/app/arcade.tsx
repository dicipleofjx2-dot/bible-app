import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArcadeFrame } from '@/components/ArcadeFrame';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import type { ArcadeState } from '@/lib/arcade';

/**
 * 창세기 아케이드. → docs/arcade/README.md
 *
 * 화면이 하는 일은 두 가지뿐이다. 게임 판(public/genesis-arcade.html)을 띄우고,
 * 판이 「끝까지 통과했다」고 하면 통독 포인트를 넣어 주는 것.
 *
 * 로그인하지 않아도 게임은 다 된다. 문 앞에서 막으면 무슨 게임인지 보지도
 * 못하고 돌아간다 — 성경게임대전에서 정한 것과 같다.
 */
export default function ArcadeScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const [, setState] = useState<ArcadeState | null>(null);

  // 게임 판이 포인트를 받을 때마다 알려 온다. 화면 자체는 판 안의 포인트 띠가
  // 보여 주므로, 여기서는 다음에 다시 열 때를 위해 받아만 둔다.
  const onState = useCallback((s: ArcadeState) => setState(s), []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {!session && (
          <Pressable
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [
              styles.signInStrip,
              { backgroundColor: theme.accentSoft, borderColor: theme.accent },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" style={styles.signInText}>
              로그인하면 한 판을 끝까지 통과할 때마다 30포인트가 쌓입니다
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              로그인
            </ThemedText>
          </Pressable>
        )}
        <View style={styles.frame}>
          <ArcadeFrame signedIn={!!session} onState={onState} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%' },
  frame: { flex: 1, width: '100%' },
  signInStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  signInText: { flex: 1 },
  pressed: { opacity: 0.7 },
});
