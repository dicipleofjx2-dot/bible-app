import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getHebrewDayLabelKST } from '@/lib/hebrew-date';
import { getHoliday } from '@/lib/korea-holidays';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const SUNDAY_COLOR = '#e03131';
const SATURDAY_COLOR = '#2f6fed';
const MARK_COLOR = '#f59f00';

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

/** Compact month-grid picker, embedded directly in a screen (not a standalone
 * route) — tapping a day calls `onSelectDate` so the caller can render that
 * date's content below, right on the same screen. `markedDates` draws a small
 * dot under any day that already has saved content (e.g. a diary entry). */
export function InlineCalendar({
  selectedDate,
  onSelectDate,
  markedDates,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  markedDates?: Set<string>;
}) {
  const theme = useTheme();
  const [selYear, selMonth] = selectedDate.split('-').map(Number);
  const [viewYear, setViewYear] = useState(selYear);
  const [viewMonth, setViewMonth] = useState(selMonth - 1);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  function goToMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function goToToday() {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onSelectDate(toDateString(today.getFullYear(), today.getMonth(), today.getDate()));
  }

  return (
    <View style={styles.container}>
      <View style={styles.monthNav}>
        <Pressable onPress={() => goToMonth(-1)} hitSlop={10}>
          <ThemedText type="subtitle">‹</ThemedText>
        </Pressable>
        <Pressable onPress={goToToday} hitSlop={10}>
          <ThemedText type="smallBold">
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
              type="small"
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
          const isSelected = cell.dateString === selectedDate;
          const hasMark = markedDates?.has(cell.dateString);

          return (
            <Pressable
              key={cell.dateString}
              onPress={() => onSelectDate(cell.dateString)}
              style={[
                styles.dayCell,
                cell.isToday && !isSelected && { backgroundColor: theme.backgroundElement },
                isSelected && { backgroundColor: theme.backgroundSelected },
              ]}>
              <ThemedText
                type="small"
                style={[{ color: isSelected ? '#ffffff' : dateColor }, !cell.inMonth && styles.dimmed]}>
                {cell.date.getDate()}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={1}
                style={[styles.hebrewLabel, isSelected && { color: '#ffffff' }, !cell.inMonth && styles.dimmed]}>
                {getHebrewDayLabelKST(cell.date)}
              </ThemedText>
              <View style={[styles.markDot, hasMark && { backgroundColor: MARK_COLOR }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.two,
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
    minHeight: 44,
    paddingVertical: Spacing.one,
    alignItems: 'center',
    borderRadius: Spacing.two,
    gap: 2,
  },
  hebrewLabel: {
    fontSize: 9,
  },
  dimmed: {
    opacity: 0.35,
  },
  markDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
