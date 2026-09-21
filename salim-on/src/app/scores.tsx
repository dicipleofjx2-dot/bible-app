import { Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import * as db from '@/db/household';
import { Badge, Card, ChipRow, EmptyNote, Hero, SectionTitle, usePalette } from '@/features/home/ui';
import { useTheme } from '@/hooks/use-theme';
import { badgesFor, formatDate, monthRange, tallyScores, todayInSeoul, weekDates } from '@/lib/chores';
import { useHousehold } from '@/lib/household';

/**
 * 점수판.
 *
 * **점수는 등수를 매기려고 있는 것이 아니라 「누가 얼마나 지고 있나」를 보려고
 * 있다.** 그래서 1등만 크게 띄우지 않고 막대를 나란히 세운다 — 한 사람만 길면
 * 그 집은 점수판을 보고 일을 다시 나눠야 한다는 뜻이다.
 *
 * 뱃지에는 늘 **받은 이유**를 같이 적는다. 이유 없이 붙는 상은 다음 주에 다툴
 * 씨앗이 된다.
 */
export default function ScoresScreen() {
  const { current, members, chores, loading } = useHousehold();
  const theme = useTheme();
  const palette = usePalette();
  const [span, setSpan] = useState<'week' | 'month'>('week');
  const [tasks, setTasks] = useState<db.Task[]>([]);
  const [message, setMessage] = useState('');

  const range = useMemo(() => {
    const today = todayInSeoul();
    if (span === 'month') return monthRange(today);
    const days = weekDates(today, current?.week_start ?? 1);
    return { from: days[0], to: days[6] };
  }, [span, current?.week_start]);

  const load = useCallback(async () => {
    if (!current) return;
    try {
      setTasks(await db.listTasks(current.id, range.from, range.to));
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }, [current, range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const choreById = useMemo(() => new Map(chores.map((c) => [c.id, c])), [chores]);

  const rows = useMemo(
    () =>
      tallyScores(
        tasks.map((t) => ({
          member_id: t.member_id,
          status: t.status,
          points: t.points,
          quality: t.quality,
          late_minutes: t.late_minutes,
          minutes: choreById.get(t.chore_id)?.minutes ?? 0,
        })),
        members.filter((m) => m.active)
      ),
    [tasks, members, choreById]
  );

  const badges = useMemo(() => badgesFor(rows), [rows]);
  const top = rows[0]?.points ?? 0;
  const total = rows.reduce((sum, r) => sum + r.points, 0);

  // **집을 다 읽기 전에는 아무 데로도 보내지 않는다.** 이 화면을 바로 열거나
  // 새로고침하면 current 가 잠깐 비어 있는데, 그때 곧장 /join 으로 보내면
  // 링크로 들어온 사람이 영영 이 화면을 못 본다.
  if (loading) return null;
  if (!current) return <Redirect href="/join" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Hero
            emoji="🏆"
            title="점수판"
            subtitle={`${formatDate(range.from)} ~ ${formatDate(range.to)} · 온 집안 ${total}점`}
          />

          <Card>
            <ChipRow
              options={[
                { id: 'week', label: '이번 주' },
                { id: 'month', label: '이번 달' },
              ]}
              value={span}
              onChange={(v) => v && setSpan(v)}
            />
          </Card>

          {rows.every((r) => r.assigned === 0) ? (
            <Card>
              <EmptyNote emoji="🌱" text="이 기간에 맡은 일감이 없습니다. 「배치」에서 먼저 펼쳐 주세요." />
            </Card>
          ) : null}

          {rows.map((row, index) => (
            <Card key={row.memberId}>
              <View style={styles.rankRow}>
                <ThemedText style={Type.itemTitle}>
                  {index === 0 && row.points > 0 ? '👑 ' : `${index + 1}. `}
                  {row.emoji} {row.name}
                </ThemedText>
                <ThemedText style={[styles.points, { color: palette.green } as TextStyle]}>
                  {row.points}점
                </ThemedText>
              </View>
              <View style={[styles.track, { backgroundColor: theme.accentSoft }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      backgroundColor: palette.green,
                      // 1등을 기준으로 잰다. 총점 기준으로 재면 식구가 늘수록
                      // 막대가 전부 짧아져 서로 견줄 수가 없다.
                      width: `${top > 0 ? Math.round((row.points / top) * 100) : 0}%`,
                    },
                  ]}
                />
              </View>
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                맡은 {row.assigned}가지 중 {row.done}가지 끝냄 · 제시간 {row.onTime}가지 ·{' '}
                {Math.round(row.minutes / 6) / 10}시간
                {row.stars.length
                  ? ` · 확인 ${row.stars.length}번 평균 ★${(
                      row.stars.reduce((a, b) => a + b, 0) / row.stars.length
                    ).toFixed(1)}`
                  : ''}
              </ThemedText>
              <View style={styles.badges}>
                {badges
                  .filter((b) => b.memberId === row.memberId)
                  .map((b) => (
                    <Badge key={b.label} label={`${b.label} — ${b.why}`} tone="warn" emoji={b.emoji} />
                  ))}
              </View>
            </Card>
          ))}

          <Card>
            <SectionTitle title="점수를 어떻게 매기나" />
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              기본점 = 난이도 × 4 + 올림(분 ÷ 5) × 2. 제시간에 끝내면 +5, 같은 날 안에 늦으면 그대로,
              하루를 넘기면 −5. 확인이 필요한 일은 별점에 따라 ★1 0.4배 ~ ★5 1.3배. 반려는 0점입니다.
              {'\n\n'}
              「봐주는 시간」은 {current.grace_min}분입니다 — 그 안에 끝내면 제시간으로 봅니다.
              {'\n\n'}
              끝낸 시각은 서버가 잽니다. 폰 시계를 돌려도 점수는 달라지지 않습니다.
            </ThemedText>
          </Card>

          {message ? (
            <Card>
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                {message}
              </ThemedText>
            </Card>
          ) : null}

          <View style={{ height: Spacing.six }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  rankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  points: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  track: { height: 12, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
});
