import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';

import { Card, ThemedText, ThemedView } from '@/components/themed';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Bar, Button, Row } from '@/features/ui';
import { useTheme } from '@/hooks/use-theme';
import { captureSupported, isListenerEnabled } from '@/lib/capture';
import { CATEGORY_COLORS } from '@/lib/category';
import { formatWon, monthLabel, thisMonth } from '@/lib/money';
import { getSettings, summarizeMonth, type MonthSummary, type Settings } from '@/db/store';

export default function Home() {
  const { palette } = useTheme();
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [listenerOn, setListenerOn] = useState(false);
  const month = thisMonth();

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        const [next, saved] = await Promise.all([summarizeMonth(month), getSettings()]);
        if (!alive) return;
        setSummary(next);
        setSettings(saved);
        setListenerOn(isListenerEnabled());
      })();
      return () => {
        alive = false;
      };
    }, [month])
  );

  const spent = summary?.spent ?? 0;
  const budget = settings?.monthlyBudget ?? null;
  const top = summary?.byCategory.filter((c) => c.amount > 0).slice(0, 6) ?? [];
  const biggest = top[0]?.amount ?? 0;

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Card>
          <ThemedText tone="muted" style={{ fontSize: 14 }}>
            {monthLabel(month)}에 쓴 돈
          </ThemedText>
          <ThemedText style={{ fontSize: 34, fontWeight: '800', marginTop: Spacing.xs }}>{formatWon(spent)}</ThemedText>
          <ThemedText tone="muted" style={{ fontSize: 13, marginTop: Spacing.xs }}>
            승인 {summary?.count ?? 0}건
            {summary && summary.cancelled > 0 ? ` · 취소 ${formatWon(summary.cancelled)} 빼고` : ''}
          </ThemedText>

          {budget !== null && budget > 0 && (
            <View style={{ marginTop: Spacing.md, gap: Spacing.xs }}>
              <Bar ratio={spent / budget} color={spent > budget ? palette.danger : palette.accent} />
              <ThemedText tone={spent > budget ? 'danger' : 'muted'} style={{ fontSize: 13 }}>
                {spent > budget
                  ? `예산 ${formatWon(budget)}보다 ${formatWon(spent - budget)} 더 썼습니다`
                  : `예산 ${formatWon(budget)} 가운데 ${formatWon(budget - spent)} 남았습니다`}
              </ThemedText>
            </View>
          )}

          {summary !== null && summary.missingAmount > 0 && (
            <ThemedText tone="danger" style={{ fontSize: 13, marginTop: Spacing.sm }}>
              금액을 못 읽은 건이 {summary.missingAmount}건 있습니다(해외 승인). 합계에 들어가지 않았습니다 — 내역에서 금액을 적어 주세요.
            </ThemedText>
          )}
        </Card>

        <Row style={{ gap: Spacing.md }}>
          <Button label="＋ 문자 넣기" onPress={() => router.push('/paste')} style={{ flex: 1 }} />
          <Button label="전체 내역" tone="plain" onPress={() => router.push('/txns')} style={{ flex: 1 }} />
        </Row>

        {top.length > 0 ? (
          <Card style={{ gap: Spacing.md }}>
            <ThemedText style={{ fontWeight: '700' }}>무엇에 썼나</ThemedText>
            {top.map((item) => (
              <Pressable key={item.category} onPress={() => router.push({ pathname: '/txns', params: { category: item.category } })}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <ThemedText style={{ fontSize: 15 }}>{item.category}</ThemedText>
                  <ThemedText style={{ fontSize: 15, fontWeight: '700' }}>{formatWon(item.amount)}</ThemedText>
                </Row>
                <View style={{ marginTop: 6 }}>
                  <Bar ratio={biggest > 0 ? item.amount / biggest : 0} color={CATEGORY_COLORS[item.category]} />
                </View>
              </Pressable>
            ))}
          </Card>
        ) : (
          <Card style={{ gap: Spacing.sm }}>
            <ThemedText style={{ fontWeight: '700' }}>아직 담긴 내역이 없습니다</ThemedText>
            <ThemedText tone="muted" style={{ fontSize: 14, lineHeight: 21 }}>
              카톡에서 삼성카드 문자를 길게 눌러 복사한 뒤 「문자 넣기」에 붙여넣으세요. 여러 통을 한꺼번에 붙여넣어도
              한 건씩 갈라 읽습니다. 같은 문자를 두 번 붙여넣어도 두 번 담기지 않습니다.
            </ThemedText>
          </Card>
        )}

        <Row style={{ gap: Spacing.md }}>
          <Button label="달마다 흐름" tone="plain" onPress={() => router.push('/stats')} style={{ flex: 1 }} />
          <Button label="설정" tone="plain" onPress={() => router.push('/settings')} style={{ flex: 1 }} />
        </Row>

        {captureSupported && !listenerOn && (
          <Pressable onPress={() => router.push('/settings')}>
            <Card style={{ backgroundColor: palette.accentSoft, borderColor: 'transparent' }}>
              <ThemedText style={{ fontWeight: '700' }}>자동으로 담게 할 수 있습니다</ThemedText>
              <ThemedText tone="muted" style={{ fontSize: 13, marginTop: Spacing.xs, lineHeight: 20 }}>
                알림 접근을 켜 두면 카드 문자가 올 때마다 손대지 않아도 담깁니다. 설정에서 켜기 →
              </ThemedText>
            </Card>
          </Pressable>
        )}

        {!captureSupported && Platform.OS === 'web' && (
          <ThemedText tone="muted" style={{ fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
            웹에서는 문자를 붙여넣어 담습니다. 자동으로 담는 것은 안드로이드 앱에서만 됩니다.
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}
