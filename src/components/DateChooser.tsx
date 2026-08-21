import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 값은 **시점(ISO)** 으로 주고받는다. 화면에서는 이 기기의 시간으로 보여 준다.
 *
 * 날짜만 쓰면 서버(UTC)와 한국 날짜가 자정~오전 9시 사이에 어긋나 "오늘부터"가
 * 오전 9시에야 뜨는 일이 생긴다. 시점으로 두면 어디서 적었든 같은 순간이다.
 */
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toParts(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function atTime(base: Date, hour: number, minute: number): string {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** 오늘로부터 며칠 뒤, 시각은 이미 정한 것을 그대로(없으면 오전 9시). */
function daysFromToday(days: number, keep: Date | null): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return atTime(d, keep ? keep.getHours() : 9, keep ? keep.getMinutes() : 0);
}

function shiftDays(current: Date | null, days: number): string {
  const d = current ? new Date(current) : new Date();
  if (!current) d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** 9월 14일 (월) 오전 9:00 — 요일과 오전/오후를 함께 보여 준다. */
function label(d: Date): string {
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  const h = d.getHours();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekday}) ${ampm} ${h12}:${pad(d.getMinutes())}`;
}

const QUICK_DAYS: { label: string; days: number }[] = [
  { label: '오늘', days: 0 },
  { label: '내일', days: 1 },
  { label: '1주 뒤', days: 7 },
  { label: '2주 뒤', days: 14 },
  { label: '한 달 뒤', days: 30 },
];

// 교회에서 실제로 고르는 시각들. 새벽기도·주일예배·저녁집회 언저리다.
const QUICK_TIMES: { label: string; hour: number; minute: number }[] = [
  { label: '새벽 5시', hour: 5, minute: 0 },
  { label: '오전 9시', hour: 9, minute: 0 },
  { label: '낮 12시', hour: 12, minute: 0 },
  { label: '오후 6시', hour: 18, minute: 0 },
  { label: '밤 9시', hour: 21, minute: 0 },
  { label: '자정', hour: 0, minute: 0 },
];

type Props = {
  title: string;
  /** ISO 시점. 빈 문자열이면 "정하지 않음". */
  value: string;
  onChange: (next: string) => void;
  hint?: string;
};

/**
 * 날짜와 시각을 **버튼으로만** 고른다.
 *
 * 예전에는 "2026-09-01"을 손으로 치게 했다. 휴대폰에서 열한 자를 정확히 치는
 * 것은 번거롭고, 한 글자만 틀리면 저장이 막히거나 엉뚱한 날에 뜬다.
 *
 * 실제로 고르는 날은 몇 개뿐이다 — 오늘, 내일, 한두 주 뒤. 시각도 마찬가지로
 * 새벽기도·주일예배·저녁집회 언저리다. 그것을 버튼으로 두고, 하루씩·30분씩
 * 미세하게 밀 수 있게 ◀ ▶를 붙였다.
 *
 * 요일을 함께 보여 준다. 숫자만 늘어놓으면 "9월 14일"이 무슨 요일인지 몰라
 * 주일 행사를 토요일로 잡는 실수가 난다.
 */
export function DateChooser({ title, value, onChange, hint }: Props) {
  const theme = useTheme();
  const current = toParts(value);

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {title}
        </ThemedText>
        {value ? (
          <Pressable onPress={() => onChange('')} style={styles.clear}>
            <ThemedText type="small" themeColor="textSecondary">
              지우기
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.valueRow, { backgroundColor: theme.backgroundElement }]}>
        <Pressable
          onPress={() => onChange(shiftDays(current, -1))}
          accessibilityLabel="하루 앞으로"
          style={styles.nudge}>
          <ThemedText type="smallBold">◀</ThemedText>
        </Pressable>
        <View style={styles.valueBox}>
          <ThemedText type="smallBold">{current ? label(current) : '정하지 않음'}</ThemedText>
        </View>
        <Pressable
          onPress={() => onChange(shiftDays(current, 1))}
          accessibilityLabel="하루 뒤로"
          style={styles.nudge}>
          <ThemedText type="smallBold">▶</ThemedText>
        </Pressable>
      </View>

      <View style={styles.quickRow}>
        {QUICK_DAYS.map((q) => (
          <Pressable
            key={q.label}
            onPress={() => onChange(daysFromToday(q.days, current))}
            style={[styles.quickChip, { borderColor: theme.border }]}>
            <ThemedText type="small">{q.label}</ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.quickRow}>
        {QUICK_TIMES.map((t) => {
          const on =
            current !== null && current.getHours() === t.hour && current.getMinutes() === t.minute;
          return (
            <Pressable
              key={t.label}
              onPress={() => onChange(atTime(current ?? new Date(), t.hour, t.minute))}
              style={[
                styles.quickChip,
                {
                  backgroundColor: on ? theme.backgroundSelected : 'transparent',
                  borderColor: theme.border,
                },
              ]}>
              <ThemedText type="small">{t.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clear: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  nudge: { minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  valueBox: { flex: 1, alignItems: 'center' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  quickChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
});
