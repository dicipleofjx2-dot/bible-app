import * as Clipboard from 'expo-clipboard';
import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  createInvite,
  deleteTestimony,
  listInvites,
  listTestimonies,
  setInviteActive,
  setTestimonyReviewed,
  setTestimonyVisibility,
  type MissionInvite,
  type MissionTestimony,
} from '@/db/missionArchive';
import { ChipRow, Field, MissionCard, PrimaryButton } from '@/features/mission/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { VISIBILITY, visibilityLabel } from '@/lib/missionArchive';

/** 증언자에게 보낼 기본 질문 (기획서 §10). 사람마다 골라 고쳐 쓴다. */
const SUGGESTED = [
  '그분을 처음 만난 때는 언제였고, 어떤 인상이었습니까?',
  '함께 사역하며 가장 기억에 남는 일은 무엇입니까?',
  '가장 힘들었던 때, 그분은 어떻게 견디셨습니까?',
  '그분에게서 배운 것 한 가지를 말씀해 주시겠습니까?',
  '다음 세대가 꼭 알았으면 하는 이야기가 있습니까?',
];

/**
 * 공동 증언 (기획서 §10).
 *
 * 증언자에게 계정을 만들라고 하지 않는다 — 링크 하나를 보내고, 그 링크로 답만
 * 넣게 한다. 표는 잠긴 채이고 함수 둘만 열려 있다(0080). 증언자는 자기가 낸
 * 답조차 다시 읽지 못한다. 링크가 남의 손에 넘어가도 읽을 것이 없어야 한다.
 *
 * 서로 다른 기억은 **합치지 않는다.** 원고에도 각각의 이름과 관계를 달아 나란히
 * 싣는다.
 */
