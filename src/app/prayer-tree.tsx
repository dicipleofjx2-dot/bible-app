import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrayerMusicPlayer } from '@/components/PrayerMusicPlayer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  addTopic,
  deleteTopic,
  getPrayerPlaylist,
  getPrayerTree,
  prayForFruit,
  setFruitHarvested,
  setTopicAnswered,
  type PrayerFruit,
  type PrayerTopic,
} from '@/db/prayerTree';
import { hasPrayerLogToday } from '@/db/r2m';
import { FruitBox } from '@/features/prayer-tree/FruitBox';
import { PrayerCard } from '@/features/prayer-tree/PrayerCard';
import { TreeCanvas } from '@/features/prayer-tree/TreeCanvas';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { fruitLook, parsePrayerMusicUrl, prayedToday } from '@/lib/prayerTree';

/**
 * 중보기도 나무.
 *
 * 열매 하나가 기도 대상자 한 사람이고, 그 사람의 기도제목이 얼마나 응답됐는지에
 * 따라 열매가 자라고 익는다. 셈은 `@/lib/prayerTree` 에 있다.
 *
 * 나무 크기를 onLayout 으로 재지 않는다 — 창 너비에서 바로 계산한다. 이 앱의
 * 확인 환경에서는 onLayout 이 아예 안 오는 일이 있었다(HANDOFF 참고). 창
 * 너비는 언제나 있으므로 나무가 안 뜨는 일이 없다.
 */
