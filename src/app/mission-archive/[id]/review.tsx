import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  listAnswers,
  listAssets,
  listTestimonies,
  saveAnswer,
  updateAsset,
  type MissionAnswer,
  type MissionAsset,
  type MissionTestimony,
} from '@/db/missionArchive';
import { ChipRow, MissionCard } from '@/features/mission/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  FACT_STATUS,
  VISIBILITY,
  factLabel,
  isAnswered,
  visibilityLabel,
  type FactStatus,
  type Visibility,
} from '@/lib/missionArchive';

/**
 * 사실 검토실 (기획서 §13·§14).
 *
 * 인터뷰·자료·증언에 매겨 둔 「무엇으로 확인됐는가」와 「어디까지 내보내도
 * 되는가」를 한자리에서 훑는다. 원고를 뽑기 전에 이 화면을 한 번 지나야
 * **확인되지 않은 이야기가 확인된 것처럼** 책이 되는 일을 막는다.
 *
 * 확인이 필요한 것부터 위로 올린다 — 다 지나간 뒤에야 「연도 확인 필요」가
 * 스무 개 남아 있는 것을 발견하면 늦다.
 */
const NEEDS_ATTENTION: FactStatus[] = ['need_year', 'conflict', 'review'];

export default function MissionReviewScreen() {
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ownerId = session?.user.id ?? null;

  const [answers, setAnswers] = useState<MissionAnswer[]>([]);
  const [assets, setAssets] = useState<MissionAsset[]>([]);
  const [testimonies, setTestimonies] = useState<MissionTestimony[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!ownerId || !id) {
      setLoading(false);
      return;
    }
    try {
      const [answerList, assetList, testimonyList] = await Promise.all([
        listAnswers(id),
        listAssets(id),
        listTestimonies(id),
      ]);
      setAnswers(answerList.filter((a) => isAnswered(a.body)));
      setAssets(assetList);
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

  const sorted = useMemo(() => {
    const weight = (status: FactStatus) => (NEEDS_ATTENTION.includes(status) ? 0 : 1);
    return [...answers].sort((a, b) => weight(a.fact_status) - weight(b.fact_status));
  }, [answers]);

  const counts = useMemo(() => {
    const attention = answers.filter((a) => NEEDS_ATTENTION.includes(a.fact_status)).length;
    const hidden = answers.filter((a) => a.visibility === 'private' || a.visibility === 'writer').length;
    return { attention, hidden };
  }, [answers]);

  async function run(job: () => Promise<void>) {
    setBusy(true);
    try {
      await job();
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '바꾸지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  function patchAnswer(answer: MissionAnswer, patch: { fact?: FactStatus; visibility?: Visibility }) {
    if (!ownerId || !id) return;
    run(() =>
      saveAnswer(ownerId, id, {
        axis: answer.axis,
        question_key: answer.question_key,
        question: answer.question,
        body: answer.body,
        year: answer.year,
        place: answer.place,
        people: answer.people,
        evidence: answer.evidence,
        fact_status: patch.fact ?? answer.fact_status,
        visibility: patch.visibility ?? answer.visibility,
      }),
    );
  }

  if (authLoading) return null;
  if (!session) return <Redirect href="/profile" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>사실 검토실</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            확인이 필요한 {counts.attention}건이 위에 있습니다. 원고에서 빠지는 이야기는{' '}
            {counts.hidden}건입니다.
          </ThemedText>

          {loading ? (
            <ActivityIndicator style={styles.loading} color={theme.accent} />
          ) : (
            <View style={styles.list}>
              {sorted.map((answer) => (
                <MissionCard
                  key={answer.id}
                  style={
                    NEEDS_ATTENTION.includes(answer.fact_status) ? { borderColor: theme.accent } : undefined
                  }>
                  <ThemedText style={Type.itemTitle}>{answer.question}</ThemedText>
                  <ThemedText themeColor="textSecondary" style={Type.itemDescription} numberOfLines={3}>
                    {answer.body}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    {factLabel(answer.fact_status)} · {visibilityLabel(answer.visibility)}
                    {answer.evidence ? ` · 근거: ${answer.evidence}` : ' · 근거 없음'}
                  </ThemedText>
                  <ChipRow
                    options={FACT_STATUS.map((f) => ({ id: f.id, label: f.short }))}
                    value={answer.fact_status}
                    onChange={(v) => patchAnswer(answer, { fact: v })}
                  />
                  <ChipRow
                    options={VISIBILITY.map((v) => ({ id: v.id, label: v.label }))}
                    value={answer.visibility}
                    onChange={(v) => patchAnswer(answer, { visibility: v })}
                  />
                </MissionCard>
              ))}

              {assets.length > 0 ? (
                <>
                  <ThemedText style={Type.itemTitle}>자료 {assets.length}건</ThemedText>
                  {assets.map((asset) => (
                    <MissionCard key={asset.id}>
                      <ThemedText style={Type.itemTitle}>{asset.title || '(제목 없음)'}</ThemedText>
                      <ChipRow
                        options={VISIBILITY.map((v) => ({ id: v.id, label: v.label }))}
                        value={asset.visibility}
                        onChange={(v) => run(() => updateAsset(asset.id, { visibility: v }))}
                      />
                    </MissionCard>
                  ))}
                </>
              ) : null}

              {testimonies.length > 0 ? (
                <MissionCard>
                  <ThemedText style={Type.itemTitle}>증언 {testimonies.length}건</ThemedText>
                  <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                    아직 읽지 않은 증언 {testimonies.filter((t) => !t.reviewed).length}건. 공개 범위는
                    「동역자 증언」 화면에서 정합니다.
                  </ThemedText>
                </MissionCard>
              ) : null}
            </View>
          )}

          {busy ? <ActivityIndicator color={theme.accent} /> : null}
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
});
