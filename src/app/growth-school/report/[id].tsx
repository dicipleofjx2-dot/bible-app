import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  getReport,
  getStudent,
  listActivities,
  listAttendance,
  listGoals,
  listParticipantsForStudents,
  listStudentRecords,
  saveReport,
  sendReport,
  type GrowthReport,
  type GrowthStudent,
} from '@/db/growth';
import { Field, GrowthCard, PrimaryButton, SectionTitle } from '@/features/growth/ui';
import { MarkdownPreview } from '@/features/mission/ui';
import { useSchool } from '@/features/growth/useSchool';
import { useTheme } from '@/hooks/use-theme';
import {
  balanceScores,
  buildMonthlyDraft,
  formatKoreanDate,
  formatKoreanMonth,
  kstMonth,
  monthRange,
  previousMonth,
} from '@/lib/growth';

/**
 * 월간 성장보고서 (기획서 §4.6).
 *
 * **초안은 규칙이 만들고, 문장은 교사가 확정한다**(§2·§8). 「교사의 편지」와
 * 「가정에서 함께할 일」은 초안이 일부러 비워 둔다 — 그 두 자리는 사람이
 * 쓰라고 있는 자리다.
 *
 * 보호자는 **`sent` 로 바뀐 것만** 읽는다(0084 정책). 「보호자에게 보내기」를
 * 누르기 전에는 초안이 밖으로 한 줄도 나가지 않는다.
 */
