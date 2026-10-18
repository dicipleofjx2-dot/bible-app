import { router, type Href } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { JoshuaGame } from '@/components/joshua/JoshuaGame';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { COUNTDOWN_MS, MAX_SCORE } from '@/lib/joshua';

/** 혼자 연습. 서버를 거치지 않는다 — 판마다 씨앗만 새로 뽑는다. */
export default function JoshuaSoloScreen() {
  const theme = useTheme();
  const [run, setRun] = useState(() => ({ seed: Math.floor(Math.random() * 1e9), startAt: Date.now() + COUNTDOWN_MS }));
  const [result, setResult] = useState<number | null>(null);

  const finish = useCallback((total: number) => setResult(total), []);
  const again = useRef(() => {});
  again.current = () => {
    setResult(null);
    setRun({ seed: Math.floor(Math.random() * 1e9), startAt: Date.now() + COUNTDOWN_MS });
  };

  if (result != null) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThemedText style={styles.bigEmoji}>{result >= 300 ? '🏆' : '⚔️'}</ThemedText>
            <ThemedText type="title" style={styles.center}>
              {result}점 / {MAX_SCORE}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {result >= 300 ? '가나안을 얻었습니다!' : '한 번 더 도전해 보세요'}
            </ThemedText>
            <Pressable
              onPress={() => again.current()}
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.backgroundSelected }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.onAccent}>
                다시 하기
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => router.replace('/arcade/joshua' as Href)}
              style={({ pressed }) => [styles.secondaryButton, { borderColor: theme.border }, pressed && styles.pressed]}>
              <ThemedText type="smallBold">처음으로</ThemedText>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.game}>
          <Pressable onPress={() => router.replace('/arcade/joshua' as Href)} hitSlop={12}>
            <ThemedText type="smallBold">← 그만두기</ThemedText>
          </Pressable>
          <JoshuaGame key={run.startAt} seed={run.seed} startAt={run.startAt} onFinish={finish} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  game: { flex: 1, padding: Spacing.three, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', gap: Spacing.two },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  bigEmoji: { fontSize: 52, textAlign: 'center', marginTop: Spacing.two },
  center: { textAlign: 'center' },
  primaryButton: { borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.three },
  secondaryButton: { borderRadius: 999, borderWidth: 1, paddingVertical: 12, alignItems: 'center', marginTop: Spacing.two },
  onAccent: { color: '#fff' },
  pressed: { opacity: 0.7 },
});
