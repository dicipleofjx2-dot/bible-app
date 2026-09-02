import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getHebrewDayInfoForDate,
  hebrewDateHasContent,
  type HebrewDayEntry,
} from '@/lib/hebrew-calendar-events';
import { getHebrewDateKST, getHebrewDayLabelKST, getKoreanDateKST } from '@/lib/hebrew-date';
import { getHoliday } from '@/lib/korea-holidays';
import { getPortionOfWeek, getPortionOnDate, type TorahPortionOfWeek } from '@/lib/torah-portions';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const SUNDAY_COLOR = '#e03131';
const SATURDAY_COLOR = '#2f6fed';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateString(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** "2026-10-17" → "10월 17일". 어느 안식일에 읽는지 짚어 준다. */
function formatShabbatLabel(dateString: string) {
  const [, month, day] = dateString.split('-').map(Number);
  return `${month}월 ${day}일`;
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

  const selectedHoliday = selected ? getHoliday(selected.dateString) : undefined;
  const selectedInfo = useMemo(
    () => (selected ? getHebrewDayInfoForDate(selected.date) : null),
    [selected],
  );
  // 토라포션은 두 가지를 따로 보여 준다.
  //  · 오늘 읽는 것 — 안식일, 그리고 심핫 토라(안식일이 아닌 날에 읽는다).
  //  · 이번 주에 읽을 것 — 히브리력의 한 주는 안식일에 끝나므로 **다가오는 토요일**.
  // 하나로 합치면 심핫 토라 같은 날에 "오늘 읽는 것"이 사라진다.
  const portionToday = useMemo(
    () => (selected ? getPortionOnDate(selected.date) : null),
    [selected],
  );
  const portionThisWeek = useMemo(
    () => (selected ? getPortionOfWeek(selected.date) : null),
    [selected],
  );
  const selectedPortion = portionToday ?? portionThisWeek;

  const selectedIsEmpty =
    selectedInfo != null &&
    selectedInfo.festivals.length === 0 &&
    selectedInfo.bible.length === 0 &&
    selectedInfo.history.length === 0 &&
    selectedPortion == null;

  function renderPortion(title: string, portion: TorahPortionOfWeek, showShabbatLine: boolean) {
    return (
      <View style={styles.section} key={title}>
        <ThemedText type="smallBold" themeColor="accent">
          {title}
        </ThemedText>
        <View style={[styles.portionCard, { backgroundColor: theme.accentSoft }]}>
          <ThemedText type="smallBold">
            {portion.name}
            <ThemedText type="small" themeColor="textSecondary">
              {'  '}
              {portion.parts.map((p) => p.meaning).join(' · ')}
            </ThemedText>
          </ThemedText>
          <ThemedText type="smallBold" themeColor="accent" style={styles.portionRange}>
            {portion.range}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {portion.isSimchatTorah
              ? '토라를 다 읽고 다시 창세기로 돌아가는 날입니다.'
              : showShabbatLine
                ? `${formatShabbatLabel(portion.shabbat)} 안식일에 회당에서 읽습니다.`
                : '안식일에 회당에서 읽습니다.'}
          </ThemedText>
          {portion.parts.map(
            (p) =>
              p.hebrewNote && (
                <ThemedText key={p.en} type="small" themeColor="textSecondary">
                  ※ {p.hebrewNote}
                </ThemedText>
              ),
          )}

          {portion.haftarah && (
            <View style={[styles.haftarahBox, { borderTopColor: theme.border }]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                하프타라 (이어 읽는 예언서)
              </ThemedText>
              <ThemedText type="smallBold" themeColor="accent" style={styles.portionRange}>
                {portion.haftarah.ashkenazi}
                {portion.haftarah.sephardi ? ' (아슈케나짐)' : ''}
              </ThemedText>
              {portion.haftarah.sephardi && (
                <ThemedText type="smallBold" themeColor="accent" style={styles.portionRange}>
                  {portion.haftarah.sephardi} (세파르딤)
                </ThemedText>
              )}
              {portion.haftarah.sephardi && (
                <ThemedText type="small" themeColor="textSecondary">
                  전통에 따라 읽는 곳이 다른 편입니다.
                </ThemedText>
              )}
            </View>
          )}

          <View style={styles.portionButtons}>
            <Pressable
              onPress={() => {
                const first = portion.parts[0];
                setSelected(null);
                router.push(`/read?bookId=${first.book}&chapter=${first.startChapter}`);
              }}
              style={[styles.portionButton, { backgroundColor: theme.accent }]}>
              <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                토라 펴기
              </ThemedText>
            </Pressable>
            {portion.haftarah && (
              <Pressable
                onPress={() => {
                  const first = portion.haftarah!.first;
                  setSelected(null);
                  router.push(`/read?bookId=${first.book}&chapter=${first.startChapter}`);
                }}
                style={[styles.portionButton, styles.portionButtonGhost, { borderColor: theme.accent }]}>
                <ThemedText type="smallBold" themeColor="accent">
                  하프타라 펴기
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  }

  function renderEntries(title: string, entries: HebrewDayEntry[]) {
    if (entries.length === 0) return null;
    return (
      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="accent">
          {title}
        </ThemedText>
        {entries.map((entry) => (
          <View key={entry.title} style={styles.entry}>
            <ThemedText type="smallBold">{entry.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {entry.body}
            </ThemedText>
            {entry.ref && (
              <ThemedText type="small" themeColor="accent">
                {entry.ref}
              </ThemedText>
            )}
          </View>
        ))}
      </View>
    );
  }

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
            // 절기나 성경·역사 기록이 붙은 날은 히브리 날짜를 강조색으로 —
            // 칸 높이를 건드리지 않으면서 "누를 것이 있다"를 알린다.
            const hasEvents = hebrewDateHasContent(cell.date);
            // 그 날 **바로** 읽는 편이 있는 날(안식일·심핫 토라)에만 두루마리를
            // 붙인다. 한국 공휴일과 자리를 다투므로 공휴일이 있으면 그쪽을 살린다.
            const readsTorahToday = !holiday && getPortionOnDate(cell.date) != null;

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
                  style={[
                    styles.hebrewLabel,
                    hasEvents && { color: theme.accent, fontWeight: '700' },
                    cell.isToday && { color: '#ffffff' },
                    !cell.inMonth && styles.dimmed,
                  ]}>
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
                {readsTorahToday && (
                  <ThemedText
                    numberOfLines={1}
                    style={[styles.holidayLabel, !cell.inMonth && styles.dimmed]}>
                    📜
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
            {selected && selectedInfo && (
              <>
                <ScrollView
                  style={styles.sheetScroll}
                  contentContainerStyle={styles.sheetContent}
                  showsVerticalScrollIndicator={false}>
                  <ThemedText type="subtitle">{getKoreanDateKST(selected.date)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {getHebrewDateKST(selected.date)}
                  </ThemedText>
                  {selectedHoliday && (
                    <ThemedText type="smallBold" style={{ color: SUNDAY_COLOR }}>
                      {selectedHoliday}
                    </ThemedText>
                  )}

                  {selectedInfo.festivals.length > 0 && (
                    <View style={styles.badgeRow}>
                      {selectedInfo.festivals.map((festival) => (
                        <View
                          key={festival}
                          style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
                          <ThemedText type="smallBold" style={{ color: theme.accent }}>
                            {festival}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}

                  {portionToday && renderPortion(
                    portionToday.isSimchatTorah ? '토라포션 · 심핫 토라' : '토라포션 · 오늘 읽습니다',
                    portionToday,
                    false,
                  )}
                  {portionThisWeek && portionThisWeek.shabbat !== portionToday?.shabbat &&
                    renderPortion('이번 주 토라포션', portionThisWeek, true)}

                  {renderEntries('성경에서 이 날', selectedInfo.bible)}
                  {renderEntries('역사에서 이 날', selectedInfo.history)}

                  {selectedIsEmpty && (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.section}>
                      이 히브리 날짜에 매인 기록은 없습니다.
                    </ThemedText>
                  )}

                  {selectedInfo.monthNote && (
                    <View style={[styles.monthNote, { borderTopColor: theme.backgroundElement }]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {selectedInfo.monthNote}
                      </ThemedText>
                    </View>
                  )}

                  <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
                    유대력의 하루는 전날 해 질 때 시작합니다. 절기를 지킬 때는 하루 앞당겨 보세요.
                  </ThemedText>
                </ScrollView>

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
  portionCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
  portionRange: {
    fontSize: 16,
  },
  haftarahBox: {
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    marginTop: Spacing.two,
    gap: Spacing.half,
  },
  portionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  portionButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
  },
  portionButtonGhost: {
    borderWidth: 1,
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
    maxHeight: '85%',
    borderRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  section: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  entry: {
    gap: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.two,
  },
  monthNote: {
    marginTop: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
  },
  footnote: {
    marginTop: Spacing.two,
    fontSize: 12,
    lineHeight: 18,
  },
  closeButton: {
    alignSelf: 'center',
    marginTop: Spacing.one,
  },
});
