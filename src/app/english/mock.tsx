import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';
import { TYPE_META } from '@/lib/english/curriculum';
import { buildMockSets } from '@/lib/english/questionBank';

/**
 * 실전 미니 모의고사 (기획서 §11 「실전모드」, §18).
 *
 * 시험 모드로 돈다 — 문항마다 해설을 열지 않고 끝에 한 번에 채점한다.
 * 여기서 재는 것은 정답률만이 아니라 **시간 배분**이다. 세트마다 권장
 * 총시간을 미리 보여 주는 이유가 그것이다.
 */
export default function MockExamScreen() {
  const theme = useTheme();
  const sets = useMemo(() => buildMockSets(6), []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>실전 미니 모의고사</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            해설을 닫고 끝까지 풉니다. 세트마다 영역이 고르게 섞이도록 유형을 돌아가며 뽑았습니다.
          </ThemedText>

          {sets.map((set, i) => {
            const seconds = set.reduce((s, q) => s + q.expectedSeconds, 0);
            return (
              <Pressable
                key={i}
                onPress={() =>
                  router.push({
                    pathname: '/english/quiz',
                    params: { ids: set.map((q) => q.id).join(','), mode: 'exam' },
                  })
                }
                style={({ pressed }) => [
                  styles.row,
                  { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.rowText}>
                  <ThemedText style={Type.itemTitle}>{i + 1}세트 · {set.length}문항</ThemedText>
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    권장 {Math.round(seconds / 60)}분 · {set.map((q) => TYPE_META[q.type].label).join(' · ')}
                  </ThemedText>
                </View>
                <ThemedText themeColor="textSecondary">›</ThemedText>
              </Pressable>
            );
          })}

          <ThemedText themeColor="textSecondary" style={[Type.caption, styles.note]}>
            듣기 영역과 OMR은 아직 없습니다. 음원 관리가 붙는 2단계 작업입니다.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%' },
  page: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
  },
  rowText: { flex: 1, gap: 2 },
  note: { marginTop: Spacing.three },
  pressed: { opacity: 0.65 },
});
