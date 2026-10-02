import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  addRecords,
  deleteRecord,
  listRecords,
  listStudents,
  type GrowthRecordRow,
  type GrowthStudent,
} from '@/db/growth';
import {
  ChipRow,
  Field,
  GrowthCard,
  LevelBadge,
  MultiChipRow,
  PrimaryButton,
  SectionTitle,
} from '@/features/growth/ui';
import { useSchool } from '@/features/growth/useSchool';
import { useTheme } from '@/hooks/use-theme';
import {
  AREAS,
  LEVELS,
  VISIBILITIES,
  areaLabel,
  formatKoreanDate,
  kstToday,
  type GrowthArea,
  type GrowthLevel,
  type RecordVisibility,
} from '@/lib/growth';

/**
 * 기록 작성 — 기획서 §6 「매일 5분 기록」의 2·3번.
 *
 * **여러 명을 먼저 고르고 한 번에 넣는다.** 공통 수업 내용은 스무 명이 같고,
 * 다른 것은 학생별 한 줄뿐이다. 학생마다 화면을 열면 스무 번을 열어야 한다.
 *
 * 공개 범위 기본값은 **교사만**이다(표의 기본값과 같다). 손대지 않으면 보호자
 * 화면에 안 나간다 — 실수로 새는 쪽이 아니라 실수로 안 보이는 쪽으로 기울였다.
 */
