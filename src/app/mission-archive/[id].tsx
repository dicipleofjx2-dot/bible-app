import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  getSubject,
  listAnswers,
  updateSubject,
  type MissionAnswer,
  type MissionSubject,
} from '@/db/missionArchive';
import { ChipRow, Field, MissionCard, PrimaryButton, ProgressBar } from '@/features/mission/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  axisProgress,
  factShort,
  needsCheck,
  nextQuestion,
  questionsFor,
  type MissionRole,
} from '@/lib/missionArchive';

const ROLE_OPTIONS: { id: MissionRole; label: string }[] = [
  { id: 'pastor', label: '목회자' },
  { id: 'missionary', label: '선교사' },
  { id: 'both', label: '목회자 · 선교사' },
  { id: 'other', label: '그 밖의 사역자' },
];

/**
 * 한 사역자의 기록 홈 (기획서 §16 「홈 화면」).
 *
 * 여기서 보여 주는 것은 넷이다 — 오늘 이어서 할 질문, 여섯 축의 진행,
 * 확인이 필요한 사건, 다음으로 갈 곳. 「무엇을 더 하면 되는지」가 한 화면에서
 * 읽히지 않으면 매일 이어 가지 못한다.
 */
export default function MissionSubjectScreen() {
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ownerId = session?.user.id ?? null;

  const [subject, setSubject] = useState<MissionSubject | null>(null);
  const [answers, setAnswers] = useState<MissionAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const [draft, setDraft] = useState({
    name: '',
    role: 'pastor' as MissionRole,
    denomination: '',
    church: '',
    fields: '',
    summary: '',
  });

  const load = useCallback(async () => {
    if (!ownerId || !id) {
      setLoading(false);
      return;
    }
    try {
      const [one, list] = await Promise.all([getSubject(id), listAnswers(id)]);
      setSubject(one);
      setAnswers(list);
      if (one) {
        setDraft({
          name: one.name,
          role: one.role,
          denomination: one.denomination,
          church: one.church,
          fields: one.fields,
          summary: one.summary,
        });
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [ownerId, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const role = subject?.role ?? 'pastor';
  const progress = useMemo(() => axisProgress(role, answers), [role, answers]);
  const next = useMemo(() => nextQuestion(role, answers), [role, answers]);
  const totals = useMemo(
    () => ({
      done: progress.reduce((sum, p) => sum + p.done, 0),
      total: questionsFor(role).length,
    }),
    [progress, role],
  );
  const checks = useMemo(() => needsCheck(answers), [answers]);

  async function saveInfo() {
    if (!id) return;
    try {
      await updateSubject(id, draft);
      setEditOpen(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장하지 못했어요.');
    }
  }

  async function toggleSecurity() {
    if (!id || !subject) return;
    try {
      await updateSubject(id, { security_mode: !subject.security_mode });
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '바꾸지 못했어요.');
    }
  }

  if (authLoading) return null;
  if (!session) return <Redirect href="/profile" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator style={styles.loading} color={theme.accent} />
          ) : !subject ? (
            <ThemedText style={Type.body}>기록을 찾지 못했습니다.</ThemedText>
          ) : (
            <>
              <ThemedText style={Type.screenTitle}>{subject.name}</ThemedText>
              <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                {[subject.denomination, subject.church, subject.fields].filter(Boolean).join(' · ') ||
                  '아래 「사역자 정보」에서 교단과 사역지를 적어 두면 원고 머리말에 함께 들어갑니다.'}
              </ThemedText>

              {/* 오늘 이어서 할 질문 — 기획서 §17 「매일 한 가지 질문」 */}
              <MissionCard>
                <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>
                  오늘 이어서 할 질문
                </ThemedText>
                <ThemedText style={Type.body}>
                  {next ? next.text : '모든 질문에 답하셨습니다. 이제 원고를 엮어 보세요.'}
                </ThemedText>
                <PrimaryButton
                  label={next ? '답하러 가기' : '원고 보기'}
                  onPress={() =>
                    router.push(
                      next ? `/mission-archive/${subject.id}/interview` : `/mission-archive/${subject.id}/manuscript`,
                    )
                  }
                />
              </MissionCard>

              {/* 여섯 축의 진행 */}
              <MissionCard>
                <ThemedText style={Type.itemTitle}>
                  기록의 여섯 축 · {totals.done}/{totals.total}
                </ThemedText>
                {progress.map((row) => (
                  <View key={row.axis} style={styles.axisRow}>
                    <View style={styles.axisHead}>
                      <ThemedText style={Type.itemDescription}>{row.label}</ThemedText>
                      <ThemedText themeColor="textSecondary" style={Type.caption}>
                        {row.done}/{row.total}
                      </ThemedText>
                    </View>
                    <ProgressBar done={row.done} total={row.total} />
                  </View>
                ))}
              </MissionCard>

              {/* 확인이 필요한 사건 — §13 */}
              {checks.length > 0 ? (
                <MissionCard>
                  <ThemedText style={Type.itemTitle}>확인이 필요한 이야기 {checks.length}건</ThemedText>
                  {checks.slice(0, 5).map((a) => (
                    <ThemedText key={a.id} themeColor="textSecondary" style={Type.itemDescription}>
                      · [{factShort(a.fact_status)}] {a.question}
                    </ThemedText>
                  ))}
                </MissionCard>
              ) : null}

              <View style={styles.menu}>
                {[
                  { emoji: '🎤', label: 'AI 사역 인터뷰', to: 'interview', desc: '질문에 답하면 꼬리질문이 이어집니다' },
                  { emoji: '🗓️', label: '사역 연표', to: 'timeline', desc: '파송·개척·이동·이양을 연도로' },
                  { emoji: '🗂️', label: '사역 자료실', to: 'assets', desc: '설교·사진·선교 편지·주보' },
                  { emoji: '👥', label: '동역자 증언', to: 'witnesses', desc: '링크를 보내 가족·성도의 기억을' },
                  { emoji: '🧭', label: '사역의 발자취', to: 'places', desc: '장소별로 모아 본 사역지' },
                  { emoji: '🔍', label: '사실 검토실', to: 'review', desc: '확인 상태와 공개 범위를 한자리에서' },
                  { emoji: '📖', label: '원고 편집실', to: 'manuscript', desc: '장별 초고를 엮고 내보냅니다' },
                  { emoji: '🎬', label: '다큐 스튜디오', to: 'documentary', desc: '장면·내레이션·자막 대본 초고' },
                  { emoji: '🏛️', label: '디지털 기념관', to: 'memorial', desc: '공개로 표시한 것만 한 장으로 엽니다' },
                ].map((item) => (
                  <Pressable
                    key={item.to}
                    onPress={() => router.push(`/mission-archive/${subject.id}/${item.to}`)}
                    style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
                    <MissionCard>
                      <ThemedText style={Type.itemTitle}>
                        {item.emoji} {item.label}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                        {item.desc}
                      </ThemedText>
                    </MissionCard>
                  </Pressable>
                ))}
              </View>

              {/* 보안 지역 — §14 */}
              <MissionCard>
                <ThemedText style={Type.itemTitle}>선교지 보안</ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                  켜 두면 내보내는 원고에서 장소와 인물 칸을 ○○ 로 가립니다. 본문 속 지명과 실명은
                  기계가 지우지 않으니 출판 전에 직접 확인해 주세요.
                </ThemedText>
                <PrimaryButton
                  label={subject.security_mode ? '보안 모드 켜짐 — 끄기' : '보안 모드 켜기'}
                  tone={subject.security_mode ? 'accent' : 'quiet'}
                  onPress={toggleSecurity}
                />
              </MissionCard>

              {editOpen ? (
                <MissionCard>
                  <ThemedText style={Type.itemTitle}>사역자 정보</ThemedText>
                  <Field label="성함" value={draft.name} onChangeText={(v) => setDraft({ ...draft, name: v })} />
                  <ChipRow
                    label="사역"
                    options={ROLE_OPTIONS}
                    value={draft.role}
                    onChange={(v) => setDraft({ ...draft, role: v })}
                  />
                  <Field
                    label="교단"
                    value={draft.denomination}
                    onChangeText={(v) => setDraft({ ...draft, denomination: v })}
                    hint="신학적 배경을 적어 두면 원고에서 교리를 임의로 바꾸지 않도록 지켜집니다."
                  />
                  <Field label="교회 · 선교단체" value={draft.church} onChangeText={(v) => setDraft({ ...draft, church: v })} />
                  <Field label="사역지" value={draft.fields} onChangeText={(v) => setDraft({ ...draft, fields: v })} />
                  <Field
                    label="한 줄 소개"
                    value={draft.summary}
                    onChangeText={(v) => setDraft({ ...draft, summary: v })}
                    multiline
                  />
                  <PrimaryButton label="저장" onPress={saveInfo} />
                  <PrimaryButton label="닫기" tone="quiet" onPress={() => setEditOpen(false)} />
                </MissionCard>
              ) : (
                <PrimaryButton label="사역자 정보 고치기" tone="quiet" onPress={() => setEditOpen(true)} />
              )}
            </>
          )}

          {message ? <ThemedText style={[Type.caption, { color: theme.accent }]}>{message}</ThemedText> : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%' },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  loading: { marginVertical: Spacing.four },
  axisRow: { gap: Spacing.one },
  axisHead: { flexDirection: 'row', justifyContent: 'space-between' },
  menu: { gap: Spacing.two },
  pressed: { opacity: 0.7 },
});
