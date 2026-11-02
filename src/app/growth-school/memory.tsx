import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  clearMemoryCheck,
  getMemoryStart,
  listAttendance,
  listMemoryChecks,
  listStudents,
  setMemoryCheck,
  setMemoryStart,
  type GrowthAttendanceRow,
  type GrowthMemoryCheck,
  type GrowthStudent,
} from '@/db/growth';
import { ChipRow, GrowthCard, PrimaryButton, SectionTitle } from '@/features/growth/ui';
import { useSchool } from '@/features/growth/useSchool';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { formatKoreanDate, kstToday } from '@/lib/growth';
import {
  MEMORY_DAY_LABELS,
  MEMORY_WEEKS,
  addDays,
  dayPlan,
  memoryDaySummary,
  mondayOf,
  startForWeek,
  weekDates,
  weekIndex,
  weekdayOf,
  type MemoryStatus,
} from '@/lib/growthMemory';

/**
 * 점심 전 암송 — 월~금, 통과하면 점심.
 *
 * 교사는 한 화면에서 끝낸다: 오늘 구절을 보고, 아이가 외우면 「통과 🍚」,
 * 막히면 「다시」. 「다시」는 몇 번이고 누를 수 있고 몇 번째인지 센다 —
 * 실패를 적는 게 아니라 **다시 해 본 횟수**를 적는다. 그래서 빨강이 아니라
 * `support` 색이다(성장ON §7).
 *
 * 앱이 점심을 막지는 않는다. 통과 여부를 보여 줄 뿐, 판단은 선생님이 한다.
 *
 * 보호자·학생은 같은 화면을 읽기 전용으로 본다(정책이 자기 자녀만 연다).
 */
