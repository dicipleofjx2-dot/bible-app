import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Card, ThemedText, ThemedView } from '@/components/themed';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Bar, Row } from '@/features/ui';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_COLORS } from '@/lib/category';
import { formatShortWon, formatWon, monthLabel, thisMonth } from '@/lib/money';
import { recentSummaries, type MonthSummary } from '@/db/store';

const MONTHS = 6;

export default function Stats() {
  const { palette } = useTheme();
  const [summaries, setSummaries] = useState<MonthSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void recentSummaries(MONTHS).then((next) => {
        if (alive) setSummaries(next);
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  const biggest = Math.max(1, ...summaries.map((s) => s.spent));
  const withData = summaries.filter((s) => s.count > 0);
  const average = withData.length > 0 ? Math.round(withData.reduce((sum, s) => sum + s.spent, 0) / withData.length) : 0;
  const current = summaries.find((s) => s.month === thisMonth());

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Card style={{ gap: Spacing.md }}>
          <ThemedText style={{ fontWeight: '700' }}>최근 {MONTHS}달</ThemedText>
          {summaries.map((summary) => (
            <View key={summary.month} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <ThemedText style={{ fontSize: 14 }}>{monthLabel(summary.month)}</ThemedText>
                <ThemedText style={{ fontSize: 14, fontWeight: '700' }}>
                  {summary.count === 0 ? '—' : formatShortWon(summary.spent)}
                </ThemedText>
              </Row>
              <Bar ratio={summary.spent / biggest} color={summary.month === thisMonth() ? palette.accent : palette.textMuted} />
            </View>
          ))}
          {withData.length > 1 && (
            <ThemedText tone="muted" style={{ fontSize: 13 }}>
              내역이 있는 달의 한 달 평균 {formatWon(average)}
              {current && current.count > 0
                ? current.spent > average
                  ? ` · 이번 달은 ${formatWon(current.spent - average)} 더 쓰는 중`
                  : ` · 이번 달은 ${formatWon(average - current.spent)} 덜 쓰는 중`
                : ''}
            </ThemedText>
          )}
        </Card>

        {current && current.byCategory.length > 0 && (
          <Card style={{ gap: Spacing.md }}>
            <ThemedText style={{ fontWeight: '700' }}>{monthLabel(current.month)} 갈래별</ThemedText>
            {current.byCategory.map((item) => (
              <View key={item.category} style={{ gap: 6 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <ThemedText style={{ fontSize: 14 }}>
                    {item.category} <ThemedText tone="muted" style={{ fontSize: 12 }}>{item.count}건</ThemedText>
                  </ThemedText>
                  <ThemedText style={{ fontSize: 14, fontWeight: '700' }}>{formatWon(item.amount)}</ThemedText>
                </Row>
                <Bar ratio={item.amount / Math.max(1, current.spent)} color={CATEGORY_COLORS[item.category]} />
              </View>
            ))}
          </Card>
        )}

        {summaries.every((s) => s.count === 0) && (
          <ThemedText tone="muted" style={{ textAlign: 'center', marginTop: Spacing.xxl }}>
            아직 견줄 달이 없습니다. 문자를 담으면 여기에 흐름이 그려집니다.
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}
