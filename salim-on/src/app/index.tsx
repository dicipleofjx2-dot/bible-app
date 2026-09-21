import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import * as db from '@/db/household';
import { CheckButton, TaskRow } from '@/features/home/task-row';
import { Badge, Card, EmptyNote, Hero, PrimaryButton, ProgressBar, QuickButton, SectionTitle } from '@/features/home/ui';
import { useAuth } from '@/lib/auth';
import { addDays, formatDate, todayInSeoul } from '@/lib/chores';
import { useHousehold } from '@/lib/household';

/**
 * 오늘.
 *
 * 이 앱에서 매일 여는 화면은 여기 하나다. 그래서 **오늘 치를 시간순으로
 * 세워 두고, 내 일감을 맨 위로 올린다** — 화면을 열자마자 「내가 지금 뭘
 * 해야 하나」가 읽혀야 한다.
 *
 * 날짜를 앞뒤로 넘길 수 있게 두었다. 어제 못 한 것을 오늘 체크하는 일이
 * 실제로 자주 있다.
 */
export default function TodayScreen() {
  const { session, loading: authLoading } = useAuth();
  const { current, members, categories, chores, me, isManager, loading } = useHousehold();
  const [date, setDate] = useState(todayInSeoul());
  const [tasks, setTasks] = useState<db.Task[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!current) return;
    setBusy(true);
    try {
      setTasks(await db.listTasks(current.id, date, date));
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [current, date]);

  // 다른 화면에서 배치나 확인을 하고 돌아오면 여기가 낡아 있다. 돌아올 때마다
  // 다시 읽는다.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const byId = useMemo(() => {
    const chore = new Map(chores.map((c) => [c.id, c]));
    const category = new Map(categories.map((c) => [c.id, c]));
    const member = new Map(members.map((m) => [m.id, m]));
    return { chore, category, member };
  }, [chores, categories, members]);

  /** 내 일감이 먼저, 그다음 시간순. 「누가 하나」보다 「내가 뭘 하나」가 먼저다. */
  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aMine = me && a.member_id === me.id ? 0 : 1;
      const bMine = me && b.member_id === me.id ? 0 : 1;
      return aMine - bMine || a.at_time.localeCompare(b.at_time);
    });
  }, [tasks, me]);

  const doneCount = tasks.filter((t) => t.status === 'done' || t.status === 'approved').length;
  const waiting = tasks.filter(
    (t) => t.status === 'done' && byId.chore.get(t.chore_id)?.needs_review
  ).length;

  async function toggle(task: db.Task) {
    const next = task.status === 'todo' || task.status === 'rejected' ? 'done' : 'todo';
    try {
      await db.setTaskStatus(task.id, next);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  if (authLoading || loading) return null;
  if (!session) return <Redirect href="/sign-in" />;
  if (!current) return <Redirect href="/join" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}>
          <Hero
            emoji="🧺"
            title={current.name}
            subtitle={`${formatDate(date)}${date === todayInSeoul() ? ' · 오늘' : ''}`}
          />

          <Card>
            <ProgressBar done={doneCount} total={tasks.length} />
            <View style={styles.dateRow}>
              <PrimaryButton label="← 어제" tone="quiet" style={styles.dateButton} onPress={() => setDate(addDays(date, -1))} />
              <PrimaryButton label="오늘" tone="quiet" style={styles.dateButton} onPress={() => setDate(todayInSeoul())} />
              <PrimaryButton label="내일 →" tone="quiet" style={styles.dateButton} onPress={() => setDate(addDays(date, 1))} />
            </View>
            {waiting > 0 && isManager ? (
              <Badge label={`확인을 기다리는 일 ${waiting}가지`} tone="warn" emoji="🔎" />
            ) : null}
          </Card>

          <View style={styles.quickRow}>
            <QuickButton emoji="🗂️" label="집안일" onPress={() => router.push('/chores')} />
            <QuickButton emoji="🗓️" label="배치" onPress={() => router.push('/schedule')} />
            <QuickButton emoji="🔎" label="확인함" onPress={() => router.push('/review')} />
            <QuickButton emoji="🏆" label="점수판" onPress={() => router.push('/scores')} />
            <QuickButton emoji="👨‍👩‍👧" label="식구" onPress={() => router.push('/members')} />
          </View>

          <SectionTitle title="오늘 할 일" />

          {sorted.length === 0 ? (
            <Card>
              <EmptyNote
                emoji="🌿"
                text={
                  chores.length === 0
                    ? '집안일이 아직 없습니다. 「집안일」에서 무엇을 하는 집인지부터 적어 주세요.'
                    : '이 날에 펼쳐진 일감이 없습니다. 「배치」에서 이번 주를 펼쳐 주세요.'
                }
              />
              <PrimaryButton
                label={chores.length === 0 ? '집안일 적으러 가기' : '이번 주 배치하러 가기'}
                onPress={() => router.push(chores.length === 0 ? '/chores' : '/schedule')}
              />
            </Card>
          ) : (
            sorted.map((task) => {
              const chore = byId.chore.get(task.chore_id);
              const mine = !!me && task.member_id === me.id;
              // **자기 일감만 스스로 체크한다.** 관리자는 아무 일감이나 체크할 수
              // 있다 — 아이 대신 눌러 주는 일이 실제로 있다(표의 정책도 그렇다).
              const canCheck = mine || isManager;
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  chore={chore}
                  category={chore?.category_id ? byId.category.get(chore.category_id) : undefined}
                  member={task.member_id ? byId.member.get(task.member_id) : undefined}
                  mine={mine}
                  right={
                    <CheckButton
                      done={task.status === 'done' || task.status === 'approved'}
                      disabled={!canCheck || task.status === 'approved'}
                      onPress={() => toggle(task)}
                    />
                  }
                />
              );
            })
          )}

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
  dateRow: { flexDirection: 'row', gap: Spacing.two },
  dateButton: { flex: 1, paddingHorizontal: Spacing.two },
  // 다섯 단추를 한 줄에 둔다. wrap 을 두면 마지막 하나가 혼자 다음 줄에서
  // 화면 폭을 다 먹어 단추가 아니라 띠처럼 보인다(스크린샷으로 확인).
  quickRow: { flexDirection: 'row', gap: Spacing.two },
});