export default function GrowthRecordScreen() {
  const theme = useTheme();
  const { loading, userId, schoolId, isStaff } = useSchool();

  const [students, setStudents] = useState<GrowthStudent[]>([]);
  const [todayRows, setTodayRows] = useState<GrowthRecordRow[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [area, setArea] = useState<GrowthArea>('learning');
  const [level, setLevel] = useState<GrowthLevel | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [visibility, setVisibility] = useState<RecordVisibility>('teacher');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const today = kstToday();

  /**
   * 오늘 이 학교에 적힌 것을 다시 읽어 온다.
   *
   * 저장한 뒤 **적은 것이 그 자리에서 보여야 한다.** 예전에는 「N명에게
   * 저장했습니다」 한 줄만 뜨고, 무엇이 저장됐는지 보려면 홈 → 학생 카드 →
   * 학생 상세 → 기록 탭까지 네 걸음을 들어가야 했다. 하루에 스무 번 적는
   * 화면에서 그건 못 쓴다.
   */
  const loadToday = useCallback(
    async (ids: string[]) => {
      if (!ids.length) {
        setTodayRows([]);
        return;
      }
      try {
        setTodayRows(await listRecords(ids, today, today));
      } catch (e) {
        setMessage(e instanceof Error ? e.message : '오늘 기록을 불러오지 못했어요.');
      }
    },
    [today],
  );

  useEffect(() => {
    if (!schoolId) return;
    listStudents(schoolId)
      .then((rows) => {
        setStudents(rows);
        loadToday(rows.map((r) => r.id));
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : '학생을 불러오지 못했어요.'));
  }, [schoolId, loadToday]);

  async function save() {
    if (!userId || !schoolId || !picked.length) return;
    setBusy(true);
    try {
      const n = await addRecords(
        schoolId,
        picked,
        today,
        { area, level, subject: subject.trim(), body: body.trim(), visibility, next_action: nextAction.trim() },
        userId,
      );
      // 고른 학생은 지우되 **내용은 남긴다** — 같은 수업을 반을 갈라 적는 일이
      // 흔해서, 지워 버리면 같은 문장을 두 번 타자 치게 된다.
      setPicked([]);
      setMessage(`${n}명에게 저장했습니다.`);
      await loadToday(students.map((s) => s.id));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function drop(id: string) {
    try {
      await deleteRecord(id);
      // 화면에서 먼저 뺀다. 지운 것이 남아 있으면 두 번 누르게 된다.
      setTodayRows((prev) => prev.filter((r) => r.id !== id));
      setMessage('기록을 지웠습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '지우지 못했어요.');
      await loadToday(students.map((s) => s.id));
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
        <ThemedText style={Type.body}>교사만 기록할 수 있습니다.</ThemedText>
      </ThemedView>
    );
  }

  const areaHint = AREAS.find((a) => a.id === area)?.hint ?? '';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
          {formatKoreanDate(today)} 기록
        </ThemedText>

        <GrowthCard>
          <MultiChipRow
            label="학생"
            options={students.map((s) => ({ id: s.id, label: s.name }))}
            values={picked}
            onToggle={(id) =>
              setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
            }
            onAll={() => setPicked((prev) => (prev.length === students.length ? [] : students.map((s) => s.id)))}
          />
        </GrowthCard>

        <GrowthCard>
          <ChipRow
            label="영역"
            options={AREAS.map((a) => ({ id: a.id, label: `${a.emoji} ${a.label}` }))}
            value={area}
            onChange={(v) => v && setArea(v)}
          />
          <ThemedText themeColor="textSecondary" style={Type.caption}>
            {areaHint}
          </ThemedText>

          <ChipRow
            label="관찰 (누르면 해제됩니다)"
            options={LEVELS.map((l) => ({ id: l.id, label: l.label }))}
            value={level}
            onChange={setLevel}
            allowNull
          />

          {area === 'learning' ? (
            <Field label="과목" value={subject} onChangeText={setSubject} placeholder="국어 · 수학 · 성경" />
          ) : null}

          <Field
            label="관찰한 내용"
            value={body}
            onChangeText={setBody}
            placeholder="본 대로 적습니다. 성격을 단정하는 말은 피합니다."
            multiline
          />

          <Field
            label="다음 지도 행동"
            value={nextAction}
            onChangeText={setNextAction}
            placeholder="다음에 무엇을 해 볼지 (비워도 됩니다)"
            hint="여기 적은 문장이 월간 보고서의 「다음 달 지도 방향」으로 이어집니다."
          />

          <ChipRow
            label="공개 범위"
            options={VISIBILITIES.map((v) => ({ id: v.id, label: v.label }))}
            value={visibility}
            onChange={(v) => v && setVisibility(v)}
          />
          <ThemedText themeColor="textSecondary" style={Type.caption}>
            {VISIBILITIES.find((v) => v.id === visibility)?.hint}
          </ThemedText>
        </GrowthCard>

        <PrimaryButton
          label={picked.length ? `${picked.length}명에게 저장` : '학생을 고르세요'}
          onPress={save}
          disabled={busy || !picked.length || (!body.trim() && !level)}
        />

        {message ? (
          <ThemedText themeColor="accent" style={Type.itemTitle}>
            {message}
          </ThemedText>
        ) : null}

        {/*
          오늘 적은 것을 그 자리에서 보여 준다.

          저장이 됐는지 확인하러 다른 화면으로 넘어가게 하지 않는다 —
          하루에 스무 번 쓰는 화면이라, 확인 한 번에 네 걸음이 들면 아무도
          확인하지 않고 결국 같은 내용을 두 번 적는다.

          학생 이름을 앞에 세운다. 교사가 기억을 더듬는 단위가 영역이 아니라
          **아이**이기 때문이다(「민준이 거 적었나?」).
        */}
        <SectionTitle hint="잘못 적었으면 지우고 다시 적습니다.">
          오늘 적은 기록 {todayRows.length}건
        </SectionTitle>

        {todayRows.length ? (
          todayRows.map((r) => {
            const who = students.find((s) => s.id === r.student_id)?.name ?? '학생';
            return (
              <GrowthCard key={r.id}>
                <View style={styles.rowHead}>
                  <ThemedText style={Type.itemTitle}>
                    {who} · {areaLabel(r.area)}
                    {r.subject ? ` · ${r.subject}` : ''}
                  </ThemedText>
                  <Pressable
                    onPress={() => drop(r.id)}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                    <ThemedText themeColor="textSecondary" style={Type.caption}>
                      지우기
                    </ThemedText>
                  </Pressable>
                </View>
                <LevelBadge level={r.level} />
                {r.body ? <ThemedText style={Type.body}>{r.body}</ThemedText> : null}
                {r.next_action ? (
                  <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                    다음 지도: {r.next_action}
                  </ThemedText>
                ) : null}
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  {VISIBILITIES.find((v) => v.id === r.visibility)?.label}
                </ThemedText>
              </GrowthCard>
            );
          })
        ) : (
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            오늘은 아직 적은 기록이 없습니다.
          </ThemedText>
        )}

        <View style={styles.footer}>
          <ThemedText themeColor="textSecondary" style={Type.caption}>
            상담·건강처럼 민감한 내용은 학생 화면의 「상담 기록」에 적습니다. 그쪽은 교사만 봅니다.
          </ThemedText>
        </View>
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
  footer: { gap: Spacing.one },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
});