export default function GrowthMemoryScreen() {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';
  const { loading, userId, schoolId, isStaff, isOwner } = useSchool();

  const today = kstToday();
  // 주말엔 그 주 금요일(복습)을 펼쳐 둔다.
  const [date, setDate] = useState(() => (weekdayOf(today) ? today : addDays(mondayOf(today), 4)));
  const [start, setStart] = useState<string | null>(null);
  const [students, setStudents] = useState<GrowthStudent[]>([]);
  const [checks, setChecks] = useState<GrowthMemoryCheck[]>([]);
  const [attendance, setAttendance] = useState<GrowthAttendanceRow[]>([]);
  const [hideText, setHideText] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const days = useMemo(() => weekDates(date), [date]);
  // 0096 전이면 시작일이 없다 — 「이번 주 = 1주차」로 물러선다.
  const base = start ?? mondayOf(today);
  const plan = dayPlan(base, date);
  const weekNo = weekIndex(base, date) + 1;
  const week = MEMORY_WEEKS[weekNo - 1];

  const load = useCallback(async () => {
    if (!schoolId) return;
    try {
      const [s, rows] = await Promise.all([getMemoryStart(schoolId), listStudents(schoolId)]);
      setStart(s);
      const active = rows.filter((r) => r.active);
      setStudents(active);
      const ids = active.map((r) => r.id);
      const [c, a] = await Promise.all([
        listMemoryChecks(ids, days[0], days[4]),
        listAttendance(ids, days[0], days[4]),
      ]);
      setChecks(c);
      setAttendance(a);
      setMessage('');
    } catch (e) {
      const text = e instanceof Error ? e.message : '';
      setMessage(
        text.includes('growth_memory_checks')
          ? '암송 기록 표가 아직 없습니다. 0096 마이그레이션을 먼저 실행해 주세요.'
          : text || '불러오지 못했어요.',
      );
    }
  }, [schoolId, days]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const checkOf = (studentId: string, d: string) =>
    checks.find((c) => c.student_id === studentId && c.on_date === d) ?? null;

  async function mark(student: GrowthStudent, next: MemoryStatus) {
    if (!userId) return setMessage('로그인 정보를 확인하지 못했어요. 다시 들어와 주세요.');
    if (!plan) return setMessage('주말에는 암송 확인이 없습니다.');
    const prev = checkOf(student.id, date);
    setBusyId(student.id);
    try {
      if (prev?.status === 'passed' && next === 'passed') {
        // 통과를 한 번 더 누르면 취소 — 잘못 누른 것을 되돌리는 길.
        await clearMemoryCheck(student.id, date);
        setChecks((cs) => cs.filter((c) => c !== prev));
        setMessage(`${student.name} 통과를 취소했습니다.`);
        return;
      }
      // 「다시」 뒤에 오는 것은 새 도전이다. 통과를 「다시」로 고치는 것은 정정이라 횟수를 안 올린다.
      const tries = !prev ? 1 : prev.status === 'retry' ? prev.tries + 1 : prev.tries;
      await setMemoryCheck(student.id, date, plan.key, next, tries, userId);
      const row: GrowthMemoryCheck = {
        id: prev?.id ?? `local-${student.id}-${date}`,
        student_id: student.id,
        on_date: date,
        verse_key: plan.key,
        status: next,
        tries,
      };
      setChecks((cs) => [...cs.filter((c) => c !== prev), row]);
      setMessage(next === 'passed' ? `${student.name} 통과 — 점심 🍚` : `${student.name} 다시 도전 (${tries}번째)`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장하지 못했어요.');
    } finally {
      setBusyId(null);
    }
  }

  async function changeWeek(n: number | null) {
    if (!schoolId || !n) return;
    const next = startForWeek(mondayOf(date), n);
    try {
      await setMemoryStart(schoolId, next);
      setStart(next);
      setMessage(`이 주를 ${n}주차로 맞췄습니다.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '바꾸지 못했어요.');
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  if (!schoolId) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText themeColor="textSecondary" style={Type.body}>
          먼저 학교에 들어와 주세요.
        </ThemedText>
      </ThemedView>
    );
  }

  const summary = memoryDaySummary(
    students.map((s) => s.id),
    checks,
    date,
  );
  const absentToday = new Set(
    attendance.filter((a) => a.on_date === date && a.status === 'absent').map((a) => a.student_id),
  );
  const onText = isDark ? '#241A16' : '#FFFFFF';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <GrowthCard>
          <View style={styles.rowBetween}>
            <Pressable onPress={() => setDate(addDays(date, -7))} hitSlop={8}>
              <ThemedText themeColor="accent" style={Type.itemTitle}>
                ◀ 지난 주
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => setDate(weekdayOf(today) ? today : addDays(mondayOf(today), 4))} hitSlop={8}>
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                이번 주로
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => setDate(addDays(date, 7))} hitSlop={8}>
              <ThemedText themeColor="accent" style={Type.itemTitle}>
                다음 주 ▶
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText themeColor="textSecondary" style={Type.caption}>
            {weekNo}주차 / {MEMORY_WEEKS.length} · 주제 「{week.theme}」
          </ThemedText>
          <ThemedText style={Type.screenTitle}>{week.title}</ThemedText>

          <View style={styles.days}>
            {days.map((d, i) => {
              const on = d === date;
              const s = memoryDaySummary(
                students.map((x) => x.id),
                checks,
                d,
              );
              return (
                <Pressable
                  key={d}
                  onPress={() => setDate(d)}
                  style={[
                    styles.dayPill,
                    { borderColor: on ? theme.accent : theme.border, backgroundColor: on ? theme.accent : 'transparent' },
                  ]}>
                  <ThemedText style={[Type.itemTitle, { color: on ? onText : theme.text } as TextStyle]}>
                    {MEMORY_DAY_LABELS[i]}
                    {i === 4 ? ' 복습' : ''}
                  </ThemedText>
                  <ThemedText style={[Type.caption, { color: on ? onText : theme.textSecondary } as TextStyle]}>
                    {s.total ? `${s.passed}/${s.total}` : formatKoreanDate(d)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </GrowthCard>

        {plan ? (
          <GrowthCard>
            <View style={styles.rowBetween}>
              <SectionTitle hint={formatKoreanDate(date)}>
                {plan.isReview ? '금요일 복습 — 이번 주 네 구절 모두' : `${MEMORY_DAY_LABELS[plan.day - 1]}요일 암송`}
              </SectionTitle>
              <Pressable onPress={() => setHideText((v) => !v)} hitSlop={8}>
                <ThemedText themeColor="accent" style={Type.caption}>
                  {hideText ? '본문 보기' : '본문 가리기'}
                </ThemedText>
              </Pressable>
            </View>
            {plan.verses.map((v) => (
              <View key={v.ref} style={[styles.verse, { borderLeftColor: theme.accent }]}>
                <ThemedText style={Type.itemTitle}>{v.ref}</ThemedText>
                <ThemedText style={[Type.body, hideText && { opacity: 0 }]}>{v.text}</ThemedText>
              </View>
            ))}
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              개역한글
            </ThemedText>
          </GrowthCard>
        ) : null}

        {plan ? (
          <GrowthCard>
            <SectionTitle hint={isStaff ? '통과를 한 번 더 누르면 취소됩니다.' : undefined}>
              {`통과 ${summary.passed} · 다시 도전 ${summary.retry} · 아직 ${summary.pending}`}
            </SectionTitle>
            {students.map((s) => {
              const c = checkOf(s.id, date);
              const passed = c?.status === 'passed';
              const retry = c?.status === 'retry';
              return (
                <View key={s.id} style={[styles.studentRow, { borderTopColor: theme.border }]}>
                  <View style={styles.studentInfo}>
                    <ThemedText style={Type.itemTitle}>
                      {s.name}
                      {absentToday.has(s.id) ? ' · 결석' : ''}
                    </ThemedText>
                    <ThemedText
                      style={[
                        Type.caption,
                        { color: passed ? theme.accent : retry ? theme.support : theme.textSecondary } as TextStyle,
                      ]}>
                      {passed
                        ? `통과 · 점심 🍚${c.tries > 1 ? ` (${c.tries}번째에)` : ''}`
                        : retry
                          ? `다시 도전 중 · ${c.tries}번 해 봤어요`
                          : '아직'}
                    </ThemedText>
                  </View>
                  {isStaff ? (
                    <View style={styles.actions}>
                      <Pressable
                        disabled={busyId === s.id}
                        onPress={() => mark(s, 'retry')}
                        style={[
                          styles.action,
                          { borderColor: theme.support, backgroundColor: retry ? theme.support : 'transparent' },
                        ]}>
                        <ThemedText style={[Type.caption, { color: retry ? '#FFFFFF' : theme.support } as TextStyle]}>
                          🔁 다시
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        disabled={busyId === s.id}
                        onPress={() => mark(s, 'passed')}
                        style={[
                          styles.action,
                          { borderColor: theme.done, backgroundColor: passed ? theme.done : 'transparent' },
                        ]}>
                        <ThemedText style={[Type.caption, { color: passed ? '#241A16' : theme.text } as TextStyle]}>
                          ✅ 통과 🍚
                        </ThemedText>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
            {!students.length ? (
              <ThemedText themeColor="textSecondary" style={Type.body}>
                등록된 학생이 없습니다.
              </ThemedText>
            ) : null}
          </GrowthCard>
        ) : (
          <GrowthCard>
            <ThemedText themeColor="textSecondary" style={Type.body}>
              주말에는 암송 확인이 없습니다.
            </ThemedText>
          </GrowthCard>
        )}

        {students.length ? (
          <GrowthCard>
            <SectionTitle hint="✅ 통과 · 🔁 다시 도전 · · 아직">이번 주 한눈에</SectionTitle>
            <View style={styles.gridRow}>
              <ThemedText style={[Type.caption, styles.gridName]} themeColor="textSecondary">
                {' '}
              </ThemedText>
              {MEMORY_DAY_LABELS.map((l) => (
                <ThemedText key={l} themeColor="textSecondary" style={[Type.caption, styles.gridCell]}>
                  {l}
                </ThemedText>
              ))}
            </View>
            {students.map((s) => (
              <View key={s.id} style={styles.gridRow}>
                <ThemedText style={[Type.caption, styles.gridName]} numberOfLines={1}>
                  {s.name}
                </ThemedText>
                {days.map((d) => {
                  const c = checkOf(s.id, d);
                  return (
                    <ThemedText key={d} style={[Type.caption, styles.gridCell]}>
                      {c?.status === 'passed' ? '✅' : c?.status === 'retry' ? '🔁' : '·'}
                    </ThemedText>
                  );
                })}
              </View>
            ))}
          </GrowthCard>
        ) : null}

        {isOwner ? (
          <GrowthCard>
            <SectionTitle hint="방학 뒤 다시 시작하거나 중간부터 할 때 맞춥니다.">이 주는 몇 주차인가요?</SectionTitle>
            <ChipRow
              options={MEMORY_WEEKS.map((w, i) => ({ id: String(i + 1), label: `${i + 1}주 ${w.theme}` }))}
              value={String(weekNo)}
              onChange={(id) => changeWeek(id ? Number(id) : null)}
            />
          </GrowthCard>
        ) : null}

        {message ? (
          <ThemedText themeColor="textSecondary" style={Type.caption}>
            {message}
          </ThemedText>
        ) : null}
        {message.includes('0096') ? <PrimaryButton label="다시 불러오기" tone="quiet" onPress={load} /> : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.three },
  list: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  days: { flexDirection: 'row', gap: Spacing.one },
  dayPill: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: Spacing.one, alignItems: 'center' },
  verse: { borderLeftWidth: 3, paddingLeft: Spacing.two, gap: 2 },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  studentInfo: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: Spacing.one },
  action: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 6 },
  gridRow: { flexDirection: 'row', alignItems: 'center' },
  gridName: { flex: 2 },
  gridCell: { flex: 1, textAlign: 'center' },
});
