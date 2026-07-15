import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getHebrewDateKST, getHebrewDayLabelKST, getKoreanDateKST } from '@/lib/hebrew-date';
import { getHoliday } from '@/lib/korea-holidays';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const SUNDAY_COLOR = '#e03131';
const SATURDAY_COLOR = '#2f6fed';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

type DayCell = {
  date: Date;
  dateString: string;
  inMonth: boolean;
  isToday: boolean;
};

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const todayString = toDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const cells: DayCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayOffset = i - firstWeekday + 1;
    const date = new Date(year, month, dayOffset);
    const dateString = toDateString(date.getFullYear(), date.getMonth(), date.getDate());
    cells.push({
      date,
      dateString,
      inMonth: date.getMonth() === month,
      isToday: dateString === todayString,
    });
  }
  return cells;
}

export default function CalendarScreen() {
  const theme = useTheme();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<DayCell | null>(null);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  function goToMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  function openLinkedScreen(pathname: '/spiritual-journal' | '/priorities' | '/kingdom-finance') {
    if (!selected) return;
    const date = selected.dateString;
    setSelected(null);
    router.push({ pathname, params: { date } });
  }

  const selectedHoliday = selected ? getHoliday(selected.dateString) : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.monthNav}>
          <Pressable onPress={() => goToMonth(-1)} hitSlop={10}>
            <ThemedText type="subtitle">‹</ThemedText>
          </Pressable>
          <Pressable onPress={goToToday} hitSlop={10}>
            <ThemedText type="subtitle">
              {viewYear}년 {viewMonth + 1}월
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => goToMonth(1)} hitSlop={10}>
            <ThemedText type="subtitle">›</ThemedText>
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((w, i) => (
            <View key={w} style={styles.weekdayCell}>
              <ThemedText
                type="smallBold"
                themeColor="textSecondary"
                style={i === 0 ? { color: SUNDAY_COLOR } : i === 6 ? { color: SATURDAY_COLOR } : undefined}>
                {w}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((cell) => {
            const holiday = getHoliday(cell.dateString);
            const weekday = cell.date.getDay();
            const dateColor = holiday || weekday === 0 ? SUNDAY_COLOR : weekday === 6 ? SATURDAY_COLOR : theme.text;

            return (
              <Pressable
                key={cell.dateString}
                onPress={() => setSelected(cell)}
                style={[styles.dayCell, cell.isToday && { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText
                  type="smallBold"
                  style={[
                    { color: cell.isToday ? '#ffffff' : dateColor },
                    !cell.inMonth && styles.dimmed,
                  ]}>
                  {cell.date.getDate()}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={1}
                  style={[styles.hebrewLabel, cell.isToday && { color: '#ffffff' }, !cell.inMonth && styles.dimmed]}>
                  {getHebrewDayLabelKST(cell.date)}
                </ThemedText>
                {holiday && (
                  <ThemedText
                    numberOfLines={1}
                    style={[
                      styles.holidayLabel,
                      { color: cell.isToday ? '#ffffff' : SUNDAY_COLOR },
                      !cell.inMonth && styles.dimmed,
                    ]}>
                    {holiday}
                  </ThemedText>
                )}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      <Modal visible={selected != null} animationType="fade" transparent onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelected(null)}>
          <ThemedView
            type="background"
            style={[styles.sheet, { borderColor: theme.backgroundElement }]}
            onStartShouldSetResponder={() => true}>
            {selected && (
              <>
                <ThemedText type="subtitle">{getKoreanDateKST(selected.date)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {getHebrewDateKST(selected.date)}
                </ThemedText>
                {selectedHoliday && (
                  <ThemedText type="smallBold" style={{ color: SUNDAY_COLOR }}>
                    {selectedHoliday}
                  </ThemedText>
                )}

                <View style={styles.sheetActions}>
                  <Pressable
                    onPress={() => openLinkedScreen('/spiritual-journal')}
                    style={({ pressed }) => [
                      styles.sheetAction,
                      { backgroundColor: theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="small">❤️‍🔥 영성일기</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => openLinkedScreen('/priorities')}
                    style={({ pressed }) => [
                      styles.sheetAction,
                      { backgroundColor: theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="small">📊 우선순위</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => openLinkedScreen('/kingdom-finance')}
                    style={({ pressed }) => [
                      styles.sheetAction,
                      { backgroundColor: theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="small">🪙 천국재정</ThemedText>
                  </Pressable>
                </View>

                <Pressable onPress={() => setSelected(null)} style={styles.closeButton}>
                  <ThemedText type="link" themeColor="textSecondary">
                    닫기
                  </ThemedText>
                </Pressable>
              </>
            )}
          </ThemedView>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    minHeight: 64,
    paddingVertical: Spacing.one,
    alignItems: 'center',
    borderRadius: Spacing.two,
    gap: 2,
  },
  hebrewLabel: {
    fontSize: 10,
  },
  holidayLabel: {
    fontSize: 10,
  },
  dimmed: {
    opacity: 0.35,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  sheetActions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  sheetAction: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  closeButton: {
    alignSelf: 'center',
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
