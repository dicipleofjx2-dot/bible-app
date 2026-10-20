import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  addTimelineRow,
  assetSignedUrl,
  getSubject,
  listAnswers,
  removeAnswerAudio,
  saveAnswer,
  uploadAnswerAudio,
  type MissionAnswer,
  type MissionSubject,
} from '@/db/missionArchive';
import { ChipRow, Field, MissionCard, PrimaryButton } from '@/features/mission/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { createDictation } from '@/lib/dictation';
import {
  FACT_STATUS,
  VISIBILITY,
  axisLabel,
  followUps,
  answered,
  questionsFor,
  toTimelineDraft,
  type FactStatus,
  type Visibility,
} from '@/lib/missionArchive';

type Draft = {
  body: string;
  year: string;
  place: string;
  people: string;
  evidence: string;
  fact: FactStatus;
  visibility: Visibility;
  /** 녹음 원본(비공개 통 안의 경로, 0082). 글로 옮겨도 지우지 않는다. */
  audioPath: string | null;
  audioSeconds: number | null;
};

const EMPTY: Draft = {
  body: '',
  year: '',
  place: '',
  people: '',
  evidence: '',
  fact: 'self',
  visibility: 'church',
  audioPath: null,
  audioSeconds: null,
};

function draftFrom(answer: MissionAnswer | undefined): Draft {
  if (!answer) return EMPTY;
  return {
    body: answer.body,
    year: answer.year ? String(answer.year) : '',
    place: answer.place,
    people: answer.people,
    evidence: answer.evidence,
    fact: answer.fact_status,
    visibility: answer.visibility,
    audioPath: answer.audio_path,
    audioSeconds: answer.audio_seconds,
  };
}

/** 00:42 처럼. 녹음 중에 시간이 안 보이면 얼마나 말했는지 가늠이 안 된다. */
function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * AI 사역 인터뷰 (기획서 §7).
 *
 * 질문 하나를 한 화면에 크게 두고, 답을 적는 동안 **꼬리질문이 옆에서 자란다.**
 * 꼬리질문은 규칙으로 만든다 — 모델을 부르지 않는 이유는 `lib/missionArchive.ts`
 * 머리말에 적어 두었다(선교지 보안).
 *
 * 답을 저장할 때 「무엇으로 확인된 이야기인지」와 「어디까지 내보내도 되는지」를
 * 함께 받는다. 나중에 원고를 뽑을 때 이 두 값이 없으면, 확인되지 않은 이야기와
 * 밖에 나가면 안 되는 이야기가 그대로 책이 된다.
 */
