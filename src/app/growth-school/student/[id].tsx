import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  addGoal,
  addMentoringNote,
  getStudent,
  listAttendance,
  listGoals,
  listMentoringNotes,
  listStudentRecords,
  setGoalStatus,
  updateStudent,
  type GrowthGoal,
  type GrowthMentoringNote,
  type GrowthRecordRow,
  type GrowthStudent,
} from '@/db/growth';
import { Bar, ChipRow, Field, GrowthCard, LevelBadge, PrimaryButton, SectionTitle } from '@/features/growth/ui';
import { useSchool } from '@/features/growth/useSchool';
import { useTheme } from '@/hooks/use-theme';
import {
  AREAS,
  HORIZONS,
  areaLabel,
  attendanceSummary,
  balanceDelta,
  balanceScores,
  formatKoreanDate,
  formatKoreanMonth,
  kstMonth,
  kstToday,
  previousMonth,
  strengthTags,
  type GoalHorizon,
} from '@/lib/growth';

type Tab = 'summary' | 'records' | 'goals' | 'notes';

/**
 * 학생 상세 — 기획서 §5.3.
 *
 * 탭 넷으로 나눴다. 한 화면에 다 쌓으면 교사가 쓰는 자리(기록·지도계획)가
 * 스크롤 저 아래로 밀린다.
 *
 * **상담 탭은 교직원에게만 보인다.** 표 자체가 갈라져 있어(0084) 보호자가
 * 주소를 직접 쳐도 한 줄도 오지 않지만, 화면에서도 감춘다 — 탭 이름만 보여도
 * 「무언가 적혀 있다」가 새기 때문이다.
 */
