import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  addNotice,
  createInvite,
  createStudent,
  listInvites,
  listMembers,
  listStudents,
  updateStudent,
  type GrowthStudent,
} from '@/db/growth';
import { ChipRow, Field, GrowthCard, PrimaryButton, SectionTitle } from '@/features/growth/ui';
import { useSchool } from '@/features/growth/useSchool';
import { useTheme } from '@/hooks/use-theme';
import { ROLE_LABELS, type MemberRole } from '@/lib/growth';

/**
 * 학교 설정 — 학생 등록, 초대 코드, 공지.
 *
 * **초대 코드로만 들어온다.** 목록에서 학교를 고르게 두면 남의 학교 아이들
 * 기록으로 걸어 들어갈 수 있다 — 이 앱이 교회 선택을 없애고 초대 코드로 바꾼
 * 것과 같은 판단이다(2026-08-19 세션).
 *
 * 보호자 코드는 **어느 아이에게 붙는지까지 정해서** 낸다. 그래야 그 보호자가
 * 자기 자녀만 보게 된다. 보호자가 둘이면 코드를 둘 낸다(한 코드는 한 사람).
 */
export default function GrowthSetupScreen() {
  const theme = useTheme();
  const { loading, userId, schoolId, school, isStaff, isOwner } = useSchool();

  const [students, setStudents] = useState<GrowthStudent[]>([]);
  const [members, setMembers] = useState<{ id: string; role: MemberRole; display_name: string }[]>([]);
  const [invites, setInvites] = useState<
    { code: string; role: MemberRole; student_id: string | null; used_at: string | null }[]
  >([]);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('teacher');
  const [inviteStudent, setInviteStudent] = useState<string | null>(null);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!schoolId) return;
    try {
      const [s, m, i] = await Promise.all([listStudents(schoolId), listMembers(schoolId), listInvites(schoolId)]);
      setStudents(s);
      setMembers(m);
      setInvites(i);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    }
  }, [schoolId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function addStudent() {
    if (!schoolId || !name.trim()) return;
    setBusy(true);
    try {
      await createStudent(schoolId, name.trim(), grade.trim());
      setName('');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '등록하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function makeInvite() {
    if (!schoolId || !userId) return;
    if ((inviteRole === 'guardian' || inviteRole === 'student') && !inviteStudent) {
      setMessage('보호자·학생 코드는 어느 학생의 것인지 골라 주세요.');
      return;
    }
    setBusy(true);
    try {
      const code = await createInvite(schoolId, inviteRole, userId, inviteStudent ?? undefined);
      setMessage(`코드 ${code} — 한 사람만 쓸 수 있습니다.`);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '코드를 만들지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function postNotice() {
    if (!schoolId || !userId || !noticeTitle.trim()) return;
    setBusy(true);
    try {
      await addNotice(schoolId, noticeTitle.trim(), noticeBody.trim(), userId);
      setNoticeTitle('');
      setNoticeBody('');
      setMessage('공지를 올렸습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '공지를 올리지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleConsent(student: GrowthStudent, key: keyof GrowthStudent) {
    try {
      await updateStudent(student.id, { [key]: !student[key] } as Partial<GrowthStudent>);
      await load();
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

  if (!isStaff) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={Type.body}>교사만 볼 수 있는 화면입니다.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <ThemedText style={Type.screenTitle}>{school?.name ?? '학교'} 설정</ThemedText>

        <GrowthCard>
          <SectionTitle hint="이름만 있으면 등록됩니다. 나머지는 학생 화면에서 채웁니다.">학생 등록</SectionTitle>
          <Field label="이름" value={name} onChangeText={setName} placeholder="학생 이름" />
          <Field label="학년·반 (선택)" value={grade} onChangeText={setGrade} placeholder="초등 4학년" />
          <PrimaryButton label="등록" onPress={addStudent} disabled={busy || !name.trim()} />
        </GrowthCard>

        <GrowthCard>
          <SectionTitle hint="동의를 받은 항목만 켭니다. 켜지 않으면 사진은 어디에도 나가지 않습니다.">
            학생 {students.length}명 · 동의 범위
          </SectionTitle>
          {students.map((s) => (
            <View key={s.id} style={styles.studentRow}>
              <ThemedText style={Type.itemTitle}>
                {s.name}
                {s.grade ? ` · ${s.grade}` : ''}
              </ThemedText>
              <View style={styles.consentRow}>
                <ConsentChip
                  label="내부 사진"
                  on={s.consent_photo_internal}
                  onPress={() => toggleConsent(s, 'consent_photo_internal')}
                />
                <ConsentChip
                  label="홍보 사진"
                  on={s.consent_photo_public}
                  onPress={() => toggleConsent(s, 'consent_photo_public')}
                />
                <ConsentChip
                  label="보고서 발송"
                  on={s.consent_report_guardian}
                  onPress={() => toggleConsent(s, 'consent_report_guardian')}
                />
              </View>
            </View>
          ))}
          {!students.length ? (
            <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
              아직 등록된 학생이 없습니다.
            </ThemedText>
          ) : null}
        </GrowthCard>

        <GrowthCard>
          <SectionTitle hint="코드 하나는 한 사람만 씁니다. 보호자가 둘이면 둘 만듭니다.">초대 코드</SectionTitle>
          <ChipRow
            label="역할"
            options={(['teacher', 'activity', 'guardian', 'student', 'owner'] as MemberRole[]).map((r) => ({
              id: r,
              label: ROLE_LABELS[r],
            }))}
            value={inviteRole}
            onChange={(v) => v && setInviteRole(v)}
          />
          {inviteRole === 'guardian' || inviteRole === 'student' ? (
            <ChipRow
              label="어느 학생의 코드인가"
              options={students.map((s) => ({ id: s.id, label: s.name }))}
              value={inviteStudent}
              onChange={setInviteStudent}
              allowNull
            />
          ) : null}
          <PrimaryButton label="코드 만들기" onPress={makeInvite} disabled={busy || !isOwner} />
          {!isOwner ? (
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              코드 발급은 최고관리자만 합니다.
            </ThemedText>
          ) : null}
          {invites.slice(0, 8).map((i) => (
            <ThemedText key={i.code} themeColor="textSecondary" style={Type.itemDescription}>
              {i.code} · {ROLE_LABELS[i.role]}
              {i.student_id ? ` · ${students.find((s) => s.id === i.student_id)?.name ?? ''}` : ''}
              {i.used_at ? ' · 사용됨' : ' · 대기'}
            </ThemedText>
          ))}
        </GrowthCard>

        <GrowthCard>
          <SectionTitle>구성원 {members.length}명</SectionTitle>
          {members.map((m) => (
            <ThemedText key={m.id} themeColor="textSecondary" style={Type.itemDescription}>
              {m.display_name || '(이름 없음)'} · {ROLE_LABELS[m.role]}
            </ThemedText>
          ))}
        </GrowthCard>

        <GrowthCard>
          <SectionTitle hint="학교 구성원 모두가 봅니다.">공지 올리기</SectionTitle>
          <Field label="제목" value={noticeTitle} onChangeText={setNoticeTitle} placeholder="내일 준비물" />
          <Field label="내용" value={noticeBody} onChangeText={setNoticeBody} multiline />
          <PrimaryButton label="올리기" tone="quiet" onPress={postNotice} disabled={busy || !noticeTitle.trim()} />
        </GrowthCard>

        {message ? (
          <ThemedText themeColor="textSecondary" style={Type.caption}>
            {message}
          </ThemedText>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function ConsentChip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.consentChip,
        {
          borderColor: on ? theme.accent : theme.border,
          backgroundColor: on ? theme.accentSoft : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <ThemedText style={[Type.caption, { color: on ? theme.accent : theme.textSecondary }]}>
        {on ? '동의 ' : '미동의 '}
        {label}
      </ThemedText>
    </Pressable>
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
  studentRow: { gap: 6, paddingVertical: Spacing.one },
  consentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  consentChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
