import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';
import type { DayQuizContent } from '@/lib/readingHelper/quizTypes';

type Props = {
  dayContent: DayQuizContent | null;
  loading: boolean;
  error: boolean;
};

/** The "오늘의 본문 이야기" narrative card + "오늘의 암송구절" memo card — shared
 * between the daily-learning screen (today) and the archive's day-content
 * review screen (any past date), since both show the exact same content,
 * just for a different day. */
export function DayLesson({ dayContent, loading, error }: Props) {
  const theme = useTheme();
  const t = useT();

  return (
    <>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('lesson.narrativeTitle')}
        </ThemedText>

        {loading ? (
          <ActivityIndicator style={styles.spacing} />
        ) : error ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.spacing}>
            {t('lesson.loadFailed')}
          </ThemedText>
        ) : dayContent ? (
          <View style={styles.spacing}>
            <ThemedText style={styles.body}>{dayContent.narrative}</ThemedText>
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.spacing}>
            {t('lesson.notReady')}
          </ThemedText>
        )}
      </View>

      {dayContent && (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('lesson.memorizationTitle')}
          </ThemedText>
          <ThemedText type="smallBold">{dayContent.memorization.reference}</ThemedText>
          <ThemedText style={styles.verse}>{dayContent.memorization.text}</ThemedText>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.two },
  spacing: { marginTop: Spacing.one, gap: Spacing.two },
  body: { lineHeight: 21 },
  verse: { fontSize: 16, fontWeight: '700', lineHeight: 26 },
});
