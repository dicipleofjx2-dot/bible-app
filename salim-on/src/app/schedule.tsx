import { Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import * as db from '@/db/household';
import { TaskRow } from '@/features/home/task-row';
import { Badge, Card, EmptyNote, Hero, PrimaryButton, SectionTitle } from '@/features/home/ui';
import { useTheme } from '@/hooks/use-theme';
import {
  addDays,
  assignFairly,
  basePoints,
  findOverlaps,
  formatDate,
  todayInSeoul,
  type AssignItem,
  type AssignResult,
} from '@/lib/chores';
import { useHousehold } from '@/lib/household';

/**
 * 이번 주 배치.
 *
 * 두 걸음이다. **① 펼치기** — 적어 둔 집안일을 그 주의 날짜에 실제 일감으로
 * 내려놓는다. **② 배정** — 아직 주인이 없는 일감을 식구에게 나눈다.
 *
 * 자동 배정은 **미리 보여 준 뒤 확정한다.** 눌렀더니 바로 바뀌어 버리면,
 * 한 번 잘못 누른 사람이 다시는 안 누른다.
 */
export default function ScheduleScreen() {
  const { current, members, categories, chores, isManager, loading } = useHousehold();
  const theme = useTheme();
  const [anchor, setAnchor] = useState(todayInSeoul());
  const [tasks, setTasks] = useState<db.Task[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<AssignResult | null>(null);
  const [picking, setPicking] = useState<string | null>(null);

  const week = useMemo(() => {
    const start = current?.week_start ?? 1;
    const shift = (new Date(`${anchor}T00:00:00Z`).getUTCDay() - start + 7) % 7;
    const first = addDays(anchor, -shift);
    return { from: first, to: addDays(first, 6), days: Array.from({ length: 7 }, (_, i) => addDays(first, i)) };
  }, [anchor, current?.week_start]);

  const load = useCallback(async () => {
    if (!current) return;
    setBusy(true);
    try {
      setTasks(await db.listTasks(current.id, week.from, week.to));
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [current, week.from, week.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const byId = useMemo(
    () => ({
      chore: new Map(chores.map((c) => [c.id, c])),
      category: new Map(categories.map((c) => [c.id, c])),
      member: new Map(members.map((m) => [m.id, m])),
    }),
    [chores, categories, members]
  );

  const overlaps = useMemo(
    () =>
      new Set(
        findOverlaps(
          tasks.map((t) => ({
            key: t.id,
            memberId: t.member_id,
            date: t.on_date,
            time: t.at_time,
            minutes: byId.chore.get(t.chore_id)?.minutes ?? 15,
          }))
        )
      ),
    [tasks, byId.chore]
  );

  const unassigned = tasks.filter((t) => !t.member_id).length;
  const activeMembers = members.filter((m) => m.active);

  // **집을 다 읽기 전에는 아무 데로도 보내지 않는다.** 이 화면을 바로 열거나
  // 새로고침하면 current 가 잠깐 비어 있는데, 그때 곧장 /join 으로 보내면
  // 링크로 들어온 사람이 영영 이 화면을 못 본다.
  if (loading) return null;
  if (!current) return <Redirect href="/join" />;

  async function expand() {
    if (!current) return;
    setBusy(true);
    try {
      const made = await db.generateTasks(current.id, chores, week.from, week.to);
      await load();
      setMessage(made > 0 ? `${made}가지를 새로 펼쳤습니다.` : '새로 펼칠 것이 없습니다. 이미 다 있습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  /**
   * 미리보기를 만든다.
   *
   * **이미 끝난 일과 고정 담당자는 건드리지 않는다.** 대신 그 무게를 그 사람의
   * 「이미 진 짐」으로 셈에 넣는다 — 안 그러면 고정 담당 일을 잔뜩 맡은 사람이
   * 자동 배정에서도 또 최저점으로 보여 더 받는다.
   */
  function plan() {
    const startingLoad: Record<string, number> = {};
    const items: AssignItem[] = [];
    for (const task of tasks) {
      const chore = byId.chore.get(task.chore_id);
      const weight = chore ? basePoints(chore.difficulty, chore.minutes) : 10;
      const fixed = chore?.default_member_id ?? null;
      const movable = task.status === 'todo' && !fixed;
      if (movable) {
        items.push({
          key: task.id,
          date: task.on_date,
          time: task.at_time,
          minutes: chore?.minutes ?? 15,
          weight,
        });
      } else if (task.member_id) {
        startingLoad[task.member_id] = (startingLoad[task.member_id] ?? 0) + (task.points || weight);
      }
    }
    if (!items.length) {
      setPreview(null);
      setMessage('나눌 일감이 없습니다. 아직 아무도 안 맡은 「아직」 상태의 일감만 나눕니다.');
      return;
    }
    setPreview(
      assignFairly(
        items,
        activeMembers.map((m) => ({ id: m.id, name: m.display_name })),
        startingLoad
      )
    );
    setMessage('');
  }

  async function confirm() {
    if (!preview) return;
    setBusy(true);
    try {
      await db.assignMany(Object.entries(preview.assignments).map(([id, memberId]) => ({ id, memberId })));
      setPreview(null);
      await load();
      setMessage('배정했습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Hero
            emoji="🗓️"
            title="이번 주 배치"
            subtitle={`${formatDate(week.from)} ~ ${formatDate(week.to)} · 일감 ${tasks.length}가지`}
          />

          <Card>
            <View style={styles.navRow}>
              <PrimaryButton label="← 지난주" tone="quiet" style={styles.navButton} onPress={() => setAnchor(addDays(anchor, -7))} />
              <PrimaryButton label="이번 주" tone="quiet" style={styles.navButton} onPress={() => setAnchor(todayInSeoul())} />
              <PrimaryButton label="다음 주 →" tone="quiet" style={styles.navButton} onPress={() => setAnchor(addDays(anchor, 7))} />
            </View>
            <View style={styles.badges}>
              {unassigned > 0 ? <Badge label={`아직 주인 없는 일감 ${unassigned}가지`} tone="warn" emoji="🙋" /> : null}
              {overlaps.size > 0 ? <Badge label={`시간이 겹친 일감 ${overlaps.size}가지`} tone="alert" emoji="⚠️" /> : null}
            </View>
          </Card>

          {isManager ? (
            <Card>
              <SectionTitle title="① 펼치기" />
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                적어 둔 집안일을 이 주의 날짜에 내려놓습니다. 여러 번 눌러도 이미 있는 일감은 그대로
                둡니다 — 끝낸 표시나 바꿔 둔 담당자가 되돌아가지 않습니다.
              </ThemedText>
              <PrimaryButton label={busy ? '기다려 주세요…' : '이 주를 펼치기'} onPress={expand} disabled={busy} />

              <SectionTitle title="② 공평하게 나누기" />
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                점수가 적은 사람에게 먼저 갑니다. 「몇 개」가 아니라 「몇 점」으로 나눠야, 어려운 일만
                맡는 사람이 생기지 않습니다. 고정 담당자가 있는 일과 이미 끝난 일은 건드리지 않습니다.
              </ThemedText>
              <PrimaryButton label="자동 배정 미리보기" tone="quiet" onPress={plan} disabled={busy} />
            </Card>
          ) : null}

          {preview ? (
            <Card>
              <SectionTitle title="이렇게 나눕니다" />
              {activeMembers.map((m) => (
                <View key={m.id} style={styles.previewRow}>
                  <ThemedText style={Type.body}>
                    {m.emoji} {m.display_name}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    +{preview.added[m.id] ?? 0}점 ·{' '}
                    {Object.values(preview.assignments).filter((id) => id === m.id).length}가지
                  </ThemedText>
                </View>
              ))}
              {preview.conflicts.length ? (
                <Badge
                  label={`시간이 겹치게 놓인 일감 ${preview.conflicts.length}가지 — 아래에서 바꿔 주세요`}
                  tone="alert"
                  emoji="⚠️"
                />
              ) : null}
              <PrimaryButton label={busy ? '적는 중…' : '이대로 확정하기'} onPress={confirm} disabled={busy} />
              <PrimaryButton label="그만두기" tone="quiet" onPress={() => setPreview(null)} />
            </Card>
          ) : null}

          {tasks.length === 0 ? (
            <Card>
              <EmptyNote emoji="🗓️" text="이 주에 펼쳐진 일감이 없습니다. 위의 「이 주를 펼치기」를 눌러 주세요." />
            </Card>
          ) : null}

          {week.days.map((day) => {
            const ofDay = tasks.filter((t) => t.on_date === day);
            if (!ofDay.length) return null;
            return (
              <View key={day} style={styles.group}>
                <SectionTitle
                  title={formatDate(day)}
                  action={
                    <ThemedText themeColor="textSecondary" style={Type.caption}>
                      {ofDay.length}가지
                    </ThemedText>
                  }
                />
                {ofDay.map((task) => {
                  const chore = byId.chore.get(task.chore_id);
                  return (
                    <View key={task.id} style={styles.taskWrap}>
                      <TaskRow
                        task={task}
                        chore={chore}
                        category={chore?.category_id ? byId.category.get(chore.category_id) : undefined}
                        member={task.member_id ? byId.member.get(task.member_id) : undefined}
                        highlight={overlaps.has(task.id)}
                        onPress={isManager ? () => setPicking(picking === task.id ? null : task.id) : undefined}
                      />
                      {picking === task.id ? (
                        <View style={styles.pickRow}>
                          {activeMembers.map((m) => (
                            <Pressable
                              key={m.id}
                              onPress={async () => {
                                await db.assignTask(task.id, m.id);
                                setPicking(null);
                                await load();
                              }}
                              style={({ pressed }) => [
                                styles.pick,
                                {
                                  borderColor: task.member_id === m.id ? theme.accent : theme.border,
                                  backgroundColor: theme.backgroundElement,
                                  opacity: pressed ? 0.7 : 1,
                                },
                              ]}>
                              <ThemedText style={[Type.caption, { color: theme.text } as TextStyle]}>
                                {m.emoji} {m.display_name}
                              </ThemedText>
                            </Pressable>
                          ))}
                          <Pressable
                            onPress={async () => {
                              await db.assignTask(task.id, null);
                              setPicking(null);
                              await load();
                            }}
                            style={({ pressed }) => [
                              styles.pick,
                              { borderColor: theme.border, backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                            ]}>
                            <ThemedText style={[Type.caption, { color: theme.textSecondary } as TextStyle]}>
                              주인 없음
                            </ThemedText>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })}

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
  navRow: { flexDirection: 'row', gap: Spacing.two },
  navButton: { flex: 1, paddingHorizontal: Spacing.two },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  group: { gap: Spacing.two },
  taskWrap: { gap: Spacing.one },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingHorizontal: Spacing.two },
  pick: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one + 2 },
});
