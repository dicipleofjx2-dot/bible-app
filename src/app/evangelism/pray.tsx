import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Btn, Card, ChipRow, Empty, Field, RoomScreen, Tag } from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import {
  addMessage,
  deleteMessage,
  getMessages,
  getShares,
  togglePrayer,
  type Message,
  type Share,
} from '@/db/evangelism';
import { useAuth } from '@/lib/auth';
import { ACTION_KINDS, kindEmoji, kindLabel } from '@/lib/evangelism';

/**
 * 중보기도 광장 — 성도들이 별명으로 나눈 전도대상자들.
 *
 * 「함께 기도합니다」는 한 사람이 한 번, 다시 누르면 취소(village_cheers 와 같은
 * 방식). 격려와 감동 나눔은 카드를 펼쳐 남긴다. 실명·메모는 이 화면에 오지 않는다.
 */
export default function PrayScreen() {
  const { session } = useAuth();
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<'encourage' | 'testimony'>('encourage');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setShares(await getShares().catch(() => []));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/evangelism' as Href));

  async function pray(s: Share) {
    setError('');
    // 눌린 즉시 반영해 두고, 실패하면 되돌린다.
    setShares((all) =>
      all.map((x) =>
        x.id === s.id ? { ...x, iPrayed: !s.iPrayed, prayerCount: x.prayerCount + (s.iPrayed ? -1 : 1) } : x,
      ),
    );
    const err = await togglePrayer(s.id, !s.iPrayed);
    if (err) {
      setError(err);
      load();
    }
  }

  async function toggleOpen(s: Share) {
    if (open === s.id) {
      setOpen(null);
      return;
    }
    setOpen(s.id);
    setText('');
    setMessages(await getMessages(s.id).catch(() => []));
  }

  async function send(s: Share) {
    setError('');
    const err = await addMessage(s.id, kind, text);
    if (err) return setError(err);
    setText('');
    setMessages(await getMessages(s.id).catch(() => []));
    load();
  }

  async function remove(s: Share, m: Message) {
    await deleteMessage(m.id);
    setMessages(await getMessages(s.id).catch(() => []));
    load();
  }

  if (!session) {
    return (
      <RoomScreen title="중보기도 광장" emoji="🙏" onBack={back}>
        <Empty text="로그인하면 함께 기도할 수 있어요." />
      </RoomScreen>
    );
  }

  return (
    <RoomScreen title="중보기도 광장" emoji="🙏" subtitle="별명으로 나눈 전도대상자를 위해 함께 기도해요" onBack={back}>
      {error ? <ThemedText type="small">{error}</ThemedText> : null}
      {!loading && shares.length === 0 ? (
        <Empty text="아직 나눠진 중보 요청이 없어요. 내 전도대상자에서 「중보 요청하기」를 눌러 보세요." />
      ) : null}

      {shares.map((s) => (
        <Card key={s.id}>
          <View style={styles.row}>
            <ThemedText style={styles.name}>{s.alias}</ThemedText>
            {s.mine ? <Tag label="내 요청" /> : null}
            {s.answered ? <Tag label="🎉 응답" tone="done" /> : null}
            {s.stage > 0 && s.stageKind ? <Tag label={`${kindEmoji(s.stageKind)} ${kindLabel(s.stageKind)}까지`} /> : null}
          </View>
          {s.topic ? <ThemedText style={styles.body}>{s.topic}</ThemedText> : null}
          {s.answered && s.answeredNote ? <ThemedText style={styles.body}>✨ {s.answeredNote}</ThemedText> : null}

          <View style={styles.bar}>
            {ACTION_KINDS.map((k, i) => (
              <View key={k.kind} style={[styles.seg, { opacity: i < s.stage ? 1 : 0.22 }]} />
            ))}
          </View>

          <View style={styles.row}>
            <Btn small tone={s.iPrayed ? 'primary' : 'quiet'} label={`🙏 함께 기도합니다 ${s.prayerCount}`} onPress={() => pray(s)} />
            <Btn small tone="ghost" label={`💌 격려 ${s.messageCount}`} onPress={() => toggleOpen(s)} />
          </View>

          {open === s.id ? (
            <View style={styles.thread}>
              {messages.map((m) => (
                <View key={m.id} style={styles.msg}>
                  <ThemedText type="smallBold">
                    {m.kind === 'testimony' ? '✨ 감동' : '💌 격려'} · {m.author}
                  </ThemedText>
                  <ThemedText style={styles.body}>{m.body}</ThemedText>
                  {session.user.id === m.authorId || s.mine ? (
                    <Btn small tone="ghost" label="지우기" onPress={() => remove(s, m)} />
                  ) : null}
                </View>
              ))}
              <ChipRow
                options={[
                  { value: 'encourage', label: '💌 격려' },
                  { value: 'testimony', label: '✨ 감동·응답' },
                ]}
                value={kind}
                onChange={setKind}
              />
              <Field
                label="한마디 남기기"
                value={text}
                onChangeText={setText}
                multiline
                placeholder="함께 기도하며 받은 마음이나 격려를 적어 주세요"
              />
              <Btn label="남기기" onPress={() => send(s)} disabled={!text.trim()} />
            </View>
          ) : null}
        </Card>
      ))}
    </RoomScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  name: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24 },
  bar: { flexDirection: 'row', gap: 3 },
  seg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#2E7D5B' },
  thread: { gap: Spacing.two, marginTop: Spacing.two },
  msg: { gap: 2, paddingVertical: Spacing.one },
});
