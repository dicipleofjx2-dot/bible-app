import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
  todayString,
} from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nameOf, useCellRoom } from '@/hooks/use-cell-room';
import { getCellReports, type CellReport } from '@/db/cell';
import {
  createGathering,
  DEFAULT_STEPS,
  getAttendance,
  getGatherings,
  pickCurrentGathering,
  setAttendance,
  updateGathering,
  type Attendance,
  type Gathering,
  type GatheringStep,
} from '@/db/village';

/**
 * 예배당 — 목장모임을 준비하고, 진행하고, 남긴다.
 *
 * 기획서 §2 의 다섯 걸음을 그대로 화면으로 옮겼다:
 *   ① 목자가 모임을 만든다 ② 목장원이 참석을 답한다 ③ 순서를 한 장씩 넘긴다
 *   ④ 끝나고 참석·나눔·다음 돌봄을 적는다 ⑤ 허락한 것만 마을로 보낸다
 *
 * **개인 상담의 원문을 모임 요약에 옮겨 적지 않는다** — 그 자리는 돌봄실이다.
 * 요약 칸 아래 그 말을 적어 두었다. 칸만 두면 반드시 거기 적힌다.
 */

const STEP_KIND_LABEL: Record<GatheringStep['kind'], string> = {
  praise: '찬양',
  word: '말씀',
  question: '나눔 질문',
  prayer: '기도',
  notice: '광고',
};

