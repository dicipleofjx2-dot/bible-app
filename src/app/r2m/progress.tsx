import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getProgressCounts, type ProgressCounts } from '@/db/r2m';

const EMPTY_COUNTS: ProgressCounts = { qt: 0, reading: 0, meditation: 0, prayer: 0, memorization: 0, obedience: 0, gratitude: 0 };

const ROWS: { key: keyof ProgressCounts; emoji: string; label: string; unit: string }[] = [
  { key: 'qt', emoji: '📖', label: 'QT', unit: '일' },
  { key: 'reading', emoji: '📚', label: '성경읽기', unit: '일' },
  { key: 'meditation', emoji: '💡', label: '묵상', unit: '개' },
  { key: 'prayer', emoji: '🙏', label: '기도', unit: '회' },
  { key: 'memorization', emoji: '✍️', label: '말씀암송', unit: '회' },
  { key: 'obedience', emoji: '❤️‍🔥', label: '순종', unit: '회' },
  { key: 'gratitude', emoji: '🙌', label: '감사', unit: '회' },
];

export default function R2MProgressScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const [counts, setCounts] = useState<ProgressCounts>(EMPTY_COUNTS);

  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setCounts(EMPTY_COUNTS);
        return;
      }
      getProgressCounts(session.user.id)
        .then(setCounts)
        .catch(() => setCounts(EMPTY_COUNTS));
    }, [session]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            성장기록
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            점수나 등급이 아니라, 지금까지 쌓아온 발걸음을 기록합니다.
          </ThemedText>

          <View style={styles.grid}>
            {ROWS.map((row) => (
              <View key={row.key} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.emoji}>{row.emoji}</ThemedText>
                <ThemedText type="title" style={styles.count}>
                  {counts[row.key]}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {row.label} {row.unit}
                </ThemedText>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  card: {
    width: '47%',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
  },
  emoji: {
    fontSize: 28,
  },
  count: {
    fontSize: 32,
  },
});