export default function PrayerTreeScreen() {
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { width: windowWidth } = useWindowDimensions();

  const [fruits, setFruits] = useState<PrayerFruit[]>([]);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [openFruitId, setOpenFruitId] = useState<string | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  // R2M 「오늘의 훈련」의 기도 항목. 나무에서 기도하면 이것이 채워진다.
  const [trainedToday, setTrainedToday] = useState(false);

  const userId = session?.user.id ?? null;

  const load = useCallback(async () => {
    // 로그인 전에도 이 함수가 한 번 지난다. 그냥 돌아가면 돌림표가 영영 돌므로
    // 「불러올 것이 없다」로 끝맺는다.
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const [tree, playlist, prayed] = await Promise.all([
        getPrayerTree(userId),
        getPrayerPlaylist(userId).catch(() => ''),
        hasPrayerLogToday(userId).catch(() => false),
      ]);
      setFruits(tree);
      setPlaylistUrl(playlist);
      setTrainedToday(prayed);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '나무를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // 나무는 화면을 꽉 채우게 둔다 — 열매를 눌러야 하므로 크면 클수록 좋다.
  // 옆에 상자를 세우는 넓은 화면에서는 상자 몫(190 + 여백)을 덜어 낸다.
  const treeWidth =
    windowWidth >= 760
      ? Math.min(windowWidth - Spacing.two * 2 - 206, 620)
      : Math.min(windowWidth - Spacing.two * 2, 620);
  const music = useMemo(() => parsePrayerMusicUrl(playlistUrl), [playlistUrl]);
  const openFruit = fruits.find((f) => f.id === openFruitId) ?? null;

  // 딴 열매는 나무에서 내려와 상자로 간다. 상자는 **담은 차례대로** 쌓는다.
  const treeFruits = fruits.filter((f) => !f.harvested_at);
  const boxFruits = fruits
    .filter((f) => f.harvested_at)
    .sort((a, b) => (a.harvested_at ?? '').localeCompare(b.harvested_at ?? ''));
  // 다 익었는데 아직 안 딴 열매 — 나무 위에서 「딸 때가 됐다」를 알린다.
  const ripeOnTree = treeFruits.filter(
    (f) => fruitLook(f.topics.length, f.topics.filter((t) => t.answered).length).fullyRipe,
  );
  // 넓은 화면이면 나무 옆에, 좁으면 나무 아래에 상자를 둔다.
  const sideBySide = windowWidth >= 760;
  const boxWidth = sideBySide ? 190 : treeWidth;

  const totalTopics = fruits.reduce((sum, f) => sum + f.topics.length, 0);
  const totalAnswered = fruits.reduce(
    (sum, f) => sum + f.topics.filter((t) => t.answered).length,
    0,
  );
  const prayedTodayCount = fruits.filter((f) => prayedToday(f.last_prayed_at)).length;

  /**
   * 「이 사람을 위해 기도합니다」.
   *
   * 열매의 기도 기록과 R2M 오늘의 훈련이 서버의 한 함수 안에서 같이 올라간다
   * (0077). 화면은 그 결과를 받아 그리기만 한다.
   */
  async function handlePray() {
    if (!openFruitId) return;
    setBusy(true);
    try {
      const at = await prayForFruit(openFruitId);
      setFruits((prev) =>
        prev.map((f) =>
          f.id === openFruitId
            ? { ...f, last_prayed_at: at, prayed_count: f.prayed_count + 1 }
            : f,
        ),
      );
      setTrainedToday(true);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '기도 기록을 남기지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  /** 화면을 먼저 고치고 서버에 보낸다 — 체크 한 번에 나무가 바로 익어야 한다. */
  async function toggleAnswered(topic: PrayerTopic, answered: boolean) {
    setFruits((prev) =>
      prev.map((fruit) =>
        fruit.id !== topic.fruit_id
          ? fruit
          : {
              ...fruit,
              topics: fruit.topics.map((t) =>
                t.id === topic.id
                  ? { ...t, answered, answered_at: answered ? new Date().toISOString() : null }
                  : t,
              ),
            },
      ),
    );
    setBusy(true);
    try {
      await setTopicAnswered(topic.id, answered);
    } catch (e) {
      setError(e instanceof Error ? e.message : '응답 표시를 저장하지 못했어요.');
      await load(); // 서버가 거절했으면 화면을 서버 쪽으로 되돌린다
    } finally {
      setBusy(false);
    }
  }

  /**
   * 열매를 따서 상자에 담거나, 상자에서 나무로 되돌린다.
   *
   * 되돌릴 자리를 잃지 않으려고 pos_x/pos_y 는 건드리지 않는다 — 상자에 담긴
   * 동안에도 그대로 있어서 다시 걸면 원래 가지로 돌아간다.
   */
  async function handleHarvest(harvested: boolean) {
    if (!openFruitId) return;
    setBusy(true);
    try {
      const at = await setFruitHarvested(openFruitId, harvested);
      setFruits((prev) =>
        prev.map((f) => (f.id === openFruitId ? { ...f, harvested_at: at } : f)),
      );
      // 담은 뒤에는 카드를 닫는다 — 열매가 상자로 옮겨 간 것이 보여야 한다.
      if (harvested) setOpenFruitId(null);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '열매를 옮기지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddTopic(body: string) {
    if (!userId || !openFruitId) return;
    setBusy(true);
    try {
      await addTopic(userId, openFruitId, body);
      // 기도할 일이 새로 생긴 열매는 더 이상 「다 익은」 열매가 아니다.
      // 상자에 있었다면 조용히 나무로 되돌린다.
      const inBox = fruits.find((f) => f.id === openFruitId)?.harvested_at;
      if (inBox) await setFruitHarvested(openFruitId, false).catch(() => {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '기도제목을 넣지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTopic(topic: PrayerTopic) {
    setBusy(true);
    try {
      await deleteTopic(topic.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '기도제목을 지우지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  // 중보기도 내용은 그 사람만의 것이다. 로그인 없이 들어올 자리가 없다.
  if (!session) return <Redirect href="/profile" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inner}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.lead}>
            열매 하나가 기도하는 한 사람입니다. 응답이 쌓일수록 열매가 자라고 붉게 익어요.
          </ThemedText>

          <View style={styles.treeWrap}>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <View style={[styles.garden, sideBySide && styles.gardenRow]}>
                <TreeCanvas
                  width={treeWidth}
                  fruits={treeFruits}
                  onPressFruit={(fruit) => setOpenFruitId(fruit.id)}
                />
                <View style={{ width: boxWidth }}>
                  <ThemedText type="smallBold" style={styles.boxTitle}>
                    🧺 과일상자 {boxFruits.length}
                  </ThemedText>
                  <FruitBox
                    width={boxWidth}
                    fruits={boxFruits}
                    onPressFruit={(fruit) => setOpenFruitId(fruit.id)}
                  />
                </View>
              </View>
            )}
          </View>

          <View style={[styles.summary, { backgroundColor: theme.accentSoft }]}>
            <ThemedText type="smallBold" themeColor="accent">
              열매 {treeFruits.length} · 기도제목 {totalTopics} · 응답 {totalAnswered}
              {ripeOnTree.length > 0 ? ` · 딸 열매 ${ripeOnTree.length}` : ''}
            </ThemedText>
          </View>

          <Pressable
            onPress={() => router.push('/bible-reading')}
            style={[
              styles.training,
              {
                backgroundColor: trainedToday ? theme.done : theme.backgroundElement,
                borderColor: trainedToday ? theme.done : theme.border,
              },
            ]}>
            <ThemedText type="smallBold" style={trainedToday ? styles.trainingDoneText : undefined}>
              {trainedToday
                ? `오늘의 훈련 · 기도 ✓${prayedTodayCount > 0 ? ` (${prayedTodayCount}명)` : ''}`
                : '오늘의 훈련 · 기도 — 열매를 눌러 기도하면 채워져요'}
            </ThemedText>
          </Pressable>

          {!loading && fruits.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              아직 열매가 없어요. 아래 「열매 가꾸기」에서 기도할 사람을 심어 주세요.
            </ThemedText>
          ) : null}

          {error ? (
            <ThemedText type="small" themeColor="accent" style={styles.empty}>
              {error}
            </ThemedText>
          ) : null}

          <View style={styles.buttonRow}>
            <Pressable
              onPress={() => router.push('/prayer-tree/manage')}
              style={[styles.button, { backgroundColor: theme.accent }]}>
              <ThemedText type="smallBold" style={styles.buttonText}>
                🌱 열매 가꾸기
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setMusicOpen((v) => !v)}
              style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">{musicOpen ? '🎵 음악 접기' : '🎵 기도음악'}</ThemedText>
            </Pressable>
          </View>

          {musicOpen ? (
            music ? (
              <PrayerMusicPlayer embedUrl={music.embedUrl} />
            ) : (
              <Pressable
                onPress={() => router.push('/prayer-tree/manage')}
                style={[styles.musicEmpty, { borderColor: theme.border }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  아직 기도음악이 없어요. 「열매 가꾸기」에서 내 유튜브 재생목록 주소를 넣어 주세요 →
                </ThemedText>
              </Pressable>
            )
          ) : null}
        </View>
      </ScrollView>

      <PrayerCard
        fruit={openFruit}
        busy={busy}
        onClose={() => setOpenFruitId(null)}
        onToggleAnswered={toggleAnswered}
        onAddTopic={handleAddTopic}
        onDeleteTopic={handleDeleteTopic}
        onPray={handlePray}
        onHarvest={handleHarvest}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
    alignItems: 'center',
  },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignItems: 'center', gap: Spacing.two },
  lead: { textAlign: 'center' },
  treeWrap: { alignItems: 'center', justifyContent: 'center', minHeight: 120 },
  garden: { alignItems: 'center', gap: Spacing.two },
  gardenRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },
  boxTitle: { marginBottom: Spacing.one, textAlign: 'center' },
  training: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  trainingDoneText: { color: '#FFFFFF' },
  summary: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  empty: { textAlign: 'center', paddingHorizontal: Spacing.three },
  buttonRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
  },
  buttonText: { color: '#FFFFFF' },
  musicEmpty: {
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: Spacing.three,
  },
});
