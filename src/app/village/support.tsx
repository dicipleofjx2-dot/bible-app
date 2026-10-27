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
  normalizeDate,
  RoomScreen,
  SectionTitle,
  Tag,
  todayString,
} from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import {
  addEvangelism,
  claimEvangelism,
  decideEvangelism,
  getEvangelism,
  markEvangelismPaid,
  type Evangelism,
  type EvangelismStatus,
} from '@/db/ranch';
import { addTarget } from '@/db/evangelism';
import { getCellMembers, postVillagePrayer } from '@/db/village';
import { useCellRoom } from '@/hooks/use-cell-room';
import { REWARD, SETTLE } from '@/lib/ranch';

/**
 * 전도와 정착 지원 — 새가족이 목장에 정착하면 목장 활동비로 돌려주는 격려.
 *
 * **포인트와 따로다.** 점수는 방주를 키울 뿐 돈으로 바뀌지 않는다. 여기는 사람의
 * 손을 거친다: 목자가 새가족을 기록 → 앱이 8주 중 6번 출석을 센다 → 목자 신청 →
 * 교회 관리자 승인 → 지급 기록. 앱이 돈을 보내지는 않는다.
 *
 * 지원금은 전도한 분 개인이 아니라 목장의 활동비(새가족 환영·돌봄)로 간다.
 * 사람을 돈으로 보이게 하지 않으려고 화면에는 새가족의 이름과 출석만 있다.
 */

const STATUS_LABEL: Record<EvangelismStatus, string> = {
  watching: '함께하는 중',
  claimed: '승인 대기',
  approved: '승인됨 · 지급 전',
  rejected: '반려',
  paid: '지급 완료',
};

function won(n: number | null): string {
  return `${(n ?? 0).toLocaleString('ko-KR')}원`;
}