export default function MissionWitnessesScreen() {
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ownerId = session?.user.id ?? null;

  const [invites, setInvites] = useState<MissionInvite[]>([]);
  const [testimonies, setTestimonies] = useState<MissionTestimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<string[]>(SUGGESTED.slice(0, 3));
  const [extra, setExtra] = useState('');

  const load = useCallback(async () => {
    if (!ownerId || !id) {
      setLoading(false);
      return;
    }
    try {
      const [inviteList, testimonyList] = await Promise.all([listInvites(id), listTestimonies(id)]);
      setInvites(inviteList);
      setTestimonies(testimonyList);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [ownerId, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /**
   * 링크 주소.
   *
   * 웹에서는 지금 열려 있는 주소를 그대로 쓴다 — 배포 주소를 코드에 박아 두면
   * 미리보기 배포에서 만든 링크가 운영 주소를 가리켜 엉뚱한 곳으로 간다.
   */
  function linkFor(token: string): string {
    const base =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : 'https://dicipleofjx-bible.vercel.app';
    return `${base}/witness/${token}`;
  }

  async function submit() {
    if (!ownerId || !id) return;
    const questions = [...picked, ...extra.split('\n').map((q) => q.trim()).filter(Boolean)];
    if (questions.length === 0) {
      setMessage('질문을 하나 이상 골라 주세요.');
      return;
    }
    setBusy(true);
    try {
      const invite = await createInvite(ownerId, id, {
        invitee_name: name.trim(),
        relation: relation.trim(),
        questions,
        note: note.trim(),
      });
      await Clipboard.setStringAsync(linkFor(invite.token));
      setMessage('링크를 만들어 복사했습니다. 문자나 카카오톡으로 보내 주세요.');
      setName('');
      setRelation('');
      setExtra('');
      setFormOpen(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '만들지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function run(job: () => Promise<void>, failMessage: string) {
    setBusy(true);
    try {
      await job();
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : failMessage);
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!session) return <Redirect href="/profile" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>동역자 증언</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            가족·성도·현지 지도자에게 링크를 보내면, 로그인 없이 그 자리에서 답을 적어 보낼 수
            있습니다. 링크를 받은 분은 질문만 볼 뿐 이 기록을 읽지 못합니다.
          </ThemedText>

          {formOpen ? (
            <MissionCard>
              <ThemedText style={Type.itemTitle}>증언 요청 만들기</ThemedText>
              <Field label="누구에게" value={name} onChangeText={setName} placeholder="예) 김권사님" />
              <Field label="관계" value={relation} onChangeText={setRelation} placeholder="예) 개척 초기 성도" />
              <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>
                물어볼 것 (눌러서 넣고 뺍니다)
              </ThemedText>
              {SUGGESTED.map((question) => {
                const on = picked.includes(question);
                return (
                  <Pressable
                    key={question}
                    onPress={() =>
                      setPicked((list) => (on ? list.filter((q) => q !== question) : [...list, question]))
                    }>
                    <ThemedText style={[Type.body, { color: on ? theme.accent : theme.textSecondary }]}>
                      {on ? '✓ ' : '○ '}
                      {question}
                    </ThemedText>
                  </Pressable>
                );
              })}
              <Field
                label="더 묻고 싶은 것 (줄을 바꿔 여러 개)"
                value={extra}
                onChangeText={setExtra}
                multiline
              />
              <Field label="인사말" value={note} onChangeText={setNote} multiline />
              <PrimaryButton label={busy ? '만드는 중…' : '링크 만들고 복사하기'} onPress={submit} disabled={busy} />
              <PrimaryButton label="취소" tone="quiet" onPress={() => setFormOpen(false)} />
            </MissionCard>
          ) : (
            <PrimaryButton label="+ 증언 요청 링크 만들기" onPress={() => setFormOpen(true)} />
          )}

          {loading ? (
            <ActivityIndicator style={styles.loading} color={theme.accent} />
          ) : (
            <>
              {invites.length > 0 ? (
                <View style={styles.list}>
                  <ThemedText style={Type.itemTitle}>보낸 요청</ThemedText>
                  {invites.map((invite) => (
                    <MissionCard key={invite.id}>
                      <ThemedText style={Type.itemTitle}>
                        {invite.invitee_name || '이름 없는 요청'}
                        {invite.relation ? ` · ${invite.relation}` : ''}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" style={Type.caption}>
                        질문 {invite.questions.length}개 · {invite.active ? '열려 있음' : '닫힘'}
                      </ThemedText>
                      <View style={styles.row}>
                        <Pressable
                          onPress={async () => {
                            await Clipboard.setStringAsync(linkFor(invite.token));
                            setMessage('링크를 복사했습니다.');
                          }}>
                          <ThemedText style={[Type.caption, { color: theme.accent }]}>링크 복사</ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={() => run(() => setInviteActive(invite.id, !invite.active), '바꾸지 못했어요.')}
                          disabled={busy}>
                          <ThemedText style={[Type.caption, { color: theme.accent }]}>
                            {invite.active ? '링크 닫기' : '다시 열기'}
                          </ThemedText>
                        </Pressable>
                      </View>
                    </MissionCard>
                  ))}
                </View>
              ) : null}

              <View style={styles.list}>
                <ThemedText style={Type.itemTitle}>받은 증언 {testimonies.length}건</ThemedText>
                {testimonies.map((item) => (
                  <MissionCard key={item.id}>
                    <ThemedText style={Type.itemTitle}>
                      {item.witness_name || '이름을 밝히지 않음'}
                      {item.relation ? ` · ${item.relation}` : ''}
                    </ThemedText>
                    {item.question ? (
                      <ThemedText themeColor="textSecondary" style={Type.caption}>
                        {item.question}
                      </ThemedText>
                    ) : null}
                    <ThemedText style={Type.body}>{item.body}</ThemedText>
                    <ChipRow
                      label={`공개 범위 · 지금 ${visibilityLabel(item.visibility)}`}
                      options={VISIBILITY.map((v) => ({ id: v.id, label: v.label }))}
                      value={item.visibility}
                      onChange={(v) => run(() => setTestimonyVisibility(item.id, v), '바꾸지 못했어요.')}
                    />
                    <View style={styles.row}>
                      <Pressable
                        onPress={() => run(() => setTestimonyReviewed(item.id, !item.reviewed), '바꾸지 못했어요.')}
                        disabled={busy}>
                        <ThemedText style={[Type.caption, { color: theme.accent }]}>
                          {item.reviewed ? '✓ 읽음' : '읽음 표시'}
                        </ThemedText>
                      </Pressable>
                      <Pressable onPress={() => run(() => deleteTestimony(item.id), '지우지 못했어요.')} disabled={busy}>
                        <ThemedText style={[Type.caption, { color: theme.accent }]}>지우기</ThemedText>
                      </Pressable>
                    </View>
                  </MissionCard>
                ))}
                {testimonies.length === 0 ? (
                  <ThemedText themeColor="textSecondary" style={Type.body}>
                    아직 도착한 증언이 없습니다.
                  </ThemedText>
                ) : null}
              </View>
            </>
          )}

          {message ? <ThemedText style={[Type.caption, { color: theme.accent }]}>{message}</ThemedText> : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%' },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  loading: { marginVertical: Spacing.four },
  list: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.three },
});