export default function GrowthReportScreen() {
  const theme = useTheme();
  const { id, period: periodParam } = useLocalSearchParams<{ id: string; period?: string }>();
  const period = periodParam ?? kstMonth();
  const { loading: schoolLoading, userId, isStaff } = useSchool();

  const [student, setStudent] = useState<GrowthStudent | null>(null);
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [body, setBody] = useState('');
  const [letter, setLetter] = useState('');
  const [nextGoals, setNextGoals] = useState('');
  const [home, setHome] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [s, r] = await Promise.all([getStudent(id), getReport(id, period)]);
      setStudent(s);
      setReport(r);
      setBody(r?.body ?? '');
      setLetter(r?.teacher_letter ?? '');
      setNextGoals(r?.next_goals ?? '');
      setHome(r?.home_suggestion ?? '');
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [id, period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /**
   * 초안 만들기.
   *
   * 화면에서 셈하지 않고 `lib/growth.ts` 의 순수 함수에 넘긴다 — 이 리포에는
   * 자동 검사가 없어서, 규칙이 화면 안에 있으면 검사할 길이 없다.
   */
  async function makeDraft() {
    if (!student) return;
    setBusy(true);
    try {
      const { from, to } = monthRange(period);
      const prev = monthRange(previousMonth(period));
      const [records, attendance, activities, participants, goals] = await Promise.all([
        listStudentRecords(student.id, 400),
        listAttendance([student.id], from, to),
        listActivities(student.school_id),
        listParticipantsForStudents([student.id]),
        listGoals(student.id),
      ]);
      const previousBalance = balanceScores(
        records.filter((r) => r.on_date >= prev.from && r.on_date <= prev.to),
      );
      const joinedIds = new Set(participants.map((p) => p.activity_id));
      const draft = buildMonthlyDraft({
        studentName: student.name,
        period,
        records,
        attendance,
        activities: activities.filter((a) => joinedIds.has(a.id)),
        participants,
        goals,
        previousBalance,
      });
      setBody(draft);
      setMessage('초안을 만들었습니다. 문장은 교사가 고쳐 확정합니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '초안을 만들지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * 저장.
   *
   * **상태를 건드리지 않는다.** 예전에는 이 단추가 `status: 'draft'` 를 같이
   * 보냈다 — 이미 보낸 보고서에서 오타 하나를 고치고 저장하면 상태가 초안으로
   * 돌아가고, 정책이 `status = 'sent'` 인 것만 보호자에게 열기 때문에
   * **그 집 화면에서 보고서가 소리 없이 사라졌다.** 교사는 저장한 줄로만 안다.
   * 보내고 안 보내고는 아래 「보호자에게 보내기」 하나로만 정한다.
   */
  async function save() {
    if (!student || !userId) return;
    setBusy(true);
    try {
      await saveReport(
        student.id,
        period,
        { body, teacher_letter: letter, next_goals: nextGoals, home_suggestion: home },
        userId,
      );
      await load();
      setMessage('저장했습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!student || !userId) return;
    setBusy(true);
    try {
      await saveReport(
        student.id,
        period,
        { body, teacher_letter: letter, next_goals: nextGoals, home_suggestion: home },
        userId,
      );
      await sendReport(student.id, period, userId);
      await load();
      setMessage('보호자에게 보냈습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '보내지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

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

  /**
   * 내보낼 한 편의 글. 미리보기와 복사가 **같은 것**을 쓴다 — 둘을 따로 만들면
   * 한쪽만 고치게 되고, 보호자가 받는 글이 미리 본 것과 달라진다.
   */
  const preview = [
    body,
    letter.trim() && `\n## 교사의 편지\n${letter.trim()}`,
    nextGoals.trim() && `\n## 다음 달 지도 방향\n${nextGoals.trim()}`,
    home.trim() && `\n## 가정에서 함께할 일\n${home.trim()}`,
  ]
    .filter(Boolean)
    .join('\n');

  // 보호자·학생 화면. 읽기만 한다.
  if (!isStaff) {
    if (!report || report.status !== 'sent') {
      return (
        <ThemedView style={styles.center}>
          <ThemedText style={Type.body}>아직 보내지 않은 보고서입니다.</ThemedText>
        </ThemedView>
      );
    }
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.list}>
          <ThemedText style={Type.screenTitle}>나의 한 달 성장 이야기</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            {student.name} · {formatKoreanMonth(period)}
          </ThemedText>
          <GrowthCard>
            <MarkdownPreview text={report.body} />
          </GrowthCard>
          {report.teacher_letter ? (
            <GrowthCard>
              <SectionTitle>교사의 편지</SectionTitle>
              <ThemedText style={Type.reading}>{report.teacher_letter}</ThemedText>
            </GrowthCard>
          ) : null}
          {report.next_goals ? (
            <GrowthCard>
              <SectionTitle>다음 달 지도 방향</SectionTitle>
              <ThemedText style={Type.body}>{report.next_goals}</ThemedText>
            </GrowthCard>
          ) : null}
          {report.home_suggestion ? (
            <GrowthCard>
              <SectionTitle>가정에서 함께할 일</SectionTitle>
              <ThemedText style={Type.body}>{report.home_suggestion}</ThemedText>
            </GrowthCard>
          ) : null}
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View>
          <ThemedText style={Type.screenTitle}>{student.name}</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            {formatKoreanMonth(period)} 성장보고서 ·{' '}
            {report?.status === 'sent'
              ? `보호자에게 보냄${report.approved_at ? ` (${formatKoreanDate(report.approved_at.slice(0, 10))})` : ''}`
              : report
                ? '작성 중 — 아직 보호자에게 안 보입니다'
                : '아직 없음'}
          </ThemedText>
        </View>

        <GrowthCard>
          <SectionTitle hint="이 달의 기록만 엮습니다. 없는 일은 짓지 않고, 문장마다 날짜를 답니다.">
            초안
          </SectionTitle>
          <PrimaryButton label="기록에서 초안 만들기" onPress={makeDraft} disabled={busy} />
          <Field label="본문" value={body} onChangeText={setBody} multiline />
        </GrowthCard>

        <GrowthCard>
          <SectionTitle hint="이 두 자리는 자동으로 채우지 않습니다.">교사가 쓰는 자리</SectionTitle>
          <Field
            label="교사의 편지"
            value={letter}
            onChangeText={setLetter}
            multiline
            hint="강점과 격려를 담습니다."
          />
          <Field label="다음 달 지도 방향" value={nextGoals} onChangeText={setNextGoals} multiline />
          <Field
            label="가정에서 함께할 일"
            value={home}
            onChangeText={setHome}
            multiline
            hint="부담 없는 실천 한두 가지."
          />
        </GrowthCard>

        <View style={styles.row}>
          <PrimaryButton label="저장" tone="quiet" onPress={save} disabled={busy} />
          <PrimaryButton
            label="복사"
            tone="quiet"
            onPress={async () => {
              await Clipboard.setStringAsync(preview);
              setMessage('복사했습니다. 한글·워드에 붙여 인쇄하실 수 있습니다.');
            }}
          />
        </View>

        <PrimaryButton
          label={report?.status === 'sent' ? '다시 보내기' : '보호자에게 보내기'}
          onPress={send}
          disabled={busy || !body.trim()}
        />
        <ThemedText themeColor="textSecondary" style={Type.caption}>
          보내기 전에는 보호자 화면에 한 줄도 나가지 않습니다.
        </ThemedText>

        {/*
          미리보기는 **보호자가 보는 그대로** 보여 준다.

          예전에는 본문만 그렸다. 교사가 공들여 쓴 편지와 다음 달 목표, 가정
          실천이 미리보기에 없어서, 제대로 적혔는지 확인하려면 보내 보는 수밖에
          없었다 — 확인하려고 보내는 것은 순서가 거꾸로다.
        */}
        {preview ? (
          <GrowthCard>
            <SectionTitle hint="보호자에게 이대로 보입니다.">미리보기</SectionTitle>
            <MarkdownPreview text={preview} />
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
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
