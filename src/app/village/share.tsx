import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  Btn,
  Card,
  ChipRow,
  Empty,
  Field,
  RoomScreen,
  SectionTitle,
  Tag,
  todayString,
} from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { nameOf, useCellRoom } from '@/hooks/use-cell-room';
import {
  getCellMessages,
  postCellMessage,
  removeCellMessage,
  toggleCheer as toggleMessageCheer,
  type CellMessage,
} from '@/db/cell';
import {
  getGatherings,
  getShares,
  pickCurrentGathering,
  postShare,
  postShareComment,
  removeShare,
  type Gathering,
  type Share,
} from '@/db/village';

/**
 * 소그룹실 — 나눔.
 *
 * 0068 의 소통창(cell_messages)과 다른 자리다. 저기는 짧은 말이 흐르고, 여기는
 * 질문 하나에 대한 답이 모여 나중에 다시 읽힌다. 그래서 이번 모임의 나눔
 * 질문을 위에 띄우고, 답을 그 질문에 붙인다.
 *
 * 「목자님께만」을 둔 이유: 목장 앞에서 말하기 어려운 것이 있다. 그 칸이 없으면
 * 그런 이야기는 아예 안 적히거나, 모두에게 적힌다. 둘 다 좋지 않다.
 *
 * 소통창(0068 의 cell_messages)이 이 화면 아래에 함께 있다. 옛 목장방(/r2m/cell)이
 * 사라지면서 옮겨 왔다 — **표는 그대로라 그때 오간 말이 그대로 이어진다.**
 * 나눔과 한 화면에 둔 까닭: 둘 다 「서로에게 말하는 곳」이고, 화면을 갈라 두면
 * 어느 쪽에 적어야 하는지 매번 망설이게 된다.
 */