export default function ChapelScreen() {
  const theme = useTheme();
  const { room, loading } = useCellRoom();
  const cellId = room?.cell?.id ?? null;
  const canLead = Boolean(room?.isLeader || room?.canSeeAll);

  const [list, setList] = useState<Gathering[]>([]);
  const [oldReports, setOldReports] = useState<CellReport[]>([]);
  const [current, setCurrent] = useState<Gathering | null>(null);
  const [attendance, setAtt] = useState<Attendance[]>([]);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'view' | 'new' | 'run' | 'close'>('view');
  const [stepIndex, setStepIndex] = useState(0);

  // 새 모임 입력칸
  const [title, setTitle] = useState('목장 모임');
  const [meetOn, setMeetOn] = useState(todayString());
  const [startTime, setStartTime] = useState('19:30');
  const [placeKind, setPlaceKind] = useState<Gathering['placeKind']>('home');
  const [place, setPlace] = useState('');
  const [scripture, setScripture] = useState('');
  const [material, setMaterial] = useState('');

  // 마무리 입력칸
  const [summary, setSummary] = useState('');
  const [nextCare, setNextCare] = useState('');

  const load = useCallback(async () => {
    if (!cellId) return;
    const [rows, reports] = await Promise.all([
      getGatherings(cellId).catch(() => [] as Gathering[]),
      getCellReports(cellId).catch(() => [] as CellReport[]),
    ]);
    setList(rows);
    setOldReports(reports);
    const cur = pickCurrentGathering(rows, todayString());
    setCurrent(cur);
    setAtt(cur ? await getAttendance(cur.id) : []);
    setSummary(cur?.summary ?? '');
    setNextCare(cur?.nextCare ?? '');
  }, [cellId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!cellId || !room || busy || !title.trim()) return;
    setBusy(true);
    const { error } = await createGathering({
      cellId,
      createdBy: room.userId,
      title: title.trim(),
      meetOn,
      startTime,
      placeKind,
      place,
      scripture,
      materialSource: material,
      steps: DEFAULT_STEPS,
    });
    setBusy(false);
    if (!error) {
      setMode('view');
      setScripture('');
      setMaterial('');
      await load();
    }
  }

  async function start() {
    if (!current) return;
    await updateGathering(current.id, { status: 'running' });
    setStepIndex(0);
    setMode('run');
    await load();
  }

  async function finish() {
    if (!current) return;
    setBusy(true);
    await updateGathering(current.id, {
      status: 'closed',
      summary: summary.trim() || null,
      nextCare: nextCare.trim() || null,
    });
    setBusy(false);
    setMode('view');
    await load();
  }

  async function mark(userId: string, attended: boolean) {
    if (!current) return;
    await setAttendance({ gatheringId: current.id, userId, attended });
    setAtt(await getAttendance(current.id));
  }

  async function myReply(v: 'going' | 'maybe' | 'absent') {
    if (!current || !room) return;
    await setAttendance({ gatheringId: current.id, userId: room.userId, reply: v });
    setAtt(await getAttendance(current.id));
  }

  const mine = attendance.find((a) => a.userId === room?.userId)?.reply ?? null;
  const steps = current?.steps ?? [];

  return (
    <RoomScreen title="예배당" emoji="⛪" subtitle={room?.cell?.name ?? ''}>
      {loading ? (
        <Empty text="불러오는 중입니다…" />
      ) : !cellId ? (
        <Empty text="목장이 정해지면 예배당이 열립니다." />
      ) : mode === 'run' && current ? (
        /* ── 진행 화면 — 순서를 한 장씩 ─────────────────────── */
        <>
          <Card>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {stepIndex + 1} / {steps.length} · {STEP_KIND_LABEL[steps[stepIndex]?.kind ?? 'word']}
            </ThemedText>
            <ThemedText style={styles.runTitle}>{steps[stepIndex]?.title ?? '순서'}</ThemedText>
            {steps[stepIndex]?.body ? (
              <ThemedText style={styles.runBody}>{steps[stepIndex]?.body}</ThemedText>
            ) : null}
            {current.scripture ? (
              <ThemedText themeColor="accent">📖 {current.scripture}</ThemedText>
            ) : null}
          </Card>
          <View style={styles.runNav}>
            <Btn
              label="◀ 이전"
              tone="ghost"
              onPress={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              style={styles.grow}
            />
            {stepIndex < steps.length - 1 ? (
              <Btn label="다음 ▶" onPress={() => setStepIndex((i) => i + 1)} style={styles.grow} />
            ) : (
              <Btn label="마치고 기록하기" onPress={() => setMode('close')} style={styles.grow} />
            )}
          </View>
          <Btn label="진행 화면 닫기" tone="quiet" onPress={() => setMode('view')} />
        </>
      ) : mode === 'close' && current ? (
        /* ── 마무리 기록 ────────────────────────────────────── */
        <>
          <SectionTitle hint="모인 분을 눌러 표시해 주세요">참석 확인</SectionTitle>
          <Card>
            <View style={styles.nameWrap}>
              {[...(room?.names.entries() ?? [])].map(([id, n]) => {
                const on = attendance.find((a) => a.userId === id)?.attended === true;
                return (
                  <Pressable
                    key={id}
                    onPress={() => mark(id, !on)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[
                      styles.namePill,
                      {
                        backgroundColor: on ? theme.backgroundSelected : theme.accentSoft,
                      },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: on ? '#FFFFFF' : theme.accent }}>
                      {on ? '✓ ' : ''}
                      {n}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </Card>
          <Field
            label="주요 나눔"
            value={summary}
            onChangeText={setSummary}
            multiline
            placeholder="오늘 은혜 받은 대목, 함께 나눈 이야기"
            hint="개인 상담이나 사정은 여기 옮겨 적지 마세요. 돌봄실에 따로 담깁니다."
          />
          <Field
            label="다음 돌봄 행동"
            value={nextCare}
            onChangeText={setNextCare}
            multiline
            placeholder="누구에게 무엇을 할지 한 줄로"
          />
          <Btn label={busy ? '저장 중…' : '기록 저장하고 마치기'} onPress={finish} disabled={busy} />
          <Btn label="취소" tone="ghost" onPress={() => setMode('view')} />
        </>
      ) : mode === 'new' ? (
        /* ── 모임 만들기 ────────────────────────────────────── */
        <>
          <SectionTitle hint="순서는 만든 뒤에 고칠 수 있어요">이번 모임 만들기</SectionTitle>
          <Field label="모임 이름" value={title} onChangeText={setTitle} />
          <Field label="날짜 (YYYY-MM-DD)" value={meetOn} onChangeText={setMeetOn} />
          <Field label="시간" value={startTime} onChangeText={setStartTime} placeholder="19:30" />
          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              장소
            </ThemedText>
            <ChipRow
              options={[
                { value: 'home', label: '가정' },
                { value: 'church', label: '교회' },
                { value: 'online', label: '온라인' },
                { value: 'other', label: '그 밖' },
              ]}
              value={placeKind}
              onChange={setPlaceKind}
            />
          </View>
          <Field
            label="장소 자세히"
            value={place}
            onChangeText={setPlace}
            placeholder={placeKind === 'online' ? '모임 주소' : '○○○ 집사님 댁'}
          />
          <Field label="본문" value={scripture} onChangeText={setScripture} placeholder="로마서 3:21~26" />
          <Field
            label="교재 출처"
            value={material}
            onChangeText={setMaterial}
            placeholder="주보 목장교재 · 주일설교"
            hint="설교와 주보 목장교재에서 가져온 자리를 적어 두면 다음에 찾기 쉽습니다."
          />
          <Btn label={busy ? '만드는 중…' : '모임 만들기'} onPress={create} disabled={busy} />
          <Btn label="취소" tone="ghost" onPress={() => setMode('view')} />
        </>
      ) : (
        /* ── 기본 화면 ──────────────────────────────────────── */
        <>
          {current ? (
            <Card>
              <View style={styles.rowBetween}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  이번 모임
                </ThemedText>
                {current.status === 'running' ? (
                  <Tag label="진행 중" tone="done" />
                ) : current.status === 'closed' ? (
                  <Tag label="마침" />
                ) : null}
              </View>
              <ThemedText style={styles.big}>{current.title}</ThemedText>
              <ThemedText themeColor="textSecondary">
                {formatMeetDay(current.meetOn)}
                {current.startTime ? ` ${current.startTime}` : ''}
                {current.place ? ` · ${current.place}` : ''}
              </ThemedText>
              {current.scripture ? (
                <ThemedText themeColor="accent">📖 {current.scripture}</ThemedText>
              ) : null}
              {current.materialSource ? (
                <ThemedText type="small" themeColor="textSecondary">
                  교재 · {current.materialSource}
                </ThemedText>
              ) : null}

              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.gap}>
                나의 참석
              </ThemedText>
              <ChipRow
                options={[
                  { value: 'going', label: '갈게요' },
                  { value: 'maybe', label: '아직 몰라요' },
                  { value: 'absent', label: '못 가요' },
                ]}
                value={mine}
                onChange={myReply}
              />
              <ThemedText type="small" themeColor="textSecondary">
                갈게요 {attendance.filter((a) => a.reply === 'going').length}명 · 아직 몰라요{' '}
                {attendance.filter((a) => a.reply === 'maybe').length}명
              </ThemedText>

              <View style={styles.row}>
                <Btn
                  label="순서 보기"
                  tone="quiet"
                  onPress={() => {
                    setStepIndex(0);
                    setMode('run');
                  }}
                  style={styles.grow}
                />
                {canLead ? (
                  current.status === 'closed' ? (
                    <Btn label="기록 고치기" onPress={() => setMode('close')} style={styles.grow} />
                  ) : (
                    <Btn label="모임 시작하기" onPress={start} style={styles.grow} />
                  )
                ) : null}
              </View>

              {current.summary ? (
                <View style={[styles.note, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    지난 나눔
                  </ThemedText>
                  <ThemedText>{current.summary}</ThemedText>
                </View>
              ) : null}
            </Card>
          ) : (
            <Empty text="아직 잡힌 모임이 없어요." />
          )}

          {canLead ? <Btn label="새 모임 만들기" onPress={() => setMode('new')} /> : null}

          <SectionTitle hint="모인 날 차례">지난 모임</SectionTitle>
          {list.filter((g) => g.id !== current?.id).length === 0 ? (
            <Empty text="지난 모임 기록이 아직 없습니다." />
          ) : (
            list
              .filter((g) => g.id !== current?.id)
              .map((g) => (
                <Card key={g.id}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {formatMeetDay(g.meetOn)}
                  </ThemedText>
                  <ThemedText style={styles.big}>{g.title}</ThemedText>
                  {g.scripture ? (
                    <ThemedText type="small" themeColor="accent">
                      📖 {g.scripture}
                    </ThemedText>
                  ) : null}
                  {g.summary ? <ThemedText>{g.summary}</ThemedText> : null}
                  {g.nextCare && (room?.isLeader || room?.canSeeAll) ? (
                    <ThemedText type="small" themeColor="support">
                      다음 돌봄 · {g.nextCare}
                    </ThemedText>
                  ) : null}
                  <ThemedText type="small" themeColor="textSecondary">
                    세운 이 · {nameOf(room?.names ?? new Map(), g.createdBy)}
                  </ThemedText>
                </Card>
              ))
          )}

          {/*
            옛 목장방(/r2m/cell)에서 올린 모임 보고.

            그 화면은 없앴지만 **표(cell_reports)는 그대로 살아 있다.** 새로 쓰는
            자리는 위의 모임 기록이라 여기서는 읽기만 한다 — 옛 글을 못 보게
            하면 목장이 지나온 자취가 통째로 사라진다.
          */}
          {oldReports.length > 0 ? (
            <>
              <SectionTitle hint="옛 목장방에서 올린 글입니다">지난 목장 보고</SectionTitle>
              {oldReports.map((r) => (
                <Card key={r.id}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {formatMeetDay(r.metOn)}
                    {r.attendance !== null ? ` · ${r.attendance}명` : ''}
                    {r.kind === 'report' ? ' · 모임 보고' : ''}
                  </ThemedText>
                  <ThemedText>{r.body}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {nameOf(room?.names ?? new Map(), r.authorId)}
                  </ThemedText>
                </Card>
              ))}
            </>
          ) : null}
        </>
      )}
    </RoomScreen>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 19, lineHeight: 28, fontWeight: '700' },
  gap: { marginTop: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grow: { flex: 1 },
  field: { gap: Spacing.one },
  runTitle: { fontSize: 28, lineHeight: 38, fontWeight: '700' },
  runBody: { fontSize: 18, lineHeight: 30 },
  runNav: { flexDirection: 'row', gap: Spacing.two },
  nameWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  namePill: { borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: 9, minHeight: 40, justifyContent: 'center' },
  note: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.two, gap: 2 },
});
