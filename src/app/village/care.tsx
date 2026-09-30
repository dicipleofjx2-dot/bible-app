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
import { useCellRoom } from '@/hooks/use-cell-room';
import { getMyVisitRequests, requestVisit, type VisitRequest } from '@/db/cell';
import {
  CARE_KINDS,
  createCareNote,
  getCareNotes,
  getCellMembers,
  setCareDone,
  type CareNote,
} from '@/db/village';

/**
 * 돌봄실 — 목자·교역자만 들어온다.
 *
 * 심방 **신청**은 0065 의 cell_visit_requests 가 그대로 맡는다(주보의 목양
 * 화면이 같은 표를 읽는다). 여기서 새로 담는 것은 「누구에게 연락했고 무엇이
 * 필요한가」다.
 *
 * 대상은 교적(members)에서 고른다. 앱을 안 쓰는 성도도 돌봄의 대상이라, 계정이
 * 아니라 교인 기록으로 가리켜야 빠지는 사람이 없다.
 */
export default function CareRoomScreen() {
  const { room, loading } = useCellRoom();
  const cellId = room?.cell?.id ?? null;
  const allowed = Boolean(room?.isLeader || room?.canSeeAll);

  const [notes, setNotes] = useState<CareNote[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [busy, setBusy] = useState(false);

  // 돌봄 기록
  const [kind, setKind] = useState<CareNote['kind']>('call');
  const [about, setAbout] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [followUp, setFollowUp] = useState('');

  // 심방 신청
  const [askVisit, setAskVisit] = useState(false);
  const [reason, setReason] = useState('');
  const [when, setWhen] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'soon' | 'urgent'>('normal');

  const load = useCallback(async () => {
    if (!cellId || !allowed) return;
    const [n, m, v] = await Promise.all([
      getCareNotes(cellId).catch(() => [] as CareNote[]),
      getCellMembers(cellId).catch(() => []),
      getMyVisitRequests(cellId).catch(() => [] as VisitRequest[]),
    ]);
    setNotes(n);
    setMembers(m);
    setVisits(v);
  }, [cellId, allowed]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!cellId || !room || busy || !body.trim()) return;
    setBusy(true);
    const { error } = await createCareNote({
      cellId,
      authorId: room.userId,
      kind,
      body: body.trim(),
      aboutMemberId: about,
      followUpOn: followUp.trim() || null,
    });
    setBusy(false);
    if (!error) {
      setBody('');
      setFollowUp('');
      setAbout(null);
      await load();
    }
  }

  async function sendVisit() {
    if (!cellId || !room?.churchId || busy || !reason.trim()) return;
    setBusy(true);
    const { error } = await requestVisit({
      churchId: room.churchId,
      cellId,
      requesterId: room.userId,
      reason: reason.trim(),
      preferredWhen: when.trim(),
      urgency,
    });
    setBusy(false);
    if (!error) {
      setReason('');
      setWhen('');
      setAskVisit(false);
      await load();
    }
  }

  const memberName = (id: string | null, fallback: string | null) =>
    (id ? members.find((m) => m.id === id)?.name : null) ?? fallback ?? '이름 없이';

  const open = notes.filter((n) => !n.done);
  const closed = notes.filter((n) => n.done);

  return (
    <RoomScreen title="돌봄실" emoji="🤲" subtitle={room?.cell?.name ?? ''}>
      {loading ? (
        <Empty text="불러오는 중입니다…" />
      ) : !allowed ? (
        <Card>
          <ThemedText style={styles.big}>목자와 교역자의 자리입니다</ThemedText>
          <ThemedText themeColor="textSecondary">
            돌봄 기록에는 성도의 사정이 담깁니다. 그래서 맡은 분에게만 열립니다.
          </ThemedText>
        </Card>
      ) : (
        <>
          {/* ── 새 기록 ───────────────────────────────────────── */}
          <Card>
            <ThemedText type="smallBold" themeColor="textSecondary">
              돌봄 남기기
            </ThemedText>
            <ChipRow
              options={CARE_KINDS.map((k) => ({ value: k.kind, label: k.label }))}
              value={kind}
              onChange={setKind}
            />
            <ThemedText type="smallBold" themeColor="textSecondary">
              누구를
            </ThemedText>
            <ChipRow
              options={members.map((m) => ({ value: m.id, label: m.name }))}
              value={about}
              onChange={setAbout}
            />
            <Field label="내용" value={body} onChangeText={setBody} multiline placeholder="어떤 이야기를 나눴는지" />
            <Field
              label="다시 챙길 날 (YYYY-MM-DD)"
              value={followUp}
              onChangeText={setFollowUp}
              placeholder="비워 두어도 됩니다"
            />
            <Btn label={busy ? '남기는 중…' : '기록 남기기'} onPress={save} disabled={busy} />
          </Card>

          {/* ── 심방 신청 ─────────────────────────────────────── */}
          <SectionTitle hint="담임목사·교역자에게 전해집니다">심방 청하기</SectionTitle>
          {askVisit ? (
            <Card>
              <Field label="사유" value={reason} onChangeText={setReason} multiline />
              <Field label="언제쯤이 좋은지" value={when} onChangeText={setWhen} placeholder="주중 저녁 · 이번 주 토요일" />
              <ChipRow
                options={[
                  { value: 'normal', label: '보통' },
                  { value: 'soon', label: '이른 시일' },
                  { value: 'urgent', label: '급함' },
                ]}
                value={urgency}
                onChange={setUrgency}
              />
              <Btn label={busy ? '보내는 중…' : '심방 신청 보내기'} onPress={sendVisit} disabled={busy} />
              <Btn label="취소" tone="ghost" onPress={() => setAskVisit(false)} />
            </Card>
          ) : (
            <Btn label="심방 신청하기" tone="quiet" onPress={() => setAskVisit(true)} />
          )}
          {visits.map((v) => (
            <Card key={v.id}>
              <View style={styles.rowBetween}>
                <ThemedText type="smallBold">{v.reason}</ThemedText>
                <Tag
                  label={
                    v.status === 'open'
                      ? '기다리는 중'
                      : v.status === 'scheduled'
                        ? '날짜 잡힘'
                        : v.status === 'done'
                          ? '다녀감'
                          : '취소'
                  }
                  tone={v.status === 'done' ? 'done' : 'soft'}
                />
              </View>
              {v.handlerNote ? (
                <ThemedText type="small" themeColor="support">
                  {v.handlerNote}
                </ThemedText>
              ) : null}
            </Card>
          ))}

          {/* ── 챙길 일 ───────────────────────────────────────── */}
          <SectionTitle hint={`${open.length}건`}>챙길 일</SectionTitle>
          {open.length === 0 ? (
            <Empty text="지금 챙길 일이 없습니다." />
          ) : (
            open.map((n) => (
              <Card key={n.id}>
                <View style={styles.rowBetween}>
                  <ThemedText style={styles.big}>{memberName(n.aboutMemberId, n.aboutName)}</ThemedText>
                  <Tag label={CARE_KINDS.find((k) => k.kind === n.kind)?.label ?? ''} />
                </View>
                <ThemedText>{n.body}</ThemedText>
                {n.followUpOn ? (
                  <ThemedText themeColor="accent">📅 {formatMeetDay(n.followUpOn)}에 다시</ThemedText>
                ) : null}
                <Btn
                  label="마쳤어요"
                  small
                  tone="quiet"
                  onPress={async () => {
                    await setCareDone(n.id, true);
                    await load();
                  }}
                />
              </Card>
            ))
          )}

          {closed.length > 0 ? (
            <>
              <SectionTitle hint={`${closed.length}건`}>지난 돌봄</SectionTitle>
              {closed.slice(0, 20).map((n) => (
                <Card key={n.id}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {memberName(n.aboutMemberId, n.aboutName)} ·{' '}
                    {CARE_KINDS.find((k) => k.kind === n.kind)?.label}
                  </ThemedText>
                  <ThemedText type="small">{n.body}</ThemedText>
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
});
