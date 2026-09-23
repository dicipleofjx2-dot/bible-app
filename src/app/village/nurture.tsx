import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  Btn,
  Card,
  ChipRow,
  Empty,
  Field,
  formatMeetDay,
  RoomScreen,
  SectionTitle,
  Tag,
} from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import { nameOf, useCellRoom } from '@/hooks/use-cell-room';
import {
  createNurture,
  getNurtures,
  getNurtureSummary,
  STAGE_LABELS,
  updateNurture,
  type Nurture,
} from '@/db/village';

/**
 * 양육실.
 *
 * 기획서 §2 의 「사람의 상태를 안전하게 공유」를 그대로 지킨다:
 *
 *   · 목장 전체에 보이는 것은 **숫자와 동의한 축하 소식**뿐이다.
 *   · 과정 카드와 메모는 **본인과 맡은 양육자, 교역자**만 본다(정책이 막는다).
 *   · 점수·순위·빨간 경고 배지를 쓰지 않는다. 단계는 이름일 뿐 등급이 아니다.
 *
 * 그래서 이 화면은 위아래로 두 층이다 — 위는 누구나 보는 집계, 아래는 내게
 * 열린 과정. 목원이 열면 아래에 자기 것만 뜬다.
 */
export default function NurtureRoomScreen() {
  const { room, loading } = useCellRoom();
  const cellId = room?.cell?.id ?? null;
  const canLead = Boolean(room?.isLeader || room?.canSeeAll);

  const [rows, setRows] = useState<Nurture[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<'view' | 'new'>('view');
  const [busy, setBusy] = useState(false);

  // 새 과정
  const [course, setCourse] = useState('');
  const [learner, setLearner] = useState<string | null>(null);

  // 고치는 중인 카드
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [nextOn, setNextOn] = useState('');
  const [celebrate, setCelebrate] = useState('');

  const load = useCallback(async () => {
    if (!cellId) return;
    const [list, sum] = await Promise.all([
      getNurtures(cellId).catch(() => [] as Nurture[]),
      getNurtureSummary(cellId),
    ]);
    setRows(list);
    setSummary(sum);
  }, [cellId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!cellId || !room || busy || !course.trim() || !learner) return;
    setBusy(true);
    const { error } = await createNurture({
      cellId,
      learnerId: learner,
      mentorId: room.userId,
      course: course.trim(),
    });
    setBusy(false);
    if (!error) {
      setCourse('');
      setLearner(null);
      setMode('view');
      await load();
    }
  }

  function openEdit(n: Nurture) {
    setEditing(n.id);
    setNote(n.note ?? '');
    setNextOn(n.nextMeetOn ?? '');
    setCelebrate(n.celebrate ?? '');
  }

  async function save(n: Nurture) {
    await updateNurture(n.id, {
      note: note.trim() || null,
      nextMeetOn: nextOn.trim() || null,
      celebrate: celebrate.trim() || null,
    });
    setEditing(null);
    await load();
  }

  async function moveStage(n: Nurture, kind: Nurture['stageKind']) {
    const label = STAGE_LABELS.find((s) => s.kind === kind)?.label ?? n.stageLabel;
    await updateNurture(n.id, { stageKind: kind, stageLabel: label });
    await load();
  }

  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  const celebrations = rows.filter((n) => n.celebrate);

  return (
    <RoomScreen title="양육실" emoji="🌱" subtitle={room?.cell?.name ?? ''}>
      {loading ? (
        <Empty text="불러오는 중입니다…" />
      ) : !cellId ? (
        <Empty text="목장이 정해지면 양육실이 열립니다." />
      ) : (
        <>
          {/* ── 목장 전체가 보는 집계 ─────────────────────────── */}
          <Card>
            <ThemedText type="smallBold" themeColor="textSecondary">
              우리 목장의 양육
            </ThemedText>
            <ThemedText style={styles.big}>{total}개 과정이 자라고 있어요</ThemedText>
            <View style={styles.tagRow}>
              {STAGE_LABELS.map((s) => (
                <Tag
                  key={s.kind}
                  label={`${s.label} ${summary[s.kind] ?? 0}`}
                  tone={s.kind === 'done' ? 'done' : 'soft'}
                />
              ))}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              누가 어느 단계인지는 본인과 맡은 양육자만 봅니다.
            </ThemedText>
          </Card>

          {celebrations.length > 0 ? (
            <Card>
              <ThemedText type="smallBold" themeColor="textSecondary">
                축하할 소식
              </ThemedText>
              {celebrations.map((n) => (
                <ThemedText key={n.id}>🎉 {n.celebrate}</ThemedText>
              ))}
            </Card>
          ) : null}

          {canLead ? (
            mode === 'new' ? (
              <Card>
                <SectionTitle>양육 과정 열기</SectionTitle>
                <Field label="과정 이름" value={course} onChangeText={setCourse} placeholder="새가족반 · 제자훈련" />
                <ThemedText type="smallBold" themeColor="textSecondary">
                  배우는 사람
                </ThemedText>
                <ChipRow
                  options={[...(room?.names.entries() ?? [])].map(([id, n]) => ({ value: id, label: n }))}
                  value={learner}
                  onChange={setLearner}
                />
                <Btn label={busy ? '여는 중…' : '과정 열기'} onPress={create} disabled={busy} />
                <Btn label="취소" tone="ghost" onPress={() => setMode('view')} />
              </Card>
            ) : (
              <Btn label="양육 과정 열기" onPress={() => setMode('new')} />
            )
          ) : null}

          {/* ── 내게 열린 과정 ────────────────────────────────── */}
          <SectionTitle hint="본인과 맡은 양육자에게만 보입니다">과정 카드</SectionTitle>
          {rows.length === 0 ? (
            <Empty text="지금 내게 열린 과정이 없습니다." />
          ) : (
            rows.map((n) => (
              <Card key={n.id}>
                <View style={styles.rowBetween}>
                  <ThemedText style={styles.big}>{n.course}</ThemedText>
                  <Tag label={n.stageLabel} tone={n.stageKind === 'done' ? 'done' : 'soft'} />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  배우는 이 · {nameOf(room?.names ?? new Map(), n.learnerId)} / 맡은 이 ·{' '}
                  {n.mentorId ? nameOf(room?.names ?? new Map(), n.mentorId) : '아직 없음'}
                </ThemedText>
                {n.nextMeetOn ? (
                  <ThemedText themeColor="accent">📅 다음 만남 {formatMeetDay(n.nextMeetOn)}</ThemedText>
                ) : null}
                {n.note ? <ThemedText>{n.note}</ThemedText> : null}

                {editing === n.id ? (
                  <>
                    <Field
                      label="메모"
                      value={note}
                      onChangeText={setNote}
                      multiline
                      hint="본인과 맡은 양육자, 교역자만 봅니다."
                    />
                    <Field
                      label="다음 만남 (YYYY-MM-DD)"
                      value={nextOn}
                      onChangeText={setNextOn}
                      placeholder="2026-10-02"
                    />
                    <Field
                      label="목장에 알릴 축하 소식"
                      value={celebrate}
                      onChangeText={setCelebrate}
                      placeholder="새가족반을 수료했어요"
                      hint="적으면 목장 전체에 보입니다. 비워 두면 아무것도 나가지 않습니다."
                    />
                    <View style={styles.row}>
                      <Btn label="저장" onPress={() => save(n)} style={styles.grow} />
                      <Btn label="취소" tone="ghost" onPress={() => setEditing(null)} style={styles.grow} />
                    </View>
                  </>
                ) : (
                  <>
                    <ChipRow
                      options={STAGE_LABELS.map((s) => ({ value: s.kind, label: s.label }))}
                      value={n.stageKind}
                      onChange={(k) => moveStage(n, k)}
                    />
                    <Btn label="메모·일정 적기" tone="quiet" small onPress={() => openEdit(n)} />
                  </>
                )}
              </Card>
            ))
          )}
        </>
      )}
    </RoomScreen>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 19, lineHeight: 28, fontWeight: '700' },
  row: { flexDirection: 'row', gap: Spacing.two },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  grow: { flex: 1 },
});
