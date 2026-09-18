import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  getActivity,
  listParticipants,
  listStudents,
  setParticipants,
  updateActivity,
  updateParticipant,
  type GrowthActivity,
  type GrowthParticipant,
  type GrowthStudent,
} from '@/db/growth';
import { Field, GrowthCard, MultiChipRow, PrimaryButton, SectionTitle } from '@/features/growth/ui';
import { MarkdownPreview } from '@/features/mission/ui';
import { useSchool } from '@/features/growth/useSchool';
import { useTheme } from '@/hooks/use-theme';
import { buildActivityStory, formatKoreanDate } from '@/lib/growth';

/**
 * 체험활동 한 건 (기획서 §4.5).
 *
 * 세 덩이다 — ① 나가기 전(목표·준비물·안전·비상연락) ② 참여 학생
 * ③ 돌아온 뒤(학생 소감, 보호자 공개용 이야기).
 *
 * **보호자 공개는 교사가 검토한 뒤 켠다.** 자동으로 나가지 않는다(§6 흐름 5).
 * 이야기 초안에는 학생 이름을 넣지 않는다 — 반 전체 보호자가 읽는 글이다.
 */
export default function GrowthActivityScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading: schoolLoading, schoolId, isStaff } = useSchool();

  const [activity, setActivity] = useState<GrowthActivity | null>(null);
  const [students, setStudents] = useState<GrowthStudent[]>([]);
  const [participants, setRows] = useState<GrowthParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState<Partial<GrowthActivity>>({});
  const [story, setStory] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const a = await getActivity(id);
      setActivity(a);
      setDraft({});
      setStory(a?.story ?? '');
      setRows(await listParticipants(id));
      if (schoolId) setStudents(await listStudents(schoolId));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [id, schoolId]);

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

  if (!activity) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={Type.body}>{message || '활동을 찾지 못했습니다.'}</ThemedText>
      </ThemedView>
    );
  }

  const value = (key: keyof GrowthActivity) => (draft[key] as string) ?? ((activity[key] as string) || '');
  const set = (key: keyof GrowthActivity) => (v: string) => setDraft((prev) => ({ ...prev, [key]: v }));

  async function saveFields() {
    if (!activity) return;
    try {
      await updateActivity(activity.id, draft);
      await load();
      setMessage('저장했습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장하지 못했어요.');
    }
  }

  const picked = participants.map((p) => p.student_id);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View>
          <ThemedText style={Type.screenTitle}>{activity.title}</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            {formatKoreanDate(activity.on_date)}
            {activity.place ? ` · ${activity.place}` : ''}
          </ThemedText>
        </View>

        {isStaff ? (
          <GrowthCard>
            <SectionTitle hint="출발 전에 채웁니다.">활동 정보</SectionTitle>
            <Field label="장소" value={value('place')} onChangeText={set('place')} />
            <Field label="담당자" value={value('leader')} onChangeText={set('leader')} />
            <Field label="교육 목표" value={value('goal')} onChangeText={set('goal')} multiline />
            <Field label="교과·신앙 주제 연결" value={value('subject_link')} onChangeText={set('subject_link')} />
            <Field label="준비물" value={value('supplies')} onChangeText={set('supplies')} />
            <Field label="이동수단" value={value('transport')} onChangeText={set('transport')} />
            <Field label="비상연락" value={value('emergency')} onChangeText={set('emergency')} />
            <Field
              label="안전 점검"
              value={value('safety')}
              onChangeText={set('safety')}
              multiline
              hint="확인한 것을 적어 둡니다. 사고가 났을 때 무엇을 점검했는지가 남습니다."
            />
            <PrimaryButton label="저장" tone="quiet" onPress={saveFields} disabled={!Object.keys(draft).length} />
          </GrowthCard>
        ) : null}

        {isStaff ? (
          <GrowthCard>
            <MultiChipRow
              label="참여 학생"
              options={students.map((s) => ({ id: s.id, label: s.name }))}
              values={picked}
              onToggle={async (sid) => {
                if (picked.includes(sid)) return; // 뺄 때는 소감이 함께 지워지므로 화면에서 막는다
                await setParticipants(activity.id, [sid]);
                await load();
              }}
              onAll={async () => {
                await setParticipants(
                  activity.id,
                  students.map((s) => s.id),
                );
                await load();
              }}
            />
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              한 번 넣은 학생은 여기서 빼지 않습니다 — 그 아이가 쓴 소감이 함께 지워집니다.
            </ThemedText>
          </GrowthCard>
        ) : null}

        {participants.map((p) => {
          const s = students.find((x) => x.id === p.student_id);
          return (
            <GrowthCard key={p.id}>
              <SectionTitle>{s?.name ?? '학생'}</SectionTitle>
              <Field
                label="맡은 역할"
                value={p.role}
                onChangeText={(v) => setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, role: v } : r)))}
              />
              <Field
                label="학생 소감"
                value={p.reflection}
                onChangeText={(v) =>
                  setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, reflection: v } : r)))
                }
                multiline
                hint="학생이 직접 씁니다. 교사 관찰과 섞지 않습니다."
              />
              <Field
                label="배운 점"
                value={p.learned}
                onChangeText={(v) => setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, learned: v } : r)))}
              />
              <Field
                label="감사"
                value={p.thanks}
                onChangeText={(v) => setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, thanks: v } : r)))}
              />
              {isStaff ? (
                <Field
                  label="교사 관찰 (보호자 공개 이야기에는 들어가지 않습니다)"
                  value={p.observation}
                  onChangeText={(v) =>
                    setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, observation: v } : r)))
                  }
                  multiline
                />
              ) : null}
              <PrimaryButton
                label="이 학생 기록 저장"
                tone="quiet"
                onPress={async () => {
                  await updateParticipant(p.id, {
                    role: p.role,
                    reflection: p.reflection,
                    learned: p.learned,
                    thanks: p.thanks,
                    observation: p.observation,
                  });
                  setMessage(`${s?.name ?? ''} 기록을 저장했습니다.`);
                }}
              />
            </GrowthCard>
          );
        })}

        {isStaff ? (
          <GrowthCard>
            <SectionTitle hint="기록에 있는 것만 엮습니다. 없는 일은 짓지 않습니다.">
              보호자 공개용 활동 이야기
            </SectionTitle>
            <PrimaryButton
              label="기록에서 초안 만들기"
              tone="quiet"
              onPress={() => setStory(buildActivityStory(activity, participants))}
            />
            <Field label="이야기" value={story} onChangeText={setStory} multiline />
            <View style={styles.row}>
              <PrimaryButton
                label="저장"
                tone="quiet"
                onPress={async () => {
                  await updateActivity(activity.id, { story });
                  setMessage('이야기를 저장했습니다.');
                }}
              />
              <PrimaryButton
                label="복사"
                tone="quiet"
                onPress={async () => {
                  await Clipboard.setStringAsync(story);
                  setMessage('복사했습니다.');
                }}
              />
            </View>
            <PrimaryButton
              label={activity.shared_with_guardians ? '보호자 공개 끄기' : '보호자에게 공개하기'}
              onPress={async () => {
                await updateActivity(activity.id, {
                  story,
                  shared_with_guardians: !activity.shared_with_guardians,
                });
                await load();
              }}
            />
            {story ? <MarkdownPreview text={story} /> : null}
          </GrowthCard>
        ) : activity.shared_with_guardians && activity.story ? (
          <GrowthCard>
            <MarkdownPreview text={activity.story} />
          </GrowthCard>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', gap: Spacing.two },
});
