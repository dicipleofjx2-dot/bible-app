import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getCompletedDates, getStartDate } from '@/lib/readingHelper/db';
import {
  isBeyondPreview,
  isPreviewDate,
  PREVIEW_DAYS,
  todayDateString,
} from '@/lib/readingHelper/readingPlan';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export default function ReadingHelperCalendarScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [recordDates, setRecordDates] = useState<Set<string>>(new Set());

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        // 로그인 전에는 오늘 시작 기준 달력만 보여 준다. 표시할 「내 기록」이
        // 없을 뿐 달력 자체는 볼 수 있다 — 예전에는 여기서 돌아가 버려 화면이
        // 영원히 로딩 중이었다.
        const [start, dates] = userId
          ? await Promise.all([getStartDate(userId), getCompletedDates(userId)])
          : [todayDateString(), new Set<string>()];
        if (cancelled) return;
        setStartDate(start);
        setRecordDates(dates);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  if (loading) {
    return (
      <ThemedView style={styles.centeredScreen}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  /**
   * 이번 주(주일~토요일)를 하루도 빠지지 않고 했는가.
   *
   * "오늘까지" 가 아니라 **지나온 날까지**로 잰다. 수요일에 열었는데 목·금·토가
   * 아직 안 왔다고 "빠뜨렸다"고 하면 매주 토요일 저녁에만 칭찬을 볼 수 있다.
   * 통독을 시작하기 전 날도 뺀다 — 시작 전은 빠뜨린 것이 아니다.
   */
  const weekDone = (() => {
    if (!startDate) return false;
    const now = new Date();
    const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const todayStr = todayDateString();
    let counted = 0;
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (key > todayStr) break;
      if (key < startDate) continue;
      if (!recordDates.has(key)) return false;
      counted += 1;
    }
    // 한 날도 안 지났으면 칭찬할 것이 없다(주일 새벽에 열었을 때).
    return counted > 0;
  })();

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  const todayStr = todayDateString();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {/* 헤더가 없는 화면이라 뒤로 갈 길이 없었다. 아카이브와 같은 모양으로 둔다. */}
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
          <ThemedText type="smallBold">◀ 돌아가기</ThemedText>
        </Pressable>

        <View style={styles.header}>
          <Pressable onPress={goPrevMonth} hitSlop={12}>
            <ThemedText style={styles.navArrow}>◀</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              setViewYear(today.getFullYear());
              setViewMonth(today.getMonth());
            }}>
            <ThemedText type="smallBold" style={styles.monthTitle}>
              {viewYear}년 {viewMonth + 1}월
            </ThemedText>
          </Pressable>
          <Pressable onPress={goNextMonth} hitSlop={12}>
            <ThemedText style={styles.navArrow}>▶</ThemedText>
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((w) => (
            <ThemedText key={w} type="small" themeColor="textSecondary" style={styles.weekdayLabel}>
              {w}
            </ThemedText>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((day, i) => {
            if (day === null) return <View key={i} style={styles.cell} />;
            const key = dateKey(viewYear, viewMonth, day);
            const hasRecord = recordDates.has(key);
            const isToday = key === todayStr;
            // 앞으로 일주일치는 미리 볼 수 있다. 그보다 먼 앞날만 잠근다.
            const isPreview = isPreviewDate(key);
            const isLocked = isBeyondPreview(key);
            const isBeforeStart = startDate !== null && key < startDate;

            return (
              <Pressable
                key={i}
                disabled={isLocked || isBeforeStart}
                onPress={() => router.push({ pathname: '/reading-helper/day-detail', params: { date: key } })}
                style={[
                  styles.cell,
                  styles.dayCell,
                  isToday && { backgroundColor: theme.backgroundSelected },
                  !isToday && hasRecord && { backgroundColor: theme.backgroundElement },
                  // 미리 보기 날은 테두리만 둘러 오늘·지난날과 구분한다.
                  isPreview && { borderWidth: 1, borderColor: theme.backgroundSelected },
                ]}>
                <ThemedText
                  style={[styles.dayNumber, (isLocked || isBeforeStart) && styles.dimmedText, isToday && { color: '#fff' }]}>
                  {day}
                </ThemedText>
                {hasRecord && (
                  <ThemedText style={isToday ? { color: '#fff' } : { color: theme.backgroundSelected }}>✓</ThemedText>
                )}
              </Pressable>
            );
          })}
        </View>

        {weekDone && (
          <View style={[styles.weekDoneCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.weekDoneText}>
              🌿 이번주도 잘~ 했습니다. 당신 성실해요!!
            </ThemedText>
          </View>
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          ✓ 는 그날 성경퀴즈에서 80점 이상을 맞은 날입니다.{'\n'}
          테두리가 있는 날은 앞으로 {PREVIEW_DAYS}일 안의 미리 보기입니다. 미리 풀어 본 퀴즈와 암송은
          기록에 남지 않으니, 그날이 되면 다시 하시면 됩니다.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  centeredScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.five, gap: Spacing.three },
  backRow: { alignSelf: 'flex-start', paddingTop: Spacing.three, paddingHorizontal: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navArrow: { fontSize: 18, paddingHorizontal: Spacing.three },
  monthTitle: { fontSize: 18 },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCell: { borderRadius: 10 },
  dayNumber: { fontSize: 14, fontWeight: '700', },
  dimmedText: { opacity: 0.35 },
  weekDoneCard: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
    borderRadius: Spacing.four,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  weekDoneText: { textAlign: 'center', lineHeight: 22 },
  hint: { lineHeight: 19 },
});
