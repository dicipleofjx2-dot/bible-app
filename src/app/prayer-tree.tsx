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
  setTopicAnswered,
  type PrayerFruit,
  type PrayerTopic,
} from '@/db/prayerTree';
import { PrayerCard } from '@/features/prayer-tree/PrayerCard';
import { TreeCanvas } from '@/features/prayer-tree/TreeCanvas';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { parsePrayerMusicUrl } from '@/lib/prayerTree';

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

  const userId = session?.user.id ?? null;

  const load = useCallback(async () => {
    // 로그인 전에도 이 함수가 한 번 지난다. 그냥 돌아가면 돌림표가 영영 돌므로
    // 「불러올 것이 없다」로 끝맺는다.
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const [tree, playlist] = await Promise.all([
        getPrayerTree(userId),
        getPrayerPlaylist(userId).catch(() => ''),
      ]);
      setFruits(tree);
      setPlaylistUrl(playlist);
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

  const treeWidth = Math.min(windowWidth - Spacing.three * 2, MaxContentWidth * 0.6, 520);
  const music = useMemo(() => parsePrayerMusicUrl(playlistUrl), [playlistUrl]);
  const openFruit = fruits.find((f) => f.id === openFruitId) ?? null;

  const totalTopics = fruits.reduce((sum, f) => sum + f.topics.length, 0);
  const totalAnswered = fruits.reduce(
    (sum, f) => sum + f.topics.filter((t) => t.answered).length,
    0,
  );

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

  async function handleAddTopic(body: string) {
    if (!userId || !openFruitId) return;
    setBusy(true);
    try {
      await addTopic(userId, openFruitId, body);
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
              <TreeCanvas
                width={treeWidth}
                fruits={fruits}
                onPressFruit={(fruit) => setOpenFruitId(fruit.id)}
              />
            )}
          </View>

          <View style={[styles.summary, { backgroundColor: theme.accentSoft }]}>
            <ThemedText type="smallBold" themeColor="accent">
              열매 {fruits.length} · 기도제목 {totalTopics} · 응답 {totalAnswered}
            </ThemedText>
          </View>

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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    alignItems: 'center',
  },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignItems: 'center', gap: Spacing.two },
  lead: { textAlign: 'center' },
  treeWrap: { alignItems: 'center', justifyContent: 'center', minHeight: 120 },
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
