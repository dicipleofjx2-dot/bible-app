import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { StringKey } from '@/constants/strings';
import { getProgressCounts, type ProgressCounts } from '@/db/r2m';

const EMPTY_COUNTS: ProgressCounts = { qt: 0, reading: 0, meditation: 0, prayer: 0, memorization: 0, obedience: 0, gratitude: 0 };

// 말이 아니라 **열쇠만** 둔다. 말을 모듈 상수에 담으면 모듈을 읽을 때 굳어,
// 언어를 바꿔도 처음 언어로 남는다.
const ROWS: { key: keyof ProgressCounts; emoji: string; labelKey: StringKey; unitKey: StringKey }[] = [
  { key: 'qt', emoji: '📖', labelKey: 'r2m.item.qt', unitKey: 'r2m.unit.days' },
  { key: 'reading', emoji: '📚', labelKey: 'r2m.item.reading', unitKey: 'r2m.unit.days' },
  { key: 'meditation', emoji: '💡', labelKey: 'r2m.item.meditation', unitKey: 'r2m.unit.count' },
  { key: 'prayer', emoji: '🙏', labelKey: 'r2m.item.prayer', unitKey: 'r2m.unit.times' },
  { key: 'memorization', emoji: '✍️', labelKey: 'r2m.item.memorization', unitKey: 'r2m.unit.times' },
  { key: 'obedience', emoji: '❤️‍🔥', labelKey: 'r2m.item.obedience', unitKey: 'r2m.unit.times' },
  { key: 'gratitude', emoji: '🙌', labelKey: 'r2m.item.gratitude', unitKey: 'r2m.unit.times' },
];

export default function R2MProgressScreen() {
  const theme = useTheme();
  const { t } = useI18n();
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
            {t('r2m.progress.title')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('r2m.progress.subtitle')}
          </ThemedText>

          <View style={styles.grid}>
            {ROWS.map((row) => (
              <View key={row.key} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.emoji}>{row.emoji}</ThemedText>
                <ThemedText type="title" style={styles.count}>
                  {counts[row.key]}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t(row.labelKey)} {t(row.unitKey)}
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