export default function SupportScreen() {
  const { room, loading } = useCellRoom();
  const cellId = room?.cell?.id ?? null;
  const canLead = Boolean(room?.isLeader || room?.canSeeAll);

  const [mine, setMine] = useState<Evangelism[] | null | undefined>(undefined);
  const [all, setAll] = useState<Evangelism[] | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [mode, setMode] = useState<'view' | 'new' | 'target'>('view');

  /*
   * 전도대상자 — 아직 교회에 오지 않은 분이다.
   *
   * 새가족과 **다른 자리**다. 새가족은 이미 와서 정착하는 분이라 교적에서 고르지만,
   * 전도대상자는 교적에 없다. 그래서 이름을 손으로 적는다.
   *
   * 이름은 **내 전도 목록에만** 남는다(evangelism_targets, 올린 사람만 본다).
   * 목장에는 「김OO」처럼 가린 이름으로 기도제목만 올라간다 — 아직 교회에 오지
   * 않은 분의 이름이 목장 게시판에 그대로 서면, 그분이 나중에 오셨을 때
   * 「내 이야기가 다 적혀 있었구나」가 된다.
   */
  const [tName, setTName] = useState('');
  const [tRelation, setTRelation] = useState('');
  const [tPrayer, setTPrayer] = useState('');
  const [tShare, setTShare] = useState(true);
  const [newcomer, setNewcomer] = useState<string | null>(null);
  const [referrer, setReferrer] = useState<string | null>(null);
  const [since, setSince] = useState(todayString());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!cellId) return;
    setMine(await getEvangelism(cellId));
    setAll(await getEvangelism(null)); // 교회 관리자만 읽힌다. 아니면 null.
    setMembers(await getCellMembers(cellId));
  }, [cellId]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<{ error: string | null }>, done?: () => void) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    const { error } = await fn();
    setBusy(false);
    if (error) {
      setMessage(error);
      return;
    }
    done?.();
    await load();
  }

  /** 「김민수」→「김OO」. 성만 남긴다 — 전도 화면이 교회 전체 표에서 쓰는 그 규칙이다. */
  function masked(name: string): string {
    const n = name.trim();
    if (n.length <= 1) return n;
    return n[0] + 'O'.repeat(Math.max(1, n.length - 1));
  }

  async function createTarget() {
    if (!tName.trim()) {
      setMessage('이름을 적어 주세요.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await addTarget({
        campaignId: null,
        name: tName,
        relation: tRelation,
        note: tPrayer,
      });
      if (error) {
        setMessage(error);
        return;
      }
      // 목장과 함께 기도하기 — 가린 이름으로 목장 기도제목에 올린다.
      if (tShare && room?.churchId && cellId) {
        await postVillagePrayer({
          churchId: room.churchId,
          villageId: room.village.id,
          cellId,
          authorId: room.userId,
          title: `전도대상자 ${masked(tName)} 님을 위해`,
          body: tPrayer.trim() || '이분이 주님을 만나도록 함께 기도해 주세요.',
        });
      }
      setTName('');
      setTRelation('');
      setTPrayer('');
      setMode('view');
      setMessage(
        tShare ? '기록했어요. 목장 기도제목에도 올렸습니다.' : '기록했어요. 전도 화면에서 걸음을 이어 가세요.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!cellId || !newcomer) {
      setMessage('새가족을 골라 주세요.');
      return;
    }
    const date = normalizeDate(since);
    if (!date) {
      setMessage('등록한 날을 2026-10-20 처럼 적어 주세요.');
      return;
    }
    await run(
      () => addEvangelism({ cellId, newcomerMemberId: newcomer, referrerMemberId: referrer, registeredOn: date }),
      () => {
        setNewcomer(null);
        setReferrer(null);
        setMode('view');
      },
    );
  }

  const recorded = new Set((mine ?? []).map((e) => e.newcomerMemberId));
  const candidates = members.filter((m) => !recorded.has(m.id));
  const pending = (all ?? []).filter((e) => e.status === 'claimed' || e.status === 'approved');

  return (
    <RoomScreen title="전도와 정착 지원" emoji="🌱" subtitle={room?.cell?.name ?? ''}>
      {loading ? (
        <Empty text="불러오는 중입니다…" />
      ) : !cellId ? (
        <Empty text="목장이 정해지면 열립니다." />
      ) : (
        <>
          <Card>
            <ThemedText style={styles.big}>새가족이 정착하면 목장을 격려합니다</ThemedText>
            <ThemedText>
              전도한 새가족이 목장에 뿌리내리면, 새가족을 환영하고 돌보는 목장 활동비를 지원합니다.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              정착 기준 · 등록한 날부터 {SETTLE.weeks}주 안에 주일예배나 목장모임에 {SETTLE.days}번
              출석
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              지원 · 전도 {won(REWARD.evangelism)} + 목장 번성 {won(REWARD.growth)} (목장 활동비)
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              진행 · 목자가 새가족을 기록 → 출석을 앱이 셈 → 목자 신청 → 교회 관리자 승인 → 지급
              기록. 한 분은 한 번만 인정됩니다. 포인트와는 별개이며 포인트로 바꿀 수 없어요.
            </ThemedText>
          </Card>

          {message ? (
            <ThemedText type="small" themeColor="support">
              {message}
            </ThemedText>
          ) : null}

          {/* ── 교회 관리자: 승인 대기 ───────────────────────── */}
          {all !== null && pending.length > 0 ? (
            <>
              <SectionTitle hint="교회 관리자에게만 보입니다">승인·지급 대기</SectionTitle>
              {pending.map((e) => (
                <Card key={e.id}>
                  <View style={styles.rowBetween}>
                    <ThemedText style={styles.name}>
                      {e.cellName} · {e.newcomerName}
                    </ThemedText>
                    <Tag label={STATUS_LABEL[e.status]} tone={e.status === 'approved' ? 'done' : 'warn'} />
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    출석 {e.settledDays}번 · 목장 활동비 {won((e.amountEvangelism ?? 0) + (e.amountGrowth ?? 0))}
                  </ThemedText>
                  {e.status === 'claimed' ? (
                    <View style={styles.row}>
                      <Btn
                        label="승인"
                        style={styles.grow}
                        disabled={busy}
                        onPress={() => run(() => decideEvangelism(e.id, true))}
                      />
                      <Btn
                        label="반려"
                        tone="ghost"
                        style={styles.grow}
                        disabled={busy}
                        onPress={() => run(() => decideEvangelism(e.id, false))}
                      />
                    </View>
                  ) : (
                    <Btn
                      label="지급 완료로 기록"
                      disabled={busy}
                      onPress={() => run(() => markEvangelismPaid(e.id))}
                    />
                  )}
                </Card>
              ))}
            </>
          ) : null}

          {/* ── 전도대상자 ─────────────────────────────────── */}
          {mode === 'target' ? (
            <>
              <SectionTitle hint="아직 교회에 오지 않은 분">전도대상자 적기</SectionTitle>
              <Field label="이름" value={tName} onChangeText={setTName} placeholder="예: 김민수" />
              <Field
                label="나와의 관계"
                value={tRelation}
                onChangeText={setTRelation}
                placeholder="가족 · 친구 · 직장 동료 · 이웃"
              />
              <Field
                label="기도 제목"
                value={tPrayer}
                onChangeText={setTPrayer}
                placeholder="무엇을 위해 기도할까요"
                multiline
                hint="목장과 함께 기도하면 이 글이 목장 기도제목으로 올라갑니다."
              />
              <ChipRow
                options={[
                  { value: 'share', label: '목장과 함께 기도하기' },
                  { value: 'alone', label: '나만 보기' },
                ]}
                value={tShare ? 'share' : 'alone'}
                onChange={(v) => setTShare(v === 'share')}
              />
              <ThemedText type="small" themeColor="textSecondary">
                이름은 내 전도 목록에만 남습니다. 목장에는{' '}
                <ThemedText type="smallBold">{tName.trim() ? masked(tName) : '김OO'}</ThemedText> 처럼 가려서
                올라갑니다.
              </ThemedText>
              <Btn label={busy ? '기록하는 중…' : '기록하기'} onPress={createTarget} disabled={busy} />
              <Btn label="취소" tone="ghost" onPress={() => setMode('view')} />
            </>
          ) : null}

          {/* ── 우리 목장 ──────────────────────────────────── */}
          {mode === 'target' ? null : (
            <SectionTitle hint={canLead ? '목자가 기록합니다' : undefined}>우리 목장의 새가족</SectionTitle>
          )}
          {mode === 'new' ? (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary">
                새가족
              </ThemedText>
              {candidates.length === 0 ? (
                <Empty text="기록할 교인이 없어요. 새가족이 교적에 이 목장으로 등록되어 있어야 합니다." />
              ) : (
                <ChipRow
                  options={candidates.map((m) => ({ value: m.id, label: m.name }))}
                  value={newcomer}
                  onChange={setNewcomer}
                />
              )}
              <ThemedText type="smallBold" themeColor="textSecondary">
                전도한 분 (모르면 비워 두세요)
              </ThemedText>
              <ChipRow
                options={members.filter((m) => m.id !== newcomer).map((m) => ({ value: m.id, label: m.name }))}
                value={referrer}
                onChange={(v) => setReferrer(referrer === v ? null : v)}
              />
              <Field label="목장에 등록한 날" value={since} onChangeText={setSince} />
              <Btn label={busy ? '기록하는 중…' : '새가족 기록하기'} onPress={create} disabled={busy} />
              <Btn label="취소" tone="ghost" onPress={() => setMode('view')} />
            </>
          ) : mode === 'view' ? (
            <>
              {canLead ? <Btn label="새가족 기록하기" onPress={() => setMode('new')} /> : null}
              {/* 전도대상자는 **누구나** 적는다 — 목자만 할 일이 아니다. */}
              <Btn label="전도대상자 기록하기" tone="ghost" onPress={() => setMode('target')} />
              {mine === undefined ? (
                <Empty text="불러오는 중입니다…" />
              ) : mine === null ? (
                <Empty text="아직 준비 중이에요. 곧 열립니다." />
              ) : mine.length === 0 ? (
                <Empty text="기록된 새가족이 아직 없어요." />
              ) : (
                mine.map((e) => {
                  const ready = e.status === 'watching' && e.settledDays >= SETTLE.days;
                  return (
                    <Card key={e.id}>
                      <View style={styles.rowBetween}>
                        <ThemedText style={styles.name}>{e.newcomerName}</ThemedText>
                        <Tag
                          label={ready ? '신청할 수 있어요' : STATUS_LABEL[e.status]}
                          tone={e.status === 'paid' ? 'done' : ready ? 'warn' : 'soft'}
                        />
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatMeetDay(e.registeredOn)} 등록
                        {e.referrerName ? ` · 전도 ${e.referrerName}` : ''}
                      </ThemedText>
                      <ThemedText>
                        출석 {Math.min(e.settledDays, SETTLE.days)} / {SETTLE.days}번
                        <ThemedText type="small" themeColor="textSecondary">
                          {' '}
                          (등록한 날부터 {SETTLE.weeks}주 안)
                        </ThemedText>
                      </ThemedText>
                      {e.status === 'rejected' && e.decisionNote ? (
                        <ThemedText type="small" themeColor="support">
                          반려 사유 · {e.decisionNote}
                        </ThemedText>
                      ) : null}
                      {ready && canLead ? (
                        <Btn
                          label="지원 신청하기"
                          disabled={busy}
                          onPress={() => run(() => claimEvangelism(e.id))}
                        />
                      ) : null}
                    </Card>
                  );
                })
              )}
            </>
          ) : null}
        </>
      )}
    </RoomScreen>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 19, lineHeight: 28, fontWeight: '700' },
  name: { fontSize: 17, lineHeight: 25, fontWeight: '700', flex: 1 },
  row: { flexDirection: 'row', gap: Spacing.two },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  grow: { flex: 1 },
});
