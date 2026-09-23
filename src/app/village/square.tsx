import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
import { useTheme } from '@/hooks/use-theme';
import { nameOf, useCellRoom } from '@/hooks/use-cell-room';
import {
  createVillageEvent,
  createVillageWork,
  decideVillagePost,
  getVillageEvents,
  getVillagePosts,
  getVillagePrayers,
  getVillageStreet,
  getVillageWorks,
  markPrayerAnswered,
  POST_KINDS,
  postVillagePrayer,
  proposeVillagePost,
  toggleCheer,
  toggleSignup,
  type StreetCell,
  type VillageEvent,
  type VillagePost,
  type VillagePrayer,
  type VillageWork,
} from '@/db/village';

/**
 * 마을 — 목장들이 모인 곳.
 *
 * 다섯 자리를 한 화면 안의 띠로 갈랐다(기획서 §3 의 표 그대로). 화면을 다섯으로
 * 쪼개면 「마을에 무엇이 있는지」를 보려고 다섯 번 들어갔다 나와야 한다. 마을은
 * 둘러보는 곳이지 일하는 곳이 아니라, 한 화면에서 훑는 편이 맞다.
 *
 * **광장에는 승인된 글만 흐른다.** 목장에서 올린 글은 대기 상태로 서고, 마을장·
 * 교역자에게만 「기다리는 글」 칸이 따로 보인다.
 */

type TabKey = 'street' | 'square' | 'hall' | 'garden' | 'works';

const TABS: { key: TabKey; emoji: string; label: string }[] = [
  { key: 'street', emoji: '🏘️', label: '목장 거리' },
  { key: 'square', emoji: '🌾', label: '광장' },
  { key: 'hall', emoji: '🏛️', label: '마을회관' },
  { key: 'garden', emoji: '🙏', label: '기도정원' },
  { key: 'works', emoji: '🤝', label: '함께하는 사역' },
];

