import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { FontFamily } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getAllRecordDates, getStartDate } from '@/lib/readingHelper/db';
import { todayDateString } from '@/lib/readingHelper/readingPlan';

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
        if (!userId) return;
        const [start, dates] = await Promise.all([getStartDate(userId), getAllRecordDates(userId)]);
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
            const isFuture = key > todayStr;
            const isBeforeStart = startDate !== null && key < startDate;

            return (
              <Pressable
                key={i}
                disabled={isFuture || isBeforeStart}
                onPress={() => router.push({ pathname: '/reading-helper/day-detail', params: { date: key } })}
                style={[
                  styles.cell,
                  styles.dayCell,
                  isToday && { backgroundColor: theme.backgroundSelected },
                  !isToday && hasRecord && { backgroundColor: theme.backgroundElement },
                ]}>
                <ThemedText
                  style={[styles.dayNumber, (isFuture || isBeforeStart) && styles.dimmedText, isToday && { color: '#fff' }]}>
                  {day}
                </ThemedText>
                {hasRecord && (
                  <ThemedText style={isToday ? { color: '#fff' } : { color: theme.backgroundSelected }}>✓</ThemedText>
                )}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  centeredScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.five, gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navArrow: { fontSize: 18, paddingHorizontal: Spacing.three },
  monthTitle: { fontSize: 18 },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCell: { borderRadius: 10 },
  dayNumber: { fontSize: 14, fontFamily: FontFamily.bold },
  dimmedText: { opacity: 0.35 },
});
