import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';
import { APP_WINDOW, openAppWindow } from '@/lib/openExternal';
import type { DayQuizContent } from '@/lib/readingHelper/quizTypes';
import type { PlanChapterEntry } from '@/lib/readingHelper/readingPlan';
import { webtoonsForChapters, type ReadingWebtoon } from '@/lib/readingHelper/webtoon';

type Props = {
  dayContent: DayQuizContent | null;
  loading: boolean;
  error: boolean;
  /** 그날 읽는 장 — 이 장들과 겹치는 성경통독 웹툰 화를 찾는다 */
  chapters?: PlanChapterEntry[];
};

/** The "오늘의 본문 이야기" narrative card + "오늘의 암송구절" memo card — shared
 * between the daily-learning screen (today) and the archive's day-content
 * review screen (any past date), since both show the exact same content,
 * just for a different day. */
export function DayLesson({ dayContent, loading, error, chapters }: Props) {
  const theme = useTheme();
  const t = useT();
  const webtoons = useDayWebtoons(chapters);

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

      {/* 성경통독 웹툰 — 이 분량을 그린 화가 워드프레스에 올라와 있을 때만. 아직 없는 날에
          「준비 중」을 매일 띄우면 소음이라 아예 그리지 않는다. */}
      {webtoons.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {t('lesson.webtoonTitle')}
          </ThemedText>
          {webtoons.map((w) => (
            <Pressable
              key={w.id}
              accessibilityRole="link"
              onPress={() => openAppWindow(w.link, APP_WINDOW.readingWebtoon)}
              style={({ pressed }) => [
                styles.webtoonRow,
                { backgroundColor: theme.background },
                pressed && styles.pressed,
              ]}>
              {w.thumb ? <Image source={{ uri: w.thumb }} style={styles.webtoonThumb} contentFit="cover" /> : null}
              <View style={styles.webtoonText}>
                <ThemedText type="smallBold">{w.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('lesson.webtoonOpen')}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      )}

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

/** 그날 장들과 겹치는 웹툰 화. 장이 바뀌면(다른 날을 열면) 다시 고른다. */
function useDayWebtoons(chapters: PlanChapterEntry[] | undefined): ReadingWebtoon[] {
  const [list, setList] = useState<ReadingWebtoon[]>([]);
  const key = (chapters ?? []).map((c) => `${c.bookId}:${c.chapter}`).join(',');
  useEffect(() => {
    let cancelled = false;
    setList([]);
    if (!chapters?.length) return;
    void webtoonsForChapters(chapters).then((l) => {
      if (!cancelled) setList(l);
    });
    return () => {
      cancelled = true;
    };
    // 배열은 화면이 그려질 때마다 새로 만들어진다 — 장 목록이 실제로 바뀔 때만 다시 묻는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return list;
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.two },
  spacing: { marginTop: Spacing.one, gap: Spacing.two },
  body: { lineHeight: 21 },
  verse: { fontSize: 16, fontWeight: '700', lineHeight: 26 },
  webtoonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.two,
    minHeight: 64,
  },
  webtoonThumb: { width: 84, height: 56, borderRadius: Spacing.two },
  webtoonText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.85 },
});
