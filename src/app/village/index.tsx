import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RanchFrame } from '@/components/RanchFrame';
import { ThemedText } from '@/components/themed-text';
import {
  Btn,
  Card,
  ChipRow,
  Empty,
  formatMeetDay,
  RoomScreen,
  SectionTitle,
  Tag,
  todayString,
} from '@/components/village/kit';
import { RanchGuide } from '@/components/village/RanchGuide';
import { getRanchCounts, getRanchPoints } from '@/db/ranch';
import { computeRanch, STAGE_LABEL, type RanchCounts, type RanchPoints } from '@/lib/ranch';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nameOf, pickCell, useCellRoom } from '@/hooks/use-cell-room';
import {
  getCellMeeting,
  type CellMeeting,
} from '@/db/cell';
import {
  getAttendance,
  getGatherings,
  pickCurrentGathering,
  setAttendance,
  type Attendance,
  type Gathering,
} from '@/db/village';

/**
 * 목장 현관 — 「작은 교회」의 입구.
 *
 * 기획서 §2: "건물은 한 화면의 아름다운 입구다. 방을 누르면 읽기 쉬운 일반
 * 화면으로 전환한다." 그래서 이 화면은 그림과 여섯 칸까지만 맡는다. 실제 일은
 * 방 안에서 한다 — 작은 글씨가 박힌 그림 위에서 모든 걸 하게 만들지 않는다.
 *
 * 그림은 SVG 한 장이고 **방 단추는 그 위에 얹은 진짜 View** 다(0076 중보기도
 * 나무와 같은 방식). SVG 안에 넣으면 누르는 자리가 기기마다 어긋난다.
 *
 * 목장 공지와 정기 모임 시간도 여기 있다. 옛 목장방(/r2m/cell)이 사라지면서
 * 옮겨 왔고 **표는 그대로**라 그때 올린 공지가 그대로 이어진다. 정기 모임은
 * 주보의 gather_recurrences 를 읽기만 한다 — 0065 가 정한 대로 여기에 또 적지
 * 않는다. 두 군데에 적히면 반드시 어긋난다.
 */

type Room = {
  key: string;
  emoji: string;
  name: string;
  desc: string;
  href: string;
  /** 목자·교역자에게만 보이는 방 */
  leaderOnly?: boolean;
};

const ROOMS: Room[] = [
  { key: 'support', emoji: '🌱', name: '전도와 정착 지원', desc: '새가족 · 목장 격려', href: '/village/support' },
  { key: 'ranch', emoji: '🐑', name: '방주 목장', desc: '활동으로 동물이 자라요', href: '/village/ranch' },
  { key: 'chapel', emoji: '⛪', name: '목장모임 및 목장보고', desc: '이번 모임 · 순서 · 보고 올리기', href: '/village/chapel' },
  { key: 'share', emoji: '💬', name: '나눔과 소통방', desc: '나눔 글 · 소통창', href: '/village/share' },
  { key: 'nurture', emoji: '🌱', name: '양육실', desc: '과정 · 다음 만남', href: '/village/nurture' },
  { key: 'care', emoji: '🤲', name: '돌봄실', desc: '안부 · 연락 · 심방', href: '/village/care', leaderOnly: true },
  { key: 'ministry', emoji: '🛠️', name: '사역실', desc: '섬김 일정과 역할', href: '/village/ministry' },
  { key: 'mission', emoji: '🌏', name: '선교실', desc: '선교지 소식과 중보', href: '/village/mission' },
];

