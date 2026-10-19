import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
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
  addAction,
  addTarget,
  deleteAction,
  deleteTarget,
  getActions,
  getActiveCampaign,
  getMyTargets,
  getShares,
  setShareAnswered,
  shareTarget,
  unshareTarget,
  updateTarget,
  type Action,
  type Share,
  type Target,
} from '@/db/evangelism';
import { useTheme } from '@/hooks/use-theme';
import { ACTION_KINDS, kindEmoji, kindLabel, type ActionKind } from '@/lib/evangelism';

const RELATIONS = ['가족', '친척', '친구', '직장 동료', '이웃', '지인'];

/**
 * 전도대상자 한 사람 — 걸음 기록, 이름·사정, 교회에 중보 요청으로 나누기.
 *
 * `?id=new` 이면 새로 올리는 화면이다. 이름과 메모는 **본인에게만** 보이고, 교회에
 * 나눌 때는 실명 대신 별명을 따로 적는다(0090).
 */
export default function TargetScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [target, setTarget] = useState<Target | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [share, setShare] = useState<Share | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);

  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(isNew);

  const [kind, setKind] = useState<ActionKind | null>(null);
  const [actNote, setActNote] = useState('');
  const [actDate, setActDate] = useState(todayString());

  const [alias, setAlias] = useState('');
  const [topic, setTopic] = useState('');
  const [sharing, setSharing] = useState(false);
  const [answerNote, setAnswerNote] = useState('');

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    const camp = await getActiveCampaign().catch(() => null);
    setCampaignId(camp?.campaign.id ?? null);
    if (isNew) return;
    const t = (await getMyTargets().catch(() => [] as Target[])).find((x) => x.id === id) ?? null;
    setTarget(t);
    if (t) {
      setName(t.name);
      setRelation(t.relation);
      setNote(t.note);
      setActions(await getActions(t.id).catch(() => []));
      const s = (await getShares().catch(() => [] as Share[])).find((x) => x.targetId === t.id) ?? null;
      setShare(s);
      if (s) {
        setAlias(s.alias);
        setTopic(s.topic);
        setAnswerNote(s.answeredNote);
      }
    }
    setLoading(false);
  }, [id, isNew]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/evangelism' as Href));

  async function saveProfile() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    if (isNew) {
      const r = await addTarget({ campaignId, name, relation, note });
      setBusy(false);
      if (r.error || !r.id) return setMessage(r.error ?? '저장하지 못했어요.');
      router.replace(`/evangelism/target?id=${r.id}` as Href);
      return;
    }
    const err = await updateTarget(id, { name, relation, note });
    setBusy(false);
    if (err) return setMessage(err);
    setEditing(false);
    load();
  }

  async function record() {
    if (!target || !kind || busy) return;
    const date = normalizeDate(actDate);
    if (!date) return setMessage('날짜를 「10/20」처럼 적어 주세요.');
    setBusy(true);
    setMessage('');
    const err = await addAction(target.id, kind, actNote, date);
    setBusy(false);
    if (err) return setMessage(err);
    setKind(null);
    setActNote('');
    setActDate(todayString());
    load();
  }

  async function removeAction(aid: string) {
    await deleteAction(aid);
    load();
  }

  async function doShare() {
    if (!target || busy) return;
    setBusy(true);
    setMessage('');
    const err = await shareTarget({ targetId: target.id, campaignId: target.campaignId ?? campaignId, alias, topic });
    setBusy(false);
    if (err) return setMessage(err);
    setSharing(false);
    load();
  }

  async function doUnshare() {
    if (!target) return;
    await unshareTarget(target.id);
    setShare(null);
    load();
  }

  async function toggleAnswered() {
    if (!share) return;
    await setShareAnswered(share.id, !share.answered, answerNote);
    load();
  }

  async function remove() {
    if (!target) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const err = await deleteTarget(target.id);
    if (err) return setMessage(err);
    back();
  }

  if (!isNew && !loading && !target) {
    return (
      <RoomScreen title="전도대상자" emoji="🕊️" onBack={back}>
        <Empty text="이 분을 찾을 수 없어요." />
      </RoomScreen>
    );
  }

  const doneKinds = new Set(actions.map((a) => a.kind));

  return (
    <RoomScreen title={isNew ? '전도대상자 올리기' : (target?.name ?? '전도대상자')} emoji="🕊️" onBack={back}>
      {isNew || editing ? (
        <Card>
          <Field label="이름" value={name} onChangeText={setName} placeholder="예: 김민수" hint="교회 전체 표에는 성만 보이고 이름은 OO로 가려져요. 메모는 나만 봐요." />
          <ThemedText type="smallBold" themeColor="textSecondary">
            전도자(나)와의 관계
          </ThemedText>
          <ChipRow
            options={RELATIONS.map((r) => ({ value: r, label: r }))}
            value={RELATIONS.includes(relation) ? relation : null}
            onChange={setRelation}
          />
          <Field label="직접 적기" value={relation} onChangeText={setRelation} placeholder="예: 시누이, 대학 동기" />
          <Field label="메모 · 기도제목" value={note} onChangeText={setNote} multiline placeholder="어떤 마음으로 품게 되었는지, 구체적인 기도제목" />
          <View style={styles.row}>
            <Btn label={isNew ? '올리기' : '저장'} onPress={saveProfile} disabled={busy} />
            {!isNew ? <Btn label="취소" tone="ghost" onPress={() => setEditing(false)} /> : null}
          </View>
        </Card>
      ) : target ? (
        <Card>
          <View style={styles.row}>
            <ThemedText style={styles.big}>{target.name}</ThemedText>
            {target.relation ? <Tag label={target.relation} /> : null}
          </View>
          {target.note ? <ThemedText style={styles.body}>{target.note}</ThemedText> : null}
          <View style={styles.row}>
            <Btn small tone="quiet" label="이름·메모 고치기" onPress={() => setEditing(true)} />
          </View>
        </Card>
      ) : null}

      {message ? (
        <ThemedText type="small" style={{ color: theme.support }}>
          {message}
        </ThemedText>
      ) : null}

      {target && !editing ? (
        <>
          <SectionTitle hint="한 걸음씩 기록해요">걸음 점검</SectionTitle>
          <Card>
            <View style={styles.checks}>
              {ACTION_KINDS.map((k) => {
                const on = doneKinds.has(k.kind);
                return (
                  <View key={k.kind} style={styles.check}>
                    <ThemedText style={styles.checkEmoji}>{on ? '✅' : k.emoji}</ThemedText>
                    <ThemedText type="small" themeColor={on ? 'text' : 'textSecondary'}>
                      {k.label}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
            <ThemedText type="smallBold" themeColor="textSecondary">
              오늘의 걸음 기록하기
            </ThemedText>
            <ChipRow
              options={ACTION_KINDS.map((k) => ({ value: k.kind, label: `${k.emoji} ${k.label}` }))}
              value={kind}
              onChange={setKind}
            />
            {kind ? (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  {ACTION_KINDS.find((k) => k.kind === kind)?.hint}
                </ThemedText>
                <Field label="날짜" value={actDate} onChangeText={setActDate} placeholder="10/20" />
                <Field label="메모(선택)" value={actNote} onChangeText={setActNote} multiline placeholder="어떤 대화를 했는지, 반응은 어땠는지" />
                <Btn label="기록하기" onPress={record} disabled={busy} />
              </>
            ) : null}
          </Card>

          {actions.length ? (
            <>
              <SectionTitle>걸어온 길</SectionTitle>
              {actions.map((a) => (
                <Card key={a.id}>
                  <View style={styles.row}>
                    <ThemedText style={styles.name}>
                      {kindEmoji(a.kind)} {kindLabel(a.kind)}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatMeetDay(a.happenedOn)}
                    </ThemedText>
                  </View>
                  {a.note ? <ThemedText style={styles.body}>{a.note}</ThemedText> : null}
                  <View style={styles.row}>
                    <Btn small tone="ghost" label="지우기" onPress={() => removeAction(a.id)} />
                  </View>
                </Card>
              ))}
            </>
          ) : null}

          <SectionTitle hint="실명은 나가지 않아요">교회에 중보 요청하기</SectionTitle>
          {share && !sharing ? (
            <Card>
              <ThemedText style={styles.name}>「{share.alias}」 님으로 나눠졌어요</ThemedText>
              {share.topic ? <ThemedText style={styles.body}>{share.topic}</ThemedText> : null}
              <ThemedText type="small" themeColor="textSecondary">
                🙏 {share.prayerCount}명이 함께 기도 · 💌 격려 {share.messageCount}개
              </ThemedText>
              <Field label="응답·감동 한 줄 (선택)" value={answerNote} onChangeText={setAnswerNote} placeholder="예: 처음으로 교회에 오겠다고 했어요" />
              <View style={styles.row}>
                <Btn small label={share.answered ? '응답 취소' : '🎉 응답받았어요'} onPress={toggleAnswered} />
                <Btn small tone="quiet" label="고치기" onPress={() => setSharing(true)} />
                <Btn small tone="ghost" label="거두기" onPress={doUnshare} />
              </View>
            </Card>
          ) : sharing || !share ? (
            sharing ? (
              <Card>
                <Field label="교회에 보일 이름(별명)" value={alias} onChangeText={setAlias} placeholder="예: 직장 동료 민수 씨" hint="실명을 적지 마세요. 누구인지 본인만 알 수 있게요." />
                <Field label="함께 기도해 주세요" value={topic} onChangeText={setTopic} multiline placeholder="예: 마음이 열려 12월 6일 예배에 함께 오게 해 주세요" />
                <View style={styles.row}>
                  <Btn label="나누기" onPress={doShare} disabled={busy} />
                  <Btn label="취소" tone="ghost" onPress={() => setSharing(false)} />
                </View>
              </Card>
            ) : (
              <Card>
                <ThemedText themeColor="textSecondary" style={styles.body}>
                  별명으로 나누면 성도들이 이 분을 위해 함께 기도하고 격려를 남겨요. 이름과 메모는 나가지 않고, 언제든 거둘 수 있어요.
                </ThemedText>
                <Btn label="🙏 중보 요청하기" onPress={() => setSharing(true)} />
              </Card>
            )
          ) : null}

          <View style={styles.footer}>
            <Btn
              small
              tone="ghost"
              label={confirmDelete ? '정말 지울까요? 한 번 더 누르세요' : '이 분 지우기'}
              onPress={remove}
            />
          </View>
        </>
      ) : null}
    </RoomScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  big: { fontSize: 22, fontWeight: '800' },
  name: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24 },
  checks: { flexDirection: 'row', justifyContent: 'space-between' },
  check: { alignItems: 'center', gap: 2, flex: 1 },
  checkEmoji: { fontSize: 24 },
  footer: { alignItems: 'flex-start', marginTop: Spacing.three },
});