export default function ShareRoomScreen() {
  const theme = useTheme();
  const { room, loading } = useCellRoom();
  const cellId = room?.cell?.id ?? null;

  const [shares, setShares] = useState<Share[]>([]);
  const [gathering, setGathering] = useState<Gathering | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'cell' | 'leader'>('cell');
  const [busy, setBusy] = useState(false);
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [messages, setMessages] = useState<CellMessage[]>([]);
  const [talk, setTalk] = useState('');

  const load = useCallback(async () => {
    if (!cellId) return;
    const [rows, meetings, msgs] = await Promise.all([
      getShares(cellId).catch(() => [] as Share[]),
      getGatherings(cellId, 5).catch(() => [] as Gathering[]),
      getCellMessages(cellId, room?.userId ?? '').catch(() => [] as CellMessage[]),
    ]);
    setShares(rows);
    setGathering(pickCurrentGathering(meetings, todayString()));
    setMessages(msgs);
  }, [cellId, room?.userId]);

  useEffect(() => {
    load();
  }, [load]);

  const questions = (gathering?.steps ?? []).filter((s) => s.kind === 'question');

  async function submit() {
    if (!cellId || !room || busy || !body.trim()) return;
    setBusy(true);
    const { error } = await postShare({
      cellId,
      authorId: room.userId,
      body: body.trim(),
      question,
      gatheringId: gathering?.id ?? null,
      audience,
    });
    setBusy(false);
    if (!error) {
      setBody('');
      await load();
    }
  }

  async function submitComment(shareId: string) {
    if (!room || !comment.trim()) return;
    await postShareComment({ shareId, authorId: room.userId, body: comment.trim() });
    setComment('');
    setCommentFor(null);
    await load();
  }

  async function sendTalk() {
    if (!cellId || !room || !talk.trim()) return;
    await postCellMessage(cellId, room.userId, talk.trim());
    setTalk('');
    await load();
  }

  return (
    <RoomScreen title="소그룹실" emoji="💬" subtitle={room?.cell?.name ?? ''}>
      {loading ? (
        <Empty text="불러오는 중입니다…" />
      ) : !cellId ? (
        <Empty text="목장이 정해지면 소그룹실이 열립니다." />
      ) : (
        <>
          {/* ── 오늘의 질문 ───────────────────────────────────── */}
          {questions.length > 0 ? (
            <Card>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {gathering?.title} 나눔 질문
              </ThemedText>
              <ChipRow
                options={[
                  { value: '__free__', label: '자유 나눔' },
                  ...questions.map((q) => ({ value: q.title, label: q.title })),
                ]}
                value={question ?? '__free__'}
                onChange={(v) => setQuestion(v === '__free__' ? null : v)}
              />
              {question ? (
                <ThemedText style={styles.question}>{question}</ThemedText>
              ) : null}
            </Card>
          ) : null}

          {/* ── 쓰기 ──────────────────────────────────────────── */}
          <Card>
            <Field
              label="나눔"
              value={body}
              onChangeText={setBody}
              multiline
              placeholder="오늘 마음에 남은 것을 적어 주세요"
            />
            <ChipRow
              options={[
                { value: 'cell', label: '목장 식구에게' },
                { value: 'leader', label: '목자님께만' },
              ]}
              value={audience}
              onChange={setAudience}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {audience === 'leader'
                ? '이 글은 목자님과 교역자만 봅니다.'
                : '우리 목장 식구에게 보입니다. 마을로는 나가지 않습니다.'}
            </ThemedText>
            <Btn label={busy ? '올리는 중…' : '나눔 올리기'} onPress={submit} disabled={busy} />
          </Card>

          {/* ── 나눔 목록 ─────────────────────────────────────── */}
          <SectionTitle hint={`${shares.length}개`}>우리 목장의 나눔</SectionTitle>
          {shares.length === 0 ? (
            <Empty text="아직 나눔이 없어요. 첫 글을 남겨 주세요." />
          ) : (
            shares.map((s) => (
              <Card key={s.id}>
                <View style={styles.rowBetween}>
                  <ThemedText type="smallBold">{nameOf(room?.names ?? new Map(), s.authorId)}</ThemedText>
                  {s.audience === 'leader' ? <Tag label="목자님께만" tone="warn" /> : null}
                </View>
                {s.question ? (
                  <ThemedText type="small" themeColor="accent">
                    Q. {s.question}
                  </ThemedText>
                ) : null}
                <ThemedText style={styles.body}>{s.body}</ThemedText>

                {s.comments.map((c) => (
                  <View key={c.id} style={[styles.comment, { borderLeftColor: theme.border }]}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {nameOf(room?.names ?? new Map(), c.authorId)}
                    </ThemedText>
                    <ThemedText type="small">{c.body}</ThemedText>
                  </View>
                ))}

                {commentFor === s.id ? (
                  <>
                    <Field label="댓글" value={comment} onChangeText={setComment} placeholder="한 마디 남기기" />
                    <View style={styles.row}>
                      <Btn label="남기기" small onPress={() => submitComment(s.id)} style={styles.grow} />
                      <Btn label="취소" small tone="ghost" onPress={() => setCommentFor(null)} style={styles.grow} />
                    </View>
                  </>
                ) : (
                  <View style={styles.row}>
                    <Btn label="댓글" small tone="quiet" onPress={() => setCommentFor(s.id)} />
                    {s.authorId === room?.userId ? (
                      <Btn
                        label="지우기"
                        small
                        tone="ghost"
                        onPress={async () => {
                          await removeShare(s.id);
                          await load();
                        }}
                      />
                    ) : null}
                  </View>
                )}
              </Card>
            ))
          )}

          {/* ── 소통창 ────────────────────────────────────────── */}
          <SectionTitle hint="짧은 말이 오가는 곳. 나눔은 위에 쌓입니다">소통창</SectionTitle>
          <Card>
            <Field
              label="한 마디"
              value={talk}
              onChangeText={setTalk}
              placeholder="오늘 목장 모임 장소가 바뀌었어요"
            />
            <Btn label="보내기" small onPress={sendTalk} />
          </Card>
          {messages.length === 0 ? (
            <Empty text="아직 오간 말이 없어요." />
          ) : (
            messages.map((t) => (
              <Card key={t.id}>
                <View style={styles.rowBetween}>
                  <ThemedText type="smallBold">{t.authorName}</ThemedText>
                  <Btn
                    small
                    tone={t.iCheered ? 'primary' : 'quiet'}
                    label={`👏 ${t.cheers}`}
                    onPress={async () => {
                      if (!room) return;
                      await toggleMessageCheer(t.id, room.userId, !t.iCheered);
                      await load();
                    }}
                  />
                </View>
                <ThemedText>{t.body}</ThemedText>
                {t.authorId === room?.userId ? (
                  <Btn
                    label="지우기"
                    small
                    tone="ghost"
                    onPress={async () => {
                      await removeCellMessage(t.id);
                      await load();
                    }}
                  />
                ) : null}
              </Card>
            ))
          )}
        </>
      )}
    </RoomScreen>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 18, lineHeight: 28, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 26 },
  row: { flexDirection: 'row', gap: Spacing.two },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grow: { flex: 1 },
  comment: { borderLeftWidth: 3, paddingLeft: Spacing.two, gap: 1 },
});
