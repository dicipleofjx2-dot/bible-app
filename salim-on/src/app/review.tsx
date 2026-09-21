import { Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import * as db from '@/db/household';
import { TaskRow } from '@/features/home/task-row';
import { Card, EmptyNote, Field, Hero, PrimaryButton, SectionTitle, StarPicker } from '@/features/home/ui';
import { addDays, basePoints, qualityMultiplier, todayInSeoul } from '@/lib/chores';
import { useHousehold } from '@/lib/household';

/**
 * 확인함.
 *
 * 「확인 필요」를 켜 둔 집안일만 여기로 온다. **확인하기 전에는 점수가 0 이다**
 * — 확인이 형식이 되어 버리면 확인할 이유가 없다(점수는 표의 트리거가 매긴다).
 *
 * 반려하면 점수는 0 이고 담당자의 오늘 목록에 「다시 해야 함」으로 돌아간다.
 * 벌점을 따로 두지 않았다: 다시 하는 것이 이미 대가다.
 */
export default function ReviewScreen() {
  const { current, members, categories, chores, isManager, me, loading } = useHousehold();
  const [tasks, setTasks] = useState<db.Task[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [stars, setStars] = useState(3);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    if (!current) return;
    setBusy(true);
    try {
      // 지난 보름치만 본다. 한 달 전에 못 본 것을 오늘 별점 매기는 것은
      // 확인이 아니라 서류 작업이다.
      const list = await db.listTasks(current.id, addDays(todayInSeoul(), -14), todayInSeoul());
      setTasks(list);
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [current]);

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

  const waiting = useMemo(
    () => tasks.filter((t) => t.status === 'done' && byId.chore.get(t.chore_id)?.needs_review),
    [tasks, byId.chore]
  );
  const recent = useMemo(
    () => tasks.filter((t) => t.status === 'approved' || t.status === 'rejected').slice(-15).reverse(),
    [tasks]
  );

  // **집을 다 읽기 전에는 아무 데로도 보내지 않는다.** 이 화면을 바로 열거나
  // 새로고침하면 current 가 잠깐 비어 있는데, 그때 곧장 /join 으로 보내면
  // 링크로 들어온 사람이 영영 이 화면을 못 본다.
  if (loading) return null;
  if (!current) return <Redirect href="/join" />;
  if (!isManager) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.content}>
            <Card>
              <EmptyNote emoji="🔎" text="확인은 관리자만 합니다. 끝낸 일은 관리자가 확인하면 점수가 붙습니다." />
            </Card>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  async function decide(task: db.Task, approved: boolean) {
    if (!me) return;
    setBusy(true);
    try {
      await db.reviewTask(task.id, me.id, stars, approved, note.trim());
      setOpen(null);
      setStars(3);
      setNote('');
      await load();
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
          <Hero emoji="🔎" title="확인함" subtitle={`확인을 기다리는 일 ${waiting.length}가지`} />

          {waiting.length === 0 ? (
            <Card>
              <EmptyNote emoji="🌿" text="확인을 기다리는 일이 없습니다." />
            </Card>
          ) : null}

          {waiting.map((task) => {
            const chore = byId.chore.get(task.chore_id);
            const base = chore ? basePoints(chore.difficulty, chore.minutes) : 0;
            const timing = (task.late_minutes ?? 0) === 0 ? 5 : 0;
            return (
              <View key={task.id} style={styles.item}>
                <TaskRow
                  task={task}
                  chore={chore}
                  category={chore?.category_id ? byId.category.get(chore.category_id) : undefined}
                  member={task.member_id ? byId.member.get(task.member_id) : undefined}
                  onPress={() => {
                    setOpen(open === task.id ? null : task.id);
                    setStars(3);
                    setNote('');
                  }}
                />
                {open === task.id ? (
                  <Card>
                    <SectionTitle title="얼마나 잘 됐나요" />
                    <StarPicker value={stars} onChange={setStars} />
                    <ThemedText themeColor="textSecondary" style={Type.caption}>
                      승인하면 약 {Math.max(0, Math.round((base + timing) * qualityMultiplier(stars)))}점이
                      붙습니다 (기본 {base} · 정시 {timing} · 별점 {qualityMultiplier(stars)}배).
                    </ThemedText>
                    <Field label="한마디" value={note} onChangeText={setNote} placeholder="바닥 구석이 남았어요" />
                    <PrimaryButton label={busy ? '적는 중…' : '승인하기'} onPress={() => decide(task, true)} disabled={busy} />
                    <PrimaryButton
                      label="다시 해 달라고 하기"
                      tone="danger"
                      onPress={() => decide(task, false)}
                      disabled={busy}
                    />
                  </Card>
                ) : null}
              </View>
            );
          })}

          {recent.length ? (
            <>
              <SectionTitle title="최근 확인한 것" />
              {recent.map((task) => {
                const chore = byId.chore.get(task.chore_id);
                return (
                  <View key={task.id} style={styles.item}>
                    <TaskRow
                      task={task}
                      chore={chore}
                      category={chore?.category_id ? byId.category.get(chore.category_id) : undefined}
                      member={task.member_id ? byId.member.get(task.member_id) : undefined}
                    />
                    {task.review_note ? (
                      <ThemedText themeColor="textSecondary" style={[Type.caption, styles.note]}>
                        “{task.review_note}”
                      </ThemedText>
                    ) : null}
                  </View>
                );
              })}
            </>
          ) : null}

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
  item: { gap: Spacing.one },
  note: { paddingHorizontal: Spacing.three },
});