export default function MissionInterviewScreen() {
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ownerId = session?.user.id ?? null;

  const [subject, setSubject] = useState<MissionSubject | null>(null);
  const [answers, setAnswers] = useState<MissionAnswer[]>([]);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const questions = useMemo(() => questionsFor(subject?.role ?? 'pastor'), [subject?.role]);
  const current = questions[Math.min(index, Math.max(questions.length - 1, 0))] ?? null;

  // ── 녹음 ────────────────────────────────────────────────────────────
  // 은퇴를 앞둔 사역자에게 한 시간짜리 이야기를 타자로 치게 할 수는 없다.
  // 말로 받고, 웹에서는 브라우저 받아쓰기로 글까지 같이 받는다. **받아쓴 글이
  // 틀려도 원본 음성은 남는다**(0082).
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 500);
  const player = useAudioPlayer();
  // 받아쓰기 도구는 화면이 사는 동안 하나면 된다. 새로 만들면 말하던 중에 끊긴다.
  const dictationRef = useRef(createDictation());
  const dictation = dictationRef.current;
  const [dictationOn, setDictationOn] = useState(dictation.supported);
  const [audioBusy, setAudioBusy] = useState(false);

  const load = useCallback(async () => {
    if (!ownerId || !id) {
      setLoading(false);
      return;
    }
    try {
      const [one, list] = await Promise.all([getSubject(id), listAnswers(id)]);
      setSubject(one);
      setAnswers(list);

      // 처음 열 때는 아직 답하지 않은 첫 질문으로 간다. 매번 1번부터 다시
      // 넘기게 하면 서른 몇 개짜리 질문지를 매일 처음부터 훑어야 한다.
      const all = questionsFor(one?.role ?? 'pastor');
      const done = new Set(list.filter(answered).map((a) => a.question_key));
      const firstOpen = all.findIndex((q) => !done.has(q.key));
      const start = firstOpen === -1 ? 0 : firstOpen;
      setIndex(start);
      setDraft(draftFrom(list.find((a) => a.question_key === all[start]?.key)));
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

  function goTo(nextIndex: number) {
    const clamped = Math.max(0, Math.min(questions.length - 1, nextIndex));
    setIndex(clamped);
    setDraft(draftFrom(answers.find((a) => a.question_key === questions[clamped].key)));
    setMessage('');
  }

  const tails = useMemo(
    () =>
      followUps(draft.body, {
        year: draft.year ? Number(draft.year) : null,
        place: draft.place,
        people: draft.people,
        evidence: draft.evidence,
      }),
    [draft],
  );

  /** 지금 화면에 있는 것을 그대로 담은 저장 꾸러미. 녹음 쪽에서도 같은 것을 쓴다. */
  function payload(overrides: Partial<{ audio_path: string | null; audio_seconds: number | null }> = {}) {
    return {
      axis: current!.axis,
      question_key: current!.key,
      question: current!.text,
      body: draft.body,
      year: draft.year ? Number(draft.year) : null,
      place: draft.place,
      people: draft.people,
      evidence: draft.evidence,
      fact_status: draft.fact,
      visibility: draft.visibility,
      audio_path: draft.audioPath,
      audio_seconds: draft.audioSeconds,
      ...overrides,
    };
  }

  async function startRecording() {
    setMessage('');
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setMessage('마이크를 쓸 수 없습니다. 브라우저나 폰 설정에서 마이크를 허용해 주세요.');
        return;
      }
      // 아이폰은 이걸 안 켜면 무음 스위치가 올라가 있을 때 녹음이 비어서 나온다.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();

      if (dictationOn && dictation.supported) {
        dictation.start({
          // 중간 결과는 흘려보내고 확정된 것만 붙인다 — 중간 것까지 넣으면
          // 같은 말이 여러 번 쌓인다.
          onText: (text, isFinal) => {
            if (!isFinal) return;
            const piece = text.trim();
            if (!piece) return;
            setDraft((d) => ({ ...d, body: d.body ? `${d.body.trimEnd()} ${piece}` : piece }));
          },
          onError: (m) => setMessage(m),
        });
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '녹음을 시작하지 못했어요.');
    }
  }

  /**
   * 녹음을 멈추고 **바로 저장한다.**
   *
   * 여기서 저장하지 않으면, 말씀은 다 하시고 저장 단추를 안 누른 채 화면을
   * 나가는 순간 그 한 시간이 사라진다. 녹음은 다시 못 듣는다.
   */
  async function stopRecording() {
    dictation.stop();
    setAudioBusy(true);
    try {
      const seconds = Math.round((recorderState.durationMillis ?? 0) / 1000);
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri || !ownerId || !id || !current) {
        setMessage('녹음이 비어 있습니다.');
        return;
      }
      const { path, error } = await uploadAnswerAudio(ownerId, uri);
      if (error || !path) {
        setMessage(error ?? '녹음을 올리지 못했어요.');
        return;
      }
      await saveAnswer(ownerId, id, payload({ audio_path: path, audio_seconds: seconds }));
      setDraft((d) => ({ ...d, audioPath: path, audioSeconds: seconds }));
      setAnswers(await listAnswers(id));
      setMessage('녹음을 저장했습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '녹음을 멈추지 못했어요.');
    } finally {
      setAudioBusy(false);
    }
  }

  async function playRecording() {
    if (!draft.audioPath) return;
    const url = await assetSignedUrl(draft.audioPath);
    if (!url) {
      setMessage('녹음을 열지 못했어요.');
      return;
    }
    player.replace({ uri: url });
    player.play();
  }

  async function dropRecording() {
    if (!draft.audioPath || !ownerId || !id || !current) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (!window.confirm('녹음을 지울까요? 다시 들을 수 없습니다.')) return;
    }
    const path = draft.audioPath;
    setAudioBusy(true);
    try {
      await saveAnswer(ownerId, id, payload({ audio_path: null, audio_seconds: null }));
      await removeAnswerAudio(path);
      setDraft((d) => ({ ...d, audioPath: null, audioSeconds: null }));
      setAnswers(await listAnswers(id));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '지우지 못했어요.');
    } finally {
      setAudioBusy(false);
    }
  }

  async function save(advance: boolean) {
    if (!ownerId || !id || !current) return;
    setBusy(true);
    try {
      await saveAnswer(ownerId, id, payload());
      const list = await listAnswers(id);
      setAnswers(list);
      if (advance && index < questions.length - 1) {
        const nextIndex = index + 1;
        setIndex(nextIndex);
        setDraft(draftFrom(list.find((a) => a.question_key === questions[nextIndex].key)));
        setMessage('');
      } else {
        setMessage('저장했습니다.');
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  /** 이 답을 연표 한 줄로 옮긴다. 연도를 모르면 놓을 자리가 없어 막는다. */
  async function toTimeline() {
    if (!ownerId || !id || !current) return;
    const saved = answers.find((a) => a.question_key === current.key);
    if (!saved) {
      setMessage('먼저 답을 저장해 주세요.');
      return;
    }
    const row = toTimelineDraft(saved);
    if (!row) {
      setMessage('연도를 적어야 연표에 놓을 수 있습니다.');
      return;
    }
    setBusy(true);
    try {
      await addTimelineRow(ownerId, id, { ...row, fact_status: saved.fact_status });
      setMessage('연표에 한 줄 넣었습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '넣지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!session) return <Redirect href="/profile" />;

  const answeredCount = answers.filter(answered).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading || !current ? (
            <ActivityIndicator style={styles.loading} color={theme.accent} />
          ) : (
            <>
              <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>
                {axisLabel(current.axis)} · {index + 1}/{questions.length} · 답한 질문 {answeredCount}개
              </ThemedText>

              <MissionCard>
                <ThemedText style={Type.screenTitle}>{current.text}</ThemedText>
                <Field
                  label="말씀해 주신 그대로"
                  value={draft.body}
                  onChangeText={(v) => setDraft({ ...draft, body: v })}
                  placeholder="편하게 말하듯 적어 주세요. 문장을 다듬는 일은 나중에 합니다."
                  multiline
                />
              </MissionCard>

              {/* 녹음 — 글보다 말이 먼저인 분들을 위한 자리 */}
              <MissionCard style={recorderState.isRecording ? { borderColor: theme.accent } : undefined}>
                <View style={styles.recordHead}>
                  <ThemedText style={Type.itemTitle}>
                    {recorderState.isRecording ? '● 녹음 중' : '🎤 말로 답하기'}
                  </ThemedText>
                  {recorderState.isRecording ? (
                    <ThemedText style={[Type.itemTitle, { color: theme.accent }]}>
                      {clock((recorderState.durationMillis ?? 0) / 1000)}
                    </ThemedText>
                  ) : null}
                </View>

                <PrimaryButton
                  label={
                    audioBusy
                      ? '저장 중…'
                      : recorderState.isRecording
                        ? '■ 멈추고 저장하기'
                        : draft.audioPath
                          ? '다시 녹음하기'
                          : '녹음 시작'
                  }
                  onPress={recorderState.isRecording ? stopRecording : startRecording}
                  disabled={audioBusy}
                />

                {dictation.supported ? (
                  <Pressable onPress={() => setDictationOn((v) => !v)} disabled={recorderState.isRecording}>
                    <ThemedText style={[Type.body, { color: dictationOn ? theme.accent : theme.textSecondary }]}>
                      {dictationOn ? '✓ 말하는 대로 글도 받아 적기' : '○ 말하는 대로 글도 받아 적기'}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    이 기기에서는 받아쓰기가 안 됩니다. 녹음만 남기고, 글은 나중에 옮기셔도 됩니다.
                  </ThemedText>
                )}

                {draft.audioPath ? (
                  <View style={styles.recordRow}>
                    <Pressable onPress={playRecording} disabled={audioBusy}>
                      <ThemedText style={[Type.body, { color: theme.accent }]}>
                        ▶ 들어보기{draft.audioSeconds ? ` (${clock(draft.audioSeconds)})` : ''}
                      </ThemedText>
                    </Pressable>
                    <Pressable onPress={() => player.pause()}>
                      <ThemedText style={[Type.body, { color: theme.textSecondary }]}>‖ 멈춤</ThemedText>
                    </Pressable>
                    <Pressable onPress={dropRecording} disabled={audioBusy}>
                      <ThemedText style={[Type.body, { color: theme.accent }]}>녹음 지우기</ThemedText>
                    </Pressable>
                  </View>
                ) : null}

                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  {dictationOn && dictation.supported
                    ? '받아쓴 글은 초안입니다. 틀린 곳은 위 칸에서 고치세요 — 원본 음성은 그대로 남습니다.'
                    : '원본 음성은 지우지 않습니다. 글을 고쳐도 목소리는 남습니다.'}
                  {subject?.security_mode
                    ? ' 보안 지역 이야기는 받아쓰기를 끄고 녹음만 남기시는 편이 안전합니다.'
                    : ''}
                </ThemedText>
              </MissionCard>

              {tails.length > 0 ? (
                <MissionCard style={{ borderColor: theme.accent }}>
                  <ThemedText style={Type.itemTitle}>이어서 여쭙습니다</ThemedText>
                  {tails.map((tail) => (
                    <ThemedText key={tail.key} style={Type.body}>
                      · {tail.text}
                    </ThemedText>
                  ))}
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    답 안에 이어 적으셔도 되고, 아래 칸에 따로 적으셔도 됩니다.
                  </ThemedText>
                </MissionCard>
              ) : null}

              <MissionCard>
                <Field
                  label="연도"
                  value={draft.year}
                  onChangeText={(v) => setDraft({ ...draft, year: v.replace(/[^0-9]/g, '').slice(0, 4) })}
                  placeholder="예) 2001"
                  keyboardType="number-pad"
                />
                <Field label="장소" value={draft.place} onChangeText={(v) => setDraft({ ...draft, place: v })} />
                <Field label="관련 인물" value={draft.people} onChangeText={(v) => setDraft({ ...draft, people: v })} />
                <Field
                  label="근거 자료"
                  value={draft.evidence}
                  onChangeText={(v) => setDraft({ ...draft, evidence: v })}
                  placeholder="사진, 주보, 편지, 증언해 줄 분"
                />
                <ChipRow
                  label="무엇으로 확인된 이야기입니까"
                  options={FACT_STATUS.map((f) => ({ id: f.id, label: f.short }))}
                  value={draft.fact}
                  onChange={(v) => setDraft({ ...draft, fact: v })}
                />
                <ChipRow
                  label="어디까지 내보내도 됩니까"
                  options={VISIBILITY.map((v) => ({ id: v.id, label: v.label }))}
                  value={draft.visibility}
                  onChange={(v) => setDraft({ ...draft, visibility: v })}
                />
              </MissionCard>

              <View style={styles.actions}>
                <PrimaryButton label={busy ? '저장 중…' : '저장하고 다음 질문'} onPress={() => save(true)} disabled={busy} />
                <PrimaryButton label="저장만 하기" tone="quiet" onPress={() => save(false)} disabled={busy} />
                <PrimaryButton label="이 답을 연표에 넣기" tone="quiet" onPress={toTimeline} disabled={busy} />
              </View>

              <View style={styles.nav}>
                <View style={styles.navItem}>
                  <PrimaryButton label="← 앞 질문" tone="quiet" onPress={() => goTo(index - 1)} disabled={index === 0} />
                </View>
                <View style={styles.navItem}>
                  <PrimaryButton
                    label="건너뛰기 →"
                    tone="quiet"
                    onPress={() => goTo(index + 1)}
                    disabled={index >= questions.length - 1}
                  />
                </View>
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
  actions: { gap: Spacing.two },
  recordHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordRow: { flexDirection: 'row', gap: Spacing.three, flexWrap: 'wrap' },
  nav: { flexDirection: 'row', gap: Spacing.two },
  navItem: { flex: 1 },
});
