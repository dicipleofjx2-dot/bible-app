import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { getWitnessPrompt, submitTestimony, type WitnessPrompt } from '@/db/missionArchive';
import { Field, MissionCard, PrimaryButton } from '@/features/mission/ui';
import { useTheme } from '@/hooks/use-theme';

/**
 * 증언 남기기 — **로그인 없이 여는 화면** (기획서 §10).
 *
 * 이 화면이 하는 일은 둘뿐이다: 물어볼 것을 받아 오고(mission_witness_prompt),
 * 답을 넣는다(mission_submit_testimony). 사역자의 기록은 한 줄도 읽지 않는다 —
 * 링크가 남의 손에 넘어가도 읽을 것이 없어야 하기 때문이다(0080).
 *
 * 이 화면만은 성경 저장소를 열지 않고 그린다(`_layout.tsx` 의 갈림길). 증언
 * 한 편 남기러 온 분에게 성경 데이터베이스를 내려받게 할 이유가 없다.
 */
export default function WitnessScreen() {
  const theme = useTheme();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [prompt, setPrompt] = useState<WitnessPrompt | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  // 「링크가 닫혔다」와 「지금 못 불러왔다」는 다른 말이다. 인터넷이 끊겼을 때
  // 링크가 닫혔다고 하면, 보내 주신 분께 괜히 다시 여쭙게 된다.
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setFailed(false);
    try {
      const found = await getWitnessPrompt(token);
      setPrompt(found);
      setAnswers(new Array(found?.questions.length ?? 0).fill(''));
      if (found) {
        setName(found.invitee_name);
        setRelation(found.relation);
      }
    } catch (e) {
      setFailed(true);
      setMessage(e instanceof Error ? e.message : '링크를 확인하지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!token || !prompt) return;
    const payload = prompt.questions
      .map((question, i) => ({ question, body: answers[i] ?? '' }))
      .filter((item) => item.body.trim().length > 0);
    if (payload.length === 0) {
      setMessage('한 가지라도 적어 주세요.');
      return;
    }
    setBusy(true);
    try {
      const count = await submitTestimony(token, name, relation, contact, payload);
      setDone(count);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '보내지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator style={styles.loading} color={theme.accent} />
          ) : done > 0 ? (
            <MissionCard>
              <ThemedText style={Type.screenTitle}>고맙습니다</ThemedText>
              <ThemedText style={Type.body}>
                증언 {done}가지를 잘 보냈습니다. 이 이야기는 사역 기록에 그대로 실립니다.
              </ThemedText>
            </MissionCard>
          ) : failed ? (
            <MissionCard>
              <ThemedText style={Type.screenTitle}>지금은 열지 못했습니다</ThemedText>
              <ThemedText style={Type.body}>
                인터넷 연결을 확인하시고 다시 시도해 주세요. 링크는 그대로 살아 있습니다.
              </ThemedText>
              <PrimaryButton
                label="다시 시도"
                onPress={() => {
                  setLoading(true);
                  load();
                }}
              />
            </MissionCard>
          ) : !prompt ? (
            <MissionCard>
              <ThemedText style={Type.screenTitle}>열 수 없는 링크입니다</ThemedText>
              <ThemedText style={Type.body}>
                링크가 닫혔거나 기한이 지났습니다. 보내 주신 분께 다시 여쭤봐 주세요.
              </ThemedText>
            </MissionCard>
          ) : (
            <>
              <ThemedText style={Type.screenTitle}>{prompt.subject_name} 사역 기록</ThemedText>
              <ThemedText themeColor="textSecondary" style={Type.body}>
                {prompt.note ||
                  `${prompt.subject_name}님의 사역을 한 권으로 남기고 있습니다. 기억하시는 이야기를 들려주시면 그대로 실립니다.`}
              </ThemedText>

              <MissionCard>
                <Field label="성함" value={name} onChangeText={setName} placeholder="예) 김권사" />
                <Field label="사역자와의 관계" value={relation} onChangeText={setRelation} placeholder="예) 개척 초기 성도" />
                <Field
                  label="연락처 (원하실 때만)"
                  value={contact}
                  onChangeText={setContact}
                  hint="더 여쭐 것이 있을 때에만 씁니다."
                />
              </MissionCard>

              {prompt.questions.map((question, i) => (
                <MissionCard key={`${question}-${i}`}>
                  <ThemedText style={Type.itemTitle}>{question}</ThemedText>
                  <Field
                    label=""
                    value={answers[i] ?? ''}
                    onChangeText={(v) =>
                      setAnswers((list) => {
                        const next = [...list];
                        next[i] = v;
                        return next;
                      })
                    }
                    multiline
                    placeholder="기억나는 대로 편하게 적어 주세요."
                  />
                </MissionCard>
              ))}

              <View style={styles.actions}>
                <PrimaryButton label={busy ? '보내는 중…' : '보내기'} onPress={submit} disabled={busy} />
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  보내신 글은 사역자만 볼 수 있습니다. 보내신 뒤에는 이 화면에서 다시 읽을 수 없으니,
                  고칠 것이 있으면 보내기 전에 살펴봐 주세요.
                </ThemedText>
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
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  loading: { marginVertical: Spacing.four },
  actions: { gap: Spacing.two },
});
