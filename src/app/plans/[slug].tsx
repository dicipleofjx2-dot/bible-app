import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  findPlanBySlug,
  getCompletedDays,
  getPlanDays,
  setDayComplete,
  setDayIncomplete,
  type ReadingPlan,
  type ReadingPlanDay,
} from '@/db/plans';

const TILE_MIN_WIDTH = 70;
const TILE_GAP = Spacing.one;

// books.abbrev is an English source code (e.g. "gn"), not fit for a Korean UI —
// this is the standard Korean short form, indexed by book_order (1~66).
const KOREAN_BOOK_ABBREV = [
  '창', '출', '레', '민', '신', '수', '삿', '룻', '삼상', '삼하',
  '왕상', '왕하', '대상', '대하', '스', '느', '에', '욥', '시', '잠',
  '전', '아', '사', '렘', '애', '겔', '단', '호', '욜', '암',
  '옵', '욘', '미', '나', '합', '습', '학', '슥', '말',
  '마', '막', '눅', '요', '행', '롬', '고전', '고후', '갈', '엡',
  '빌', '골', '살전', '살후', '딤전', '딤후', '딛', '몬', '히', '약',
  '벧전', '벧후', '요일', '요이', '요삼', '유', '계',
];

export default function PlanDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();
  const { session } = useAuth();
  const { width: windowWidth } = useWindowDimensions();

  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [days, setDays] = useState<ReadingPlanDay[]>([]);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!slug) return;
    const foundPlan = await findPlanBySlug(slug);
    if (!foundPlan) {
      setLoading(false);
      return;
    }
    setPlan(foundPlan);
    const [planDays, completedSet] = await Promise.all([
      getPlanDays(foundPlan.id),
      session ? getCompletedDays(foundPlan.id) : Promise.resolve(new Set<number>()),
    ]);
    setDays(planDays);
    setCompleted(completedSet);
    setLoading(false);
  }, [slug, session]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleDay(day: ReadingPlanDay) {
    if (!session || !plan) return;
    if (completed.has(day.day_number)) {
      await setDayIncomplete(plan.id, day.day_number);
    } else {
      await setDayComplete(plan.id, day.day_number, session.user.id);
    }
    setCompleted(await getCompletedDays(plan.id));
  }

  const bookAbbrev = (bookId: number) => KOREAN_BOOK_ABBREV[bookId - 1] ?? '';

  const contentWidth = Math.min(windowWidth, MaxContentWidth) - Spacing.three * 2;
  const numColumns = Math.max(3, Math.floor((contentWidth + TILE_GAP) / (TILE_MIN_WIDTH + TILE_GAP)));
  const tileWidth = Math.floor((contentWidth - TILE_GAP * (numColumns - 1)) / numColumns);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {plan && (
          <View style={styles.header}>
            <ThemedText type="subtitle">{plan.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {completed.size} / {days.length}일 완료
            </ThemedText>
            {!session && (
              <ThemedText type="small" themeColor="textSecondary">
                진행 상황을 저장하려면 커뮤니티 탭에서 로그인해주세요.
              </ThemedText>
            )}
          </View>
        )}

        <FlatList
          key={numColumns}
          data={days}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={loading ? <ActivityIndicator style={styles.centerText} /> : null}
          renderItem={({ item }) => {
            const done = completed.has(item.day_number);
            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/read',
                    params: { bookId: String(item.book_id), chapter: String(item.chapter) },
                  })
                }
                style={[styles.tile, { width: tileWidth, backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.tileDay}>
                  {item.day_number}일
                </ThemedText>
                <ThemedText type="smallBold" style={styles.tileChapter}>
                  {bookAbbrev(item.book_id)} {item.chapter}
                </ThemedText>
                <Pressable
                  onPress={() => toggleDay(item)}
                  disabled={!session}
                  hitSlop={6}
                  style={[
                    styles.checkbox,
                    { borderColor: theme.textSecondary },
                    done && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  {done && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
                </Pressable>
              </Pressable>
            );
          }}
        />
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
  centerText: {
    marginTop: Spacing.four,
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.one,
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
  },
  row: {
    gap: TILE_GAP,
    marginBottom: TILE_GAP,
  },
  tile: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    padding: Spacing.one,
    gap: 2,
  },
  tileDay: {
    fontSize: 10,
    lineHeight: 12,
  },
  tileChapter: {
    fontSize: 12,
    lineHeight: 15,
  },
  checkbox: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    fontSize: 10,
    lineHeight: 12,
  },
});