export default function GrowthStudentScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading: schoolLoading, userId, isStaff } = useSchool();

  const [tab, setTab] = useState<Tab>('summary');
  const [student, setStudent] = useState<GrowthStudent | null>(null);
  const [records, setRecords] = useState<GrowthRecordRow[]>([]);
  const [goals, setGoals] = useState<GrowthGoal[]>([]);
  const [notes, setNotes] = useState<GrowthMentoringNote[]>([]);
  const [attendance, setAttendance] = useState<{ on_date: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [goalHorizon, setGoalHorizon] = useState<GoalHorizon>('month');
  const [goalBody, setGoalBody] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [interests, setInterests] = useState('');
  const [dream, setDream] = useState('');

  const month = kstMonth();

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const s = await getStudent(id);
      setStudent(s);
      setInterests(s?.interests ?? '');
      setDream(s?.dream ?? '');
      const [recs, gs] = await Promise.all([listStudentRecords(id), listGoals(id)]);
      setRecords(recs);
      setGoals(gs);
      const atts = await listAttendance([id], `${month}-01`, `${month}-31`);
      setAttendance(atts);
      if (isStaff) setNotes(await listMentoringNotes(id));
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [id, isStaff, month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading || schoolLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  if (!student) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={Type.body}>{message || '학생을 찾지 못했습니다.'}</ThemedText>
      </ThemedView>
    );
  }

  const thisMonth = records.filter((r) => r.on_date.startsWith(month));
  const lastMonth = records.filter((r) => r.on_date.startsWith(previousMonth(month)));
  const balance = balanceScores(thisMonth);
  const delta = balanceDelta(balance, balanceScores(lastMonth));
  const strengths = strengthTags(records.slice(0, 60));
  const att = attendanceSummary(attendance as never);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'summary', label: '성장요약' },
    { id: 'records', label: '기록' },
    { id: 'goals', label: '지도계획' },
    ...(isStaff ? [{ id: 'notes' as Tab, label: '상담' }] : []),
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View>
          <ThemedText style={Type.screenTitle}>{student.name}</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            {[student.grade, student.dream ? `꿈: ${student.dream}` : ''].filter(Boolean).join(' · ') || ' '}
          </ThemedText>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((t) => {
            const on = t.id === tab;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id)}
                style={({ pressed }) => [
                  styles.tab,
                  {
                    borderColor: on ? theme.accent : theme.border,
                    backgroundColor: on ? theme.accentSoft : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <ThemedText style={[Type.caption, { color: on ? theme.accent : theme.textSecondary }]}>
                  {t.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {tab === 'summary' ? (
          <>
            <GrowthCard>
              <SectionTitle hint={`${formatKoreanMonth(month)} 기록으로 그렸습니다. 다른 학생과 견준 값이 아닙니다.`}>
                다섯 축의 균형
              </SectionTitle>
              {AREAS.filter((a) => a.id !== 'teacher').map((a) => {
                const v = balance[a.id as keyof typeof balance];
                const d = delta[a.id];
                return (
                  <View key={a.id} style={styles.axisRow}>
                    <ThemedText style={Type.itemDescription}>
                      {a.emoji} {a.label}
                    </ThemedText>
                    {v === null ? (
                      <ThemedText themeColor="textSecondary" style={Type.caption}>
                        이 달 기록 없음
                      </ThemedText>
                    ) : (
                      <>
                        <Bar value={v} />
                        <ThemedText themeColor="textSecondary" style={Type.caption}>
                          {v}
                          {typeof d === 'number' && d !== 0
                            ? ` · 지난달보다 ${d > 0 ? `+${d}` : d}`
                            : typeof d === 'number'
                              ? ' · 지난달과 비슷'
                              : ''}
                        </ThemedText>
                      </>
                    )}
                  </View>
                );
              })}
            </GrowthCard>

            <GrowthCard>
              <SectionTitle hint="「좋음」 이상이 두 번 넘게 적힌 영역만 뽑았습니다.">강점</SectionTitle>
              {strengths.length ? (
                <ThemedText style={Type.body}>
                  {strengths.map((s) => `${areaLabel(s.area)}(${s.count}회)`).join(' · ')}
                </ThemedText>
              ) : (
                <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                  아직 반복해서 적힌 강점이 없습니다. 기록이 쌓이면 나옵니다.
                </ThemedText>
              )}
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                이번 달 출결 — {att.sentence}
              </ThemedText>
            </GrowthCard>

            {isStaff ? (
              <GrowthCard>
                <Pressable onPress={() => setProfileOpen((v) => !v)}>
                  <SectionTitle>관심사와 꿈 {profileOpen ? '▾' : '▸'}</SectionTitle>
                </Pressable>
                {profileOpen ? (
                  <>
                    <Field label="관심사" value={interests} onChangeText={setInterests} />
                    <Field label="꿈" value={dream} onChangeText={setDream} />
                    <PrimaryButton
                      label="저장"
                      tone="quiet"
                      onPress={async () => {
                        await updateStudent(student.id, { interests, dream });
                        await load();
                      }}
                    />
                  </>
                ) : null}
              </GrowthCard>
            ) : null}

            <PrimaryButton
              label={`${formatKoreanMonth(month)} 성장보고서 열기`}
              onPress={() => router.push(`/growth-school/report/${student.id}?period=${month}`)}
            />
          </>
        ) : null}

        {tab === 'records' ? (
          <>
            {records.length ? (
              records.slice(0, 60).map((r) => (
                <GrowthCard key={r.id}>
                  <View style={styles.recordHead}>
                    <ThemedText style={Type.itemTitle}>
                      {areaLabel(r.area)}
                      {r.subject ? ` · ${r.subject}` : ''}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={Type.caption}>
                      {formatKoreanDate(r.on_date)}
                    </ThemedText>
                  </View>
                  <LevelBadge level={r.level} />
                  {r.body ? <ThemedText style={Type.body}>{r.body}</ThemedText> : null}
                  {r.next_action ? (
                    <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                      다음 지도: {r.next_action}
                    </ThemedText>
                  ) : null}
                  {isStaff ? (
                    <ThemedText themeColor="textSecondary" style={Type.caption}>
                      공개 범위: {r.visibility === 'teacher' ? '교사만' : r.visibility === 'guardian' ? '보호자까지' : '학생도 함께'}
                    </ThemedText>
                  ) : null}
                </GrowthCard>
              ))
            ) : (
              <ThemedText themeColor="textSecondary" style={Type.body}>
                아직 기록이 없습니다.
              </ThemedText>
            )}
          </>
        ) : null}

        {tab === 'goals' ? (
          <>
            {HORIZONS.map((h) => {
              const rows = goals.filter((g) => g.horizon === h.id);
              return (
                <GrowthCard key={h.id}>
                  <SectionTitle>{h.label}</SectionTitle>
                  {rows.length ? (
                    rows.map((g) => (
                      <Pressable
                        key={g.id}
                        disabled={!isStaff}
                        onPress={async () => {
                          await setGoalStatus(g.id, g.status === 'done' ? 'active' : 'done');
                          await load();
                        }}>
                        <ThemedText
                          themeColor={g.status === 'done' ? 'textSecondary' : 'text'}
                          style={Type.body}>
                          {g.status === 'done' ? '✓ ' : '· '}
                          {g.body}
                        </ThemedText>
                      </Pressable>
                    ))
                  ) : (
                    <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                      아직 없습니다.
                    </ThemedText>
                  )}
                </GrowthCard>
              );
            })}

            {isStaff ? (
              <GrowthCard>
                <SectionTitle hint="AI가 아니라 교사가 정합니다. 기록에서 나온 제안은 월간 보고서 초안에 붙습니다.">
                  목표 더하기
                </SectionTitle>
                <ChipRow
                  label="기간"
                  options={HORIZONS.map((h) => ({ id: h.id, label: h.label }))}
                  value={goalHorizon}
                  onChange={(v) => v && setGoalHorizon(v)}
                />
                <Field label="목표" value={goalBody} onChangeText={setGoalBody} multiline />
                <PrimaryButton
                  label="더하기"
                  onPress={async () => {
                    if (!userId || !goalBody.trim()) return;
                    await addGoal(student.id, goalHorizon, goalBody.trim(), month, userId);
                    setGoalBody('');
                    await load();
                  }}
                  disabled={!goalBody.trim()}
                />
              </GrowthCard>
            ) : null}
          </>
        ) : null}

        {tab === 'notes' && isStaff ? (
          <>
            <GrowthCard>
              <SectionTitle hint="이 표는 교사만 읽습니다. 보호자·학생 화면에 나오지 않습니다.">
                상담·건강 기록
              </SectionTitle>
              <Field label="내용" value={noteBody} onChangeText={setNoteBody} multiline />
              <PrimaryButton
                label="적기"
                onPress={async () => {
                  if (!userId || !noteBody.trim()) return;
                  await addMentoringNote(student.id, kstToday(), 'counsel', noteBody.trim(), userId);
                  setNoteBody('');
                  await load();
                }}
                disabled={!noteBody.trim()}
              />
            </GrowthCard>
            {notes.map((n) => (
              <GrowthCard key={n.id}>
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  {formatKoreanDate(n.on_date)}
                </ThemedText>
                <ThemedText style={Type.body}>{n.body}</ThemedText>
              </GrowthCard>
            ))}
          </>
        ) : null}

        {message ? (
          <ThemedText themeColor="textSecondary" style={Type.caption}>
            {message}
          </ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  list: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  tab: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 6 },
  axisRow: { gap: 4, paddingVertical: 4 },
  recordHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
});
