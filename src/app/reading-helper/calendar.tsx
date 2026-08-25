import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import type { StringKey } from '@/constants/strings';
import { getCompletedDates, getStartDate } from '@/lib/readingHelper/db';
import {
  isBeyondPreview,
  isPreviewDate,
  PREVIEW_DAYS,
  todayDateString,
} from '@/lib/readingHelper/readingPlan';

// 요일 머리글. 문구가 아니라 **열쇠**를 담는다 — 문구를 모듈 상수에 담으면
// 모듈을 읽을 때 굳어서, 언어를 바꿔도 한글 요일이 그대로 남는다.
const WEEKDAY_KEYS: StringKey[] = [
  'cal.sun',
  'cal.mon',
  'cal.tue',
  'cal.wed',
  'cal.thu',
  'cal.fri',
  'cal.sat',
];

// 영어 달 이름. 한국어는 「8월」처럼 숫자로 적으므로 이 이름이 필요 없다.
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export default function ReadingHelperCalendarScreen() {
  const theme = useTheme();
  const t = useT();
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
          <ThemedText type="smallBold">{t('cal.back')}</ThemedText>
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
              {t('cal.yearMonth', {
                year: viewYear,
                month: viewMonth + 1,
                monthName: EN_MONTHS[viewMonth],
              })}
            </ThemedText>
          </Pressable>
          <Pressable onPress={goNextMonth} hitSlop={12}>
            <ThemedText style={styles.navArrow}>▶</ThemedText>
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {/* key 는 자리(index)로. 영어 요일 머리글은 S·M·T·W·T·F·S 라
              같은 글자가 두 번 나온다 — 문구를 열쇠로 쓰면 겹친다. */}
          {WEEKDAY_KEYS.map((key, i) => (
            <ThemedText key={i} type="small" themeColor="textSecondary" style={styles.weekdayLabel}>
              {t(key)}
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
              {t('cal.wellDone')}
            </ThemedText>
          </View>
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {t('cal.legend')}{'\n'}
          {t('cal.legendPreview', { n: PREVIEW_DAYS })}
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
