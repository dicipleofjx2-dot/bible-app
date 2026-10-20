import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 달력에서 날짜 하나 고르기.
 *
 * 왜 직접 그리는가 — 날짜 고르는 것은 OS 마다 다른 창이 뜨고(`DateTimePicker`),
 * **웹에서는 그 창이 아예 없다.** 이 앱은 폰과 웹에서 같이 돌아가므로, 어디서나
 * 같은 모양으로 뜨는 쪽이 낫다. 한 달 치 눈금 하나면 되는 일에 라이브러리를
 * 더하지도 않는다.
 *
 * 지난 날짜는 고를 수 없게 흐려 둔다 — 사역 날짜를 어제로 잡을 일은 없고, 잘못
 * 눌러도 성도 화면에는 「앞으로의 일정」만 뜨므로 조용히 사라져 버린다.
 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function MonthPicker({
  value,
  onChange,
  tint,
}: {
  /** 'YYYY-MM-DD' 또는 빈 글. */
  value: string;
  onChange: (dateString: string) => void;
  /** 고른 날을 칠할 색. 사역마다 다르다. */
  tint: string;
}) {
  const theme = useTheme();
  const today = new Date();
  const todayString = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // 고른 날이 있으면 그 달을, 없으면 이번 달을 펼친다.
  const [year, setYear] = useState(() =>
    value ? Number(value.slice(0, 4)) : today.getFullYear(),
  );
  const [month, setMonth] = useState(() =>
    value ? Number(value.slice(5, 7)) - 1 : today.getMonth(),
  );

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const days = new Date(year, month + 1, 0).getDate();
    const blanks = first.getDay();
    const out: (string | null)[] = Array(blanks).fill(null);
    for (let d = 1; d <= days; d += 1) out.push(`${year}-${pad(month + 1)}-${pad(d)}`);
    return out;
  }, [year, month]);

  function move(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Pressable onPress={() => move(-1)} hitSlop={10}>
          <ThemedText type="subtitle">‹</ThemedText>
        </Pressable>
        <ThemedText type="smallBold">
          {year}년 {month + 1}월
        </ThemedText>
        <Pressable onPress={() => move(1)} hitSlop={10}>
          <ThemedText type="subtitle">›</ThemedText>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <View key={w} style={styles.cell}>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={i === 0 ? styles.sunday : i === 6 ? styles.saturday : undefined}>
              {w}
            </ThemedText>
          </View>
        ))}

        {cells.map((dateString, i) => {
          if (!dateString) return <View key={`blank-${i}`} style={styles.cell} />;
          const day = Number(dateString.slice(8));
          const weekday = new Date(year, month, day).getDay();
          const past = dateString < todayString;
          const chosen = dateString === value;
          return (
            <Pressable
              key={dateString}
              onPress={() => !past && onChange(dateString)}
              disabled={past}
              style={[
                styles.cell,
                styles.day,
                chosen && { backgroundColor: tint },
                past && styles.past,
              ]}>
              <ThemedText
                type={chosen ? 'smallBold' : 'small'}
                style={[
                  chosen
                    ? styles.chosenText
                    : weekday === 0
                      ? styles.sunday
                      : weekday === 6
                        ? styles.saturday
                        : { color: theme.text },
                ]}>
                {day}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1.25, alignItems: 'center', justifyContent: 'center' },
  day: { borderRadius: 10 },
  past: { opacity: 0.3 },
  chosenText: { color: '#ffffff' },
  sunday: { color: '#e03131' },
  saturday: { color: '#2f6fed' },
});
