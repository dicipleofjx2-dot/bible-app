import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BlogPost } from '@/lib/readingHelper/blogContent';
import type { DayQuizContent } from '@/lib/readingHelper/quizTypes';

type Props = {
  post: BlogPost | null;
  dayContent: DayQuizContent | null;
  loading: boolean;
  error: boolean;
};

/** The "오늘의 본문 이야기" narrative card + "오늘의 암송구절" memo card — shared
 * between the daily-learning screen (today) and the archive's day-content
 * review screen (any past date), since both show the exact same content,
 * just for a different day. */
export function DayLesson({ post, dayContent, loading, error }: Props) {
  const theme = useTheme();

  return (
    <>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          오늘의 본문 이야기
        </ThemedText>

        {loading ? (
          <ActivityIndicator style={styles.spacing} />
        ) : error ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.spacing}>
            콘텐츠를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </ThemedText>
        ) : dayContent ? (
          <View style={styles.spacing}>
            {post && <ThemedText type="smallBold">{post.title}</ThemedText>}
            <ThemedText style={styles.body}>{dayContent.narrative}</ThemedText>
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.spacing}>
            이 날짜의 통독 콘텐츠는 아직 준비 중입니다. 곧 업데이트됩니다.
          </ThemedText>
        )}
      </View>

      {dayContent && (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            오늘의 암송구절
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
  verse: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
});
