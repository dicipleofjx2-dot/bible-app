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
  saveChapter,
  type MissionAnswer,
  type MissionAsset,
  type MissionSubject,
  type MissionTestimony,
  type MissionTimelineRow,
} from '@/db/missionArchive';
import { ChipRow, MarkdownPreview, MissionCard, PrimaryButton } from '@/features/mission/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  CHAPTER_PRESET,
  VISIBILITY,
  buildManuscript,
  isAnswered,
  manuscriptToHtml,
  type Visibility,
} from '@/lib/missionArchive';

/**
 * 원고 편집실 (기획서 §11·§12).
 *
 * 여기서 하는 일은 **엮는 것**이지 짓는 것이 아니다. 말하지 않은 사건과 대사를
 * 만들어내지 않는다(§21.5). 1인칭 자서전·3인칭 평전 같은 문체 변환은 넣지
 * 않았다 — 규칙으로 한국어 문체를 바꾸면 사역자의 목소리가 망가진다. 지금은
 * 답한 그대로를 장별로 모으고, 근거와 연표를 함께 붙인다.
 *
 * 내보내는 범위(§14)를 고르게 한 것이 핵심이다. 「공개용」을 고르면 공개로
 * 표시한 답만 들어가고, 비공개는 어떤 원고에도 들어가지 않는다.
 */
export default function MissionManuscriptScreen() {
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ownerId = session?.user.id ?? null;

  const [subject, setSubject] = useState<MissionSubject | null>(null);
  const [answers, setAnswers] = useState<MissionAnswer[]>([]);
  const [timeline, setTimeline] = useState<MissionTimelineRow[]>([]);
  const [testimonies, setTestimonies] = useState<MissionTestimony[]>([]);
  const [assets, setAssets] = useState<MissionAsset[]>([]);
  const [level, setLevel] = useState<Visibility>('writer');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!ownerId || !id) {
      setLoading(false);
      return;
    }
    try {
      const [one, list, rows, witnesses, files] = await Promise.all([
        getSubject(id),
        listAnswers(id),
        listTimeline(id),
        listTestimonies(id),
        listAssets(id),
      ]);
      setSubject(one);
      setAnswers(list);
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

  const manuscript = useMemo(() => {
    if (!subject) return '';
    return buildManuscript(subject, answers, timeline, level, { testimonies, assets });
  }, [subject, answers, timeline, level, testimonies, assets]);

  async function copy() {
    await Clipboard.setStringAsync(manuscript);
    setMessage('원고를 복사했습니다. 한글·워드에 붙여 넣으세요.');
  }

  /**
   * 인쇄·전자책용 한 장짜리 HTML.
   *
   * EPUB(zip 묶음) 대신 이것을 만든 이유는 `lib/missionArchive.ts` 의
   * `manuscriptToHtml` 머리말에 적었다 — 브라우저 인쇄로 종이책 원고와 PDF가
   * 둘 다 나온다. 새 창에서 열어 바로 인쇄할 수 있게 한다.
   */
  function openPrintable() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      setMessage('인쇄본은 웹에서 만들 수 있습니다.');
      return;
    }
    const html = manuscriptToHtml(manuscript, `${subject?.name ?? '사역'} 사역 기록`);
    const win = window.open('', '_blank');
    if (!win) {
      setMessage('새 창이 막혀 있습니다. 팝업을 허용해 주세요.');
      return;
    }
    win.document.write(html);
    win.document.close();
  }

  /** 웹에서는 파일로 내려받게 한다. 폰에서는 복사만 — 파일 앱 왕복이 더 번거롭다. */
  function download() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      setMessage('폰에서는 「복사하기」를 쓰세요.');
      return;
    }
    const blob = new Blob([manuscript], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${subject?.name ?? '사역기록'}-원고.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 장별 초고를 표에 담는다.
   *
   * 사람이 고쳐 쓴 글을 덮어쓸 수 있으므로 「다시 엮기」는 늘 물어본 뒤에 한다.
   */
  async function saveDraft() {
    if (!ownerId || !id || !subject) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (!window.confirm('지금 답변으로 장별 초고를 다시 만들어 저장할까요? 고쳐 둔 초고가 있으면 덮어씁니다.')) return;
    }
    setBusy(true);
    try {
      for (const chapter of CHAPTER_PRESET) {
        const used = chapter.keys.filter((key) =>
          answers.some((a) => a.question_key === key && isAnswered(a.body)),
        );
        if (used.length === 0 && chapter.ord !== 0) continue;
        const body = buildManuscript(
          subject,
          answers.filter((a) => chapter.keys.includes(a.question_key)),
          [],
          level,
        );
        await saveChapter(ownerId, id, {
          ord: chapter.ord,
          title: chapter.title,
          body,
          source_keys: used,
        });
      }
      setMessage('장별 초고를 저장했습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!session) return <Redirect href="/profile" />;

  const answered = answers.filter((a) => isAnswered(a.body)).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>원고 편집실</ThemedText>

          {loading ? (
            <ActivityIndicator style={styles.loading} color={theme.accent} />
          ) : !subject ? (
            <ThemedText style={Type.body}>기록을 찾지 못했습니다.</ThemedText>
          ) : (
            <>
              <MissionCard>
                <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                  답한 질문 {answered}개, 연표 {timeline.length}줄, 증언 {testimonies.length}건, 자료{' '}
                  {assets.length}건으로 초고를 엮습니다. 말하지 않은 사건은 넣지 않고, 서로 다른 증언은
                  합치지 않고 나란히 싣습니다.
                </ThemedText>
                <ChipRow
                  label="내보낼 범위"
                  options={VISIBILITY.filter((v) => v.id !== 'private').map((v) => ({ id: v.id, label: v.label }))}
                  value={level}
                  onChange={setLevel}
                />
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  비공개로 표시한 이야기는 어떤 원고에도 들어가지 않습니다.
                </ThemedText>
              </MissionCard>

              <View style={styles.actions}>
                <PrimaryButton label="복사하기" onPress={copy} />
                {Platform.OS === 'web' ? (
                  <>
                    <PrimaryButton label="인쇄·전자책용으로 열기" tone="quiet" onPress={openPrintable} />
                    <PrimaryButton label="원고 파일로 내려받기 (.md)" tone="quiet" onPress={download} />
                  </>
                ) : null}
                <PrimaryButton label={busy ? '저장 중…' : '장별 초고 저장'} tone="quiet" onPress={saveDraft} disabled={busy} />
              </View>

              <MissionCard>
                <ThemedText style={Type.itemTitle}>미리보기</ThemedText>
                <MarkdownPreview text={manuscript} />
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
});