export default function CellHomeScreen() {
  const theme = useTheme();
  const { room, loading, error, reload } = useCellRoom();

  const [gathering, setGathering] = useState<Gathering | null>(null);
  const [attendance, setAtt] = useState<Attendance[]>([]);
  const [busy, setBusy] = useState(false);
  const [regular, setRegular] = useState<CellMeeting | null>(null);

  const cellId = room?.cell?.id ?? null;

  const [ranchCounts, setRanchCounts] = useState<RanchCounts | null>(null);
  const [ranchPoints, setRanchPoints] = useState<RanchPoints | null>(null);
  const [myPoints, setMyPoints] = useState<RanchPoints | null>(null);
  useEffect(() => {
    if (!cellId) return;
    let alive = true;
    getRanchCounts(cellId)
      .then((c) => alive && setRanchCounts(c))
      .catch(() => {});
    getRanchPoints(cellId).then((p) => alive && setRanchPoints(p));
    getRanchPoints(cellId, true).then((p) => alive && setMyPoints(p));
    return () => {
      alive = false;
    };
  }, [cellId]);
  const ranch = useMemo(() => (ranchCounts ? computeRanch(ranchCounts, ranchPoints) : null), [ranchCounts, ranchPoints]);
  const ranchItems = useMemo<[string, string, string][]>(
    () => (ranch?.animals ?? []).map((a) => [a.key, a.stage, `${a.label} · ${STAGE_LABEL[a.stage]}`]),
    [ranch],
  );

  const loadMeeting = useCallback(async () => {
    if (!cellId) {
      setGathering(null);
      return;
    }
    const [list, reg] = await Promise.all([
      getGatherings(cellId, 10).catch(() => [] as Gathering[]),
      getCellMeeting(cellId).catch(() => null),
    ]);
    const current = pickCurrentGathering(list, todayString());
    setGathering(current);
    setRegular(reg);
    setAtt(current ? await getAttendance(current.id) : []);
  }, [cellId]);

  useEffect(() => {
    loadMeeting();
  }, [loadMeeting]);

  const myReply = attendance.find((a) => a.userId === room?.userId)?.reply ?? null;

  async function reply(v: 'going' | 'maybe' | 'absent') {
    if (!gathering || !room || busy) return;
    setBusy(true);
    await setAttendance({ gatheringId: gathering.id, userId: room.userId, reply: v });
    setAtt(await getAttendance(gathering.id));
    setBusy(false);
  }

  /**
   * 내 목장으로 돌아가기.
   *
   * 목장을 **고르는** 자리는 여기가 아니라 마을의 목장 거리다. 이 문은 늘
   * 「내 목장」으로 들어가는 문이어야 한다 — 현관에 열한 목장이 늘어서 있으면
   * 목원에게는 쓸 일 없는 줄이고, 목자에게도 자기 목장이 아닌 곳이 먼저 눈에 든다.
   */
  async function backToMyCell(id: string) {
    await pickCell(id);
    await reload();
  }

  const cellName = room?.cell?.name ?? '신바람목장';
  const going = attendance.filter((a) => a.reply === 'going').length;
  const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <RoomScreen
      title={cellName}
      subtitle={`${room?.village.name ?? '우리 마을'} · 작은 교회`}
      emoji="🏡"
      onBack={() => router.replace('/')}>
      {loading ? (
        <Empty text="목장을 여는 중입니다…" />
      ) : error ? (
        <Empty text={error} />
      ) : !room?.cell ? (
        /*
          여기서 **첫 번째 목장을 말없이 집지 않는다.** 관리자·교역자에게는 모든
          목장이 목록에 오므로, 그렇게 하면 남의 목장이 「우리 목장」인 척 뜬다.
          고를 수 있으면 묻고, 고를 것이 없으면 왜 없는지 알린다.
        */
        <Card>
          {(room?.allCells.length ?? 0) > 0 ? (
            <>
              <ThemedText style={styles.big}>교적에 내 목장이 없어요</ThemedText>
              <ThemedText themeColor="textSecondary">
                이 문은 「내 목장」으로 들어가는 문이라, 걸린 목장이 없으면 열 것이 없습니다.
                다른 목장을 보시려면 마을로 나가 목장 거리에서 고르세요.
              </ThemedText>
              <Btn label="🌾 마을로 나가기" onPress={() => router.push('/village/square' as Href)} />
              <ThemedText type="small" themeColor="textSecondary">
                내 목장이 여기 서려면 교적(스마트주보)에서 내 이름에 목장을 걸어 주세요.
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText style={styles.big}>아직 목장이 정해지지 않았어요</ThemedText>
              <ThemedText themeColor="textSecondary">
                교적에 목장이 등록되면 이 자리에 우리 목장이 열립니다. 교회 사무실이나 목자님께
                말씀해 주세요.
              </ThemedText>
            </>
          )}
        </Card>
      ) : (
        <>
          {/* ── 지금 보는 목장 ────────────────────────────────── */}
          {room.viewingOther ? (
            <Card>
              <ThemedText type="smallBold" themeColor="support">
                {room.myCell
                  ? `내 목장은 ${room.myCell.name}입니다. 지금은 ${room.cell.name}을 열어 보는 중이에요.`
                  : `교적에 내 목장이 없어, 고르신 ${room.cell.name}을 열어 보는 중이에요.`}
              </ThemedText>
              {room.myCell ? (
                <Btn label={`${room.myCell.name}으로 돌아가기`} small tone="quiet" onPress={() => backToMyCell(room.myCell!.id)} />
              ) : null}
            </Card>
          ) : null}
          {/* ── 방주 목장: 우리 목장의 3D 모습이 이 화면의 중심이다 ─── */}
          <View style={styles.ranchHero}>
            <RanchFrame items={ranchItems} embed />
          </View>
          <Pressable
            onPress={() => router.push('/village/ranch' as Href)}
            accessibilityRole="button"
            accessibilityLabel="방주 도감 열기">
            <ThemedText type="smallBold" themeColor="accent" style={styles.ranchLink}>
              방주 도감 보기 ›
            </ThemedText>
          </Pressable>
          <RanchGuide ranch={ranch} points={ranchPoints} mine={myPoints} />
          {/* ── 이번 모임 ─────────────────────────────────────── */}
          <Card>
            <View style={styles.rowBetween}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                이번 모임
              </ThemedText>
              {gathering?.status === 'running' ? <Tag label="지금 모이는 중" tone="done" /> : null}
            </View>
            {gathering ? (
              <>
                <ThemedText style={styles.big}>{gathering.title}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {formatMeetDay(gathering.meetOn)}
                  {gathering.startTime ? ` ${gathering.startTime}` : ''}
                  {gathering.place ? ` · ${gathering.place}` : ''}
                </ThemedText>
                {gathering.scripture ? (
                  <ThemedText themeColor="accent">📖 {gathering.scripture}</ThemedText>
                ) : null}
                <ThemedText type="small" themeColor="textSecondary">
                  간다고 답한 분 {going}명
                </ThemedText>
                <ChipRow
                  options={[
                    { value: 'going', label: '갈게요' },
                    { value: 'maybe', label: '아직 몰라요' },
                    { value: 'absent', label: '못 가요' },
                  ]}
                  value={myReply}
                  onChange={reply}
                />
                <Btn label="목장모임으로 들어가기" onPress={() => router.push('/village/chapel' as Href)} />
              </>
            ) : (
              <>
                <ThemedText themeColor="textSecondary">아직 잡힌 모임이 없어요.</ThemedText>
                {room.isLeader ? (
                  <Btn label="이번 모임 만들기" onPress={() => router.push('/village/chapel' as Href)} />
                ) : null}
              </>
            )}
          </Card>

          {/* ── 정기 모임 ─────────────────────────────────────── */}
          {regular ? (
            <Card>
              <ThemedText type="smallBold" themeColor="textSecondary">
                정기 모임
              </ThemedText>
              <ThemedText>
                {regular.title} · 매주{' '}
                {regular.weekdays.length > 0
                  ? regular.weekdays.map((d) => WEEKDAY[d] ?? '').join('·') + '요일'
                  : ''}{' '}
                {regular.startTime}
                {regular.location ? ` · ${regular.location}` : ''}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                시간과 장소는 주보의 정기모임에서 옵니다. 바꾸려면 주보에서 고쳐 주세요.
              </ThemedText>
            </Card>
          ) : null}

          {/* ── 방 ────────────────────────────────────────────── */}
          <SectionTitle hint="방을 누르면 읽기 편한 화면으로 들어갑니다">방 둘러보기</SectionTitle>
          <View style={styles.grid}>
            {ROOMS.filter((r) => !r.leaderOnly || room.isLeader || room.canSeeAll).map((r) => (
              <Pressable
                key={r.key}
                onPress={() => router.push(r.href as Href)}
                accessibilityRole="button"
                accessibilityLabel={`${r.name} ${r.desc}`}
                style={[
                  styles.roomCard,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}>
                <ThemedText style={styles.roomEmoji}>{r.emoji}</ThemedText>
                <ThemedText style={styles.roomName}>{r.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {r.desc}
                </ThemedText>
                {r.leaderOnly ? <Tag label="목자 전용" /> : null}
              </Pressable>
            ))}
          </View>

          {/* ── 목장원 ────────────────────────────────────────── */}
          <SectionTitle hint={`${room.names.size}명`}>우리 목장 식구</SectionTitle>
          <Card>
            <View style={styles.nameWrap}>
              {room.names.size === 0 ? (
                <ThemedText themeColor="textSecondary">명단을 불러오지 못했어요.</ThemedText>
              ) : (
                [...room.names.entries()].map(([id, n]) => (
                  <View
                    key={id}
                    style={[styles.namePill, { backgroundColor: theme.accentSoft }]}>
                    <ThemedText type="smallBold" themeColor="accent">
                      {n || nameOf(room.names, id)}
                    </ThemedText>
                  </View>
                ))
              )}
            </View>
          </Card>

          {/* ── 마을 ──────────────────────────────────────────── */}
          <SectionTitle hint="목장들이 모인 곳">마을로 나가기</SectionTitle>
          <Card onPress={() => router.push('/village/square' as Href)}>
            <ThemedText style={styles.big}>🌾 {room.village.name} 광장</ThemedText>
            <ThemedText themeColor="textSecondary">
              다른 목장의 소식과 함께 드리는 기도, 연합 모임과 사역이 있습니다.
            </ThemedText>
          </Card>
        </>
      )}
    </RoomScreen>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 19, lineHeight: 28, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ranchHero: { height: 300, borderRadius: 16, overflow: 'hidden' },
  ranchLink: { textAlign: 'right', paddingVertical: Spacing.one },
  buildingCaption: { textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  roomCard: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 2,
    boxShadow: '0 2px 8px rgba(74,55,48,0.06)',
  },
  roomEmoji: { fontSize: 26, lineHeight: 32 },
  roomName: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  nameWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  namePill: { borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: 7 },
});
