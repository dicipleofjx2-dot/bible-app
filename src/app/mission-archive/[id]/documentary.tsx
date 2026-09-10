import * as Clipboard from 'expo-clipboard';
import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  getSubject,
  listAnswers,
  listAssets,
  listTestimonies,
  listTimeline,
  type MissionAnswer,
  type MissionAsset,
  type MissionSubject,
  type MissionTestimony,
  type MissionTimelineRow,
} from '@/db/missionArchive';
import { ChipRow, MissionCard, PrimaryButton } from '@/features/mission/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  VISIBILITY,
  buildDocumentaryScript,
  manuscriptToHtml,
  pickHighlights,
  type Visibility,
} from '@/lib/missionArchive';

/**
 * 다큐 스튜디오 (기획서 §11·§15).
 *
 * 영상을 자르지 않는다 — 자를 영상이 이 앱에 없다. 여기서 만드는 것은 **대본**
 * 이다: 어느 이야기가 장면이 되는지 고르고, 연표의 사실로 내레이션을 짓고,
 * 사역자 육성과 증언을 원문 그대로 나란히 붙인다.
 *
 * 내레이션에 형용사를 넣지 않는다. 「그는 두려웠다」는 아무도 한 적 없는 말이다.
 */
export default function MissionDocumentaryScreen() {
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ownerId = session?.user.id ?? null;

  const [subject, setSubject] = useState<MissionSubject | null>(null);
  const [answers, setAnswers] = useState<MissionAnswer[]>([]);
  const [timeline, setTimeline] = useState<MissionTimelineRow[]>([]);
  const [testimonies, setTestimonies] = useState<MissionTestimony[]>([]);
  const [assets, setAssets] = useState<MissionAsset[]>([]);
  const [level, setLevel] = useState<Visibility>('church');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!ownerId || !id) {
      setLoading(false);
      return;
    }
    try {
      const [one, answerList, rows, witnesses, files] = await Promise.all([
        getSubject(id),
        listAnswers(id),
        listTimeline(id),
        listTestimonies(id),
        listAssets(id),
      ]);
      setSubject(one);
      setAnswers(answerList);
      setTimeline(rows);
      setTestimonies(witnesses);
      setAssets(files);
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

  const script = useMemo(() => {
    if (!subject) return '';
    return buildDocumentaryScript(subject, answers, timeline, testimonies, assets, level);
  }, [subject, answers, timeline, testimonies, assets, level]);

  const highlights = useMemo(() => pickHighlights(answers), [answers]);

  function openPrintable() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      setMessage('인쇄본은 웹에서 만들 수 있습니다.');
      return;
    }
    const win = window.open('', '_blank');
    if (!win) {
      setMessage('새 창이 막혀 있습니다. 팝업을 허용해 주세요.');
      return;
    }
    win.document.write(manuscriptToHtml(script, `${subject?.name ?? '사역'} 다큐멘터리 대본`));
    win.document.close();
  }

  if (authLoading) return null;
  if (!session) return <Redirect href="/profile" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>다큐 스튜디오</ThemedText>

          {loading ? (
            <ActivityIndicator style={styles.loading} color={theme.accent} />
          ) : !subject ? (
            <ThemedText style={Type.body}>기록을 찾지 못했습니다.</ThemedText>
          ) : (
            <>
              <MissionCard>
                <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                  연표 {timeline.length}줄을 뼈대로, 인터뷰와 증언을 얹어 대본 초고를 만듭니다.
                  내레이션은 연표에 적힌 사실만으로 지었습니다 — 마음을 담은 문장은 사람이 쓰셔야
                  합니다.
                </ThemedText>
                <ChipRow
                  label="대본에 담을 범위"
                  options={VISIBILITY.filter((v) => v.id !== 'private').map((v) => ({ id: v.id, label: v.label }))}
                  value={level}
                  onChange={setLevel}
                />
              </MissionCard>

              {highlights.length > 0 ? (
                <MissionCard>
                  <ThemedText style={Type.itemTitle}>카메라 앞에 세울 만한 이야기 {highlights.length}가지</ThemedText>
                  {highlights.map((item) => (
                    <View key={item.key} style={styles.highlight}>
                      <ThemedText style={Type.itemDescription}>{item.question}</ThemedText>
                      <ThemedText themeColor="textSecondary" style={Type.caption}>
                        고른 이유: {item.reason}
                      </ThemedText>
                    </View>
                  ))}
                </MissionCard>
              ) : (
                <MissionCard>
                  <ThemedText style={Type.body}>
                    아직 장면으로 삼을 만한 이야기가 모이지 않았습니다. 인터뷰에 연도를 적고, 사역이
                    꺾였던 대목을 조금 더 말씀해 주시면 여기 모입니다.
                  </ThemedText>
                </MissionCard>
              )}

              <View style={styles.actions}>
                <PrimaryButton
                  label="대본 복사하기"
                  onPress={async () => {
                    await Clipboard.setStringAsync(script);
                    setMessage('대본을 복사했습니다.');
                  }}
                />
                {Platform.OS === 'web' ? (
                  <PrimaryButton label="인쇄용으로 열기" tone="quiet" onPress={openPrintable} />
                ) : null}
              </View>

              <MissionCard>
                <ThemedText style={Type.itemTitle}>대본 미리보기</ThemedText>
                <ThemedText selectable style={Type.reading}>
                  {script}
                </ThemedText>
              </MissionCard>
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
  highlight: { gap: 2, marginBottom: Spacing.one },
});