export default function VillageSquareScreen() {
  const theme = useTheme();
  const { room, loading } = useCellRoom();
  const villageId = room?.village.id ?? null;
  const myId = room?.userId ?? '';
  const canLead = Boolean(room?.isVillageLeader);

  const [tab, setTab] = useState<TabKey>('square');
  const [street, setStreet] = useState<StreetCell[]>([]);
  const [posts, setPosts] = useState<VillagePost[]>([]);
  const [events, setEvents] = useState<VillageEvent[]>([]);
  const [prayers, setPrayers] = useState<VillagePrayer[]>([]);
  const [works, setWorks] = useState<VillageWork[]>([]);
  const [busy, setBusy] = useState(false);

  // 쓰기 칸
  const [writing, setWriting] = useState(false);
  const [kind, setKind] = useState<VillagePost['kind']>('news');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = useCallback(async () => {
    if (!room) return;
    const [s, p, e, r, w] = await Promise.all([
      getVillageStreet(villageId).catch(() => [] as StreetCell[]),
      getVillagePosts(villageId, myId).catch(() => [] as VillagePost[]),
      getVillageEvents(villageId, myId).catch(() => [] as VillageEvent[]),
      getVillagePrayers(villageId, myId).catch(() => [] as VillagePrayer[]),
      getVillageWorks(villageId, myId).catch(() => [] as VillageWork[]),
    ]);
    setStreet(s);
    setPosts(p);
    setEvents(e);
    setPrayers(r);
    setWorks(w);
  }, [room, villageId, myId]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!room?.churchId || !room.cell || busy || !title.trim() || !body.trim()) return;
    setBusy(true);
    if (tab === 'garden') {
      await postVillagePrayer({
        churchId: room.churchId,
        villageId,
        cellId: room.cell.id,
        authorId: myId,
        title: title.trim(),
        body: body.trim(),
      });
    } else if (tab === 'hall' && canLead) {
      await createVillageEvent({
        churchId: room.churchId,
        villageId,
        createdBy: myId,
        title: title.trim(),
        body: body.trim(),
        eventOn: new Date().toISOString().slice(0, 10),
      });
    } else if (tab === 'works' && canLead) {
      await createVillageWork({
        churchId: room.churchId,
        villageId,
        createdBy: myId,
        title: title.trim(),
        body: body.trim(),
      });
    } else {
      await proposeVillagePost({
        churchId: room.churchId,
        villageId,
        cellId: room.cell.id,
        authorId: myId,
        kind,
        title: title.trim(),
        body: body.trim(),
      });
    }
    setBusy(false);
    setTitle('');
    setBody('');
    setWriting(false);
    await load();
  }

  const pending = posts.filter((p) => p.status === 'pending');
  const approved = posts.filter((p) => p.status === 'approved');

  return (
    <RoomScreen
      title={room?.village.name ?? '우리 마을'}
      emoji="🌾"
      subtitle="목장들이 함께 이루는 마을">
      {loading ? (
        <Empty text="마을을 여는 중입니다…" />
      ) : !room?.cell ? (
        <Empty text="목장에 속하면 마을이 열립니다." />
      ) : (
        <>
          {/* ── 자리 고르기 ───────────────────────────────────── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {TABS.map((t) => {
              const on = t.key === tab;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => {
                    setTab(t.key);
                    setWriting(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: on ? theme.backgroundSelected : theme.backgroundElement,
                      borderColor: on ? theme.backgroundSelected : theme.border,
                    },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: on ? '#FFFFFF' : theme.text }}>
                    {t.emoji} {t.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ── 목장 거리 ─────────────────────────────────────── */}
          {tab === 'street' ? (
            street.length === 0 ? (
              <Empty text="이 마을에 등록된 목장이 아직 없어요." />
            ) : (
              street.map((c) => (
                <Card key={c.cellId}>
                  <View style={styles.rowBetween}>
                    <ThemedText style={styles.big}>🏡 {c.cellName}</ThemedText>
                    {c.cellId === room.cell?.id ? <Tag label="우리 목장" tone="done" /> : null}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {c.leaderName ? `목자 ${c.leaderName} · ` : ''}
                    {c.memberCount}명
                  </ThemedText>
                  {c.nextMeetOn ? (
                    <ThemedText themeColor="accent">
                      📅 {formatMeetDay(c.nextMeetOn)} {c.nextMeetTitle ?? ''}
                    </ThemedText>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      다음 모임이 아직 안 올라왔어요.
                    </ThemedText>
                  )}
                </Card>
              ))
            )
          ) : null}

          {/* ── 광장 ──────────────────────────────────────────── */}
          {tab === 'square' ? (
            <>
              {writing ? (
                <Card>
                  <SectionTitle hint="마을장이 확인한 뒤 광장에 올라갑니다">마을에 나누기</SectionTitle>
                  <ChipRow
                    options={POST_KINDS.map((k) => ({ value: k.kind, label: k.label }))}
                    value={kind}
                    onChange={setKind}
                  />
                  <Field label="제목" value={title} onChangeText={setTitle} />
                  <Field label="내용" value={body} onChangeText={setBody} multiline />
                  <Btn label={busy ? '보내는 중…' : '나누기 신청'} onPress={submit} disabled={busy} />
                  <Btn label="취소" tone="ghost" onPress={() => setWriting(false)} />
                </Card>
              ) : (
                <Btn label="우리 목장 소식 나누기" onPress={() => setWriting(true)} />
              )}

              {pending.length > 0 ? (
                <>
                  <SectionTitle hint={canLead ? '확인하면 광장에 올라갑니다' : '마을장이 확인하는 중입니다'}>
                    기다리는 글
                  </SectionTitle>
                  {pending.map((p) => (
                    <Card key={p.id}>
                      <View style={styles.rowBetween}>
                        <ThemedText style={styles.big}>{p.title}</ThemedText>
                        <Tag label="대기" tone="warn" />
                      </View>
                      <ThemedText>{p.body}</ThemedText>
                      {canLead ? (
                        <View style={styles.row}>
                          <Btn
                            label="광장에 올리기"
                            small
                            style={styles.grow}
                            onPress={async () => {
                              await decideVillagePost(p.id, true, myId);
                              await load();
                            }}
                          />
                          <Btn
                            label="돌려보내기"
                            small
                            tone="ghost"
                            style={styles.grow}
                            onPress={async () => {
                              await decideVillagePost(p.id, false, myId);
                              await load();
                            }}
                          />
                        </View>
                      ) : null}
                    </Card>
                  ))}
                </>
              ) : null}

              <SectionTitle hint={`${approved.length}개`}>마을 소식</SectionTitle>
              {approved.length === 0 ? (
                <Empty text="아직 올라온 소식이 없어요." />
              ) : (
                approved.map((p) => (
                  <Card key={p.id}>
                    <View style={styles.rowBetween}>
                      <ThemedText style={styles.big}>{p.title}</ThemedText>
                      <Tag label={POST_KINDS.find((k) => k.kind === p.kind)?.label ?? ''} />
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {street.find((c) => c.cellId === p.cellId)?.cellName ?? '한 목장'} ·{' '}
                      {nameOf(room.names, p.authorId)}
                    </ThemedText>
                    <ThemedText>{p.body}</ThemedText>
                    <Btn
                      small
                      tone={p.iCheered ? 'primary' : 'quiet'}
                      label={`💛 ${p.cheers}`}
                      onPress={async () => {
                        await toggleCheer('post', p.id, myId, !p.iCheered, '💛');
                        await load();
                      }}
                    />
                  </Card>
                ))
              )}
            </>
          ) : null}

          {/* ── 마을회관 ──────────────────────────────────────── */}
          {tab === 'hall' ? (
            <>
              {canLead ? (
                writing ? (
                  <Card>
                    <SectionTitle>연합 모임 올리기</SectionTitle>
                    <Field label="제목" value={title} onChangeText={setTitle} />
                    <Field label="안내" value={body} onChangeText={setBody} multiline />
                    <Btn label={busy ? '올리는 중…' : '올리기'} onPress={submit} disabled={busy} />
                    <Btn label="취소" tone="ghost" onPress={() => setWriting(false)} />
                  </Card>
                ) : (
                  <Btn label="연합 모임 올리기" onPress={() => setWriting(true)} />
                )
              ) : null}
              {events.length === 0 ? (
                <Empty text="예정된 연합 모임이 없어요." />
              ) : (
                events.map((e) => (
                  <Card key={e.id}>
                    <ThemedText style={styles.big}>{e.title}</ThemedText>
                    <ThemedText themeColor="accent">
                      📅 {formatMeetDay(e.eventOn)}
                      {e.startTime ? ` ${e.startTime}` : ''}
                      {e.place ? ` · ${e.place}` : ''}
                    </ThemedText>
                    {e.body ? <ThemedText>{e.body}</ThemedText> : null}
                    <Btn
                      small
                      tone={e.iSignedUp ? 'primary' : 'quiet'}
                      label={e.iSignedUp ? `참석해요 · ${e.signups}명` : `참석 신청 (${e.signups}명)`}
                      onPress={async () => {
                        await toggleSignup('event', e.id, myId, !e.iSignedUp);
                        await load();
                      }}
                    />
                  </Card>
                ))
              )}
            </>
          ) : null}

          {/* ── 기도정원 ──────────────────────────────────────── */}
          {tab === 'garden' ? (
            <>
              {writing ? (
                <Card>
                  <SectionTitle hint="마을이 함께 기도합니다">기도 제목 올리기</SectionTitle>
                  <Field label="제목" value={title} onChangeText={setTitle} />
                  <Field label="내용" value={body} onChangeText={setBody} multiline />
                  <Btn label={busy ? '올리는 중…' : '기도 제목 올리기'} onPress={submit} disabled={busy} />
                  <Btn label="취소" tone="ghost" onPress={() => setWriting(false)} />
                </Card>
              ) : (
                <Btn label="기도 제목 올리기" onPress={() => setWriting(true)} />
              )}
              {prayers.length === 0 ? (
                <Empty text="아직 올라온 기도 제목이 없어요." />
              ) : (
                prayers.map((p) => (
                  <Card key={p.id}>
                    <View style={styles.rowBetween}>
                      <ThemedText style={styles.big}>{p.title}</ThemedText>
                      {p.answered ? <Tag label="응답" tone="done" /> : null}
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {p.isAnonymous ? '한 가정' : nameOf(room.names, p.authorId)} ·{' '}
                      {street.find((c) => c.cellId === p.cellId)?.cellName ?? '한 목장'}
                    </ThemedText>
                    {p.body ? <ThemedText>{p.body}</ThemedText> : null}
                    {p.answeredNote ? (
                      <ThemedText themeColor="support">🙌 {p.answeredNote}</ThemedText>
                    ) : null}
                    <View style={styles.row}>
                      <Btn
                        small
                        tone={p.iAmened ? 'primary' : 'quiet'}
                        label={`🙏 함께 기도 ${p.amens}`}
                        onPress={async () => {
                          await toggleCheer('prayer', p.id, myId, !p.iAmened);
                          await load();
                        }}
                      />
                      {p.authorId === myId && !p.answered ? (
                        <Btn
                          small
                          tone="ghost"
                          label="응답됐어요"
                          onPress={async () => {
                            await markPrayerAnswered(p.id, true);
                            await load();
                          }}
                        />
                      ) : null}
                    </View>
                  </Card>
                ))
              )}
            </>
          ) : null}

          {/* ── 함께하는 사역 ─────────────────────────────────── */}
          {tab === 'works' ? (
            <>
              {canLead ? (
                writing ? (
                  <Card>
                    <SectionTitle>연합 사역 열기</SectionTitle>
                    <Field label="제목" value={title} onChangeText={setTitle} />
                    <Field label="내용" value={body} onChangeText={setBody} multiline />
                    <Btn label={busy ? '여는 중…' : '열기'} onPress={submit} disabled={busy} />
                    <Btn label="취소" tone="ghost" onPress={() => setWriting(false)} />
                  </Card>
                ) : (
                  <Btn label="연합 사역 열기" onPress={() => setWriting(true)} />
                )
              ) : null}
              {works.length === 0 ? (
                <Empty text="지금 함께하는 사역이 없어요." />
              ) : (
                works.map((w) => (
                  <Card key={w.id}>
                    <ThemedText style={styles.big}>{w.title}</ThemedText>
                    {w.workOn ? (
                      <ThemedText themeColor="accent">
                        📅 {formatMeetDay(w.workOn)}
                        {w.place ? ` · ${w.place}` : ''}
                      </ThemedText>
                    ) : null}
                    {w.body ? <ThemedText>{w.body}</ThemedText> : null}
                    <Btn
                      small
                      tone={w.iSignedUp ? 'primary' : 'quiet'}
                      label={w.iSignedUp ? `함께해요 · ${w.signups}명` : `함께하기 (${w.signups}명)`}
                      onPress={async () => {
                        await toggleSignup('work', w.id, myId, !w.iSignedUp);
                        await load();
                      }}
                    />
                  </Card>
                ))
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
  tabs: { gap: Spacing.two, paddingVertical: 2 },
  tab: { minHeight: 44, borderRadius: 999, borderWidth: 1, paddingHorizontal: Spacing.three, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: Spacing.two },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  grow: { flex: 1 },
});
