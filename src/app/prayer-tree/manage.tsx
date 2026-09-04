import * as ImagePicker from 'expo-image-picker';
import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
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
  createFruit,
  deleteFruit,
  deleteTopic,
  fruitPhotoUrl,
  getPrayerPlaylist,
  getPrayerTree,
  removeFruitPhoto,
  setFruitHarvested,
  setPrayerPlaylist,
  setTopicAnswered,
  updateFruit,
  uploadFruitPhoto,
  type PrayerFruit,
} from '@/db/prayerTree';
import { TreeCanvas } from '@/features/prayer-tree/TreeCanvas';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { lastPrayedLabel, parsePrayerMusicUrl, ripenessLabel } from '@/lib/prayerTree';
import { buildTree } from '@/lib/treeShape';

/**
 * 새 열매를 심을 자리.
 *
 * 심을 때마다 자리를 물으면 열매 하나 넣는 데 두 걸음이 된다. 나무를 만들 때
 * 함께 골라 둔 **가지 끝**을 차례로 쓰고(왕관 전체에 흩어져 있다), 마음에 안
 * 들면 나무를 눌러 옮긴다. 자리를 다 쓰면 살짝 흔들어 겹치지 않게 둔다.
 */
function nextSpot(count: number): { x: number; y: number } {
  const spots = buildTree().fruitSpots;
  if (spots.length === 0) return { x: 0.5, y: 0.3 };
  const base = spots[count % spots.length];
  const round = Math.floor(count / spots.length);
  const jitter = round === 0 ? 0 : ((round % 2 === 0 ? 1 : -1) * 0.03 * round) % 0.12;
  return {
    x: Math.min(0.95, Math.max(0.05, base.x + jitter)),
    y: Math.min(0.66, Math.max(0.05, base.y + jitter)),
  };
}

/** 웹에는 Alert.alert 확인 대화상자가 없다(버튼이 안 뜨고 그냥 지나간다). */
function confirmDelete(message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(
      typeof window !== 'undefined' ? window.confirm(message) : true,
    );
  }
  return new Promise((resolve) => {
    Alert.alert('확인', message, [
      { text: '취소', style: 'cancel', onPress: () => resolve(false) },
      { text: '지우기', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export default function PrayerTreeManageScreen() {
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { width: windowWidth } = useWindowDimensions();

  const [fruits, setFruits] = useState<PrayerFruit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newMemo, setNewMemo] = useState('');
  const [topicDraft, setTopicDraft] = useState('');
  const [playlistDraft, setPlaylistDraft] = useState('');
  const [savedPlaylist, setSavedPlaylist] = useState('');

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
      setSavedPlaylist(playlist);
      setPlaylistDraft((draft) => (draft ? draft : playlist));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const treeWidth = Math.min(windowWidth - Spacing.three * 2, 520);
  const selected = fruits.find((f) => f.id === selectedId) ?? null;
  // 딴 열매는 나무에 없다(상자에 있다). 여기서도 나무에는 안 그린다.
  const treeFruits = fruits.filter((f) => !f.harvested_at);
  const music = useMemo(() => parsePrayerMusicUrl(savedPlaylist), [savedPlaylist]);
  const draftMusic = useMemo(() => parsePrayerMusicUrl(playlistDraft), [playlistDraft]);

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

  async function handleAddFruit() {
    const name = newName.trim();
    if (!userId || !name) return;
    const spot = nextSpot(fruits.length);
    await run(async () => {
      const id = await createFruit(userId, {
        name,
        memo: newMemo.trim(),
        pos_x: spot.x,
        pos_y: spot.y,
      });
      setSelectedId(id);
      setNewName('');
      setNewMemo('');
      setMessage(`${name} 열매를 심었어요. 나무를 눌러 자리를 옮길 수 있어요.`);
    }, '열매를 심지 못했어요.');
  }

  /** 나무를 누른 자리로 고른 열매를 옮긴다 — 위치 지정은 이 한 동작뿐이다. */
  async function handleMove(x: number, y: number) {
    if (!selected) {
      setMessage('먼저 아래에서 옮길 열매를 골라 주세요.');
      return;
    }
    // 화면을 먼저 옮겨 둔다. 서버를 기다리면 누른 자리에 안 붙는 것처럼 보인다.
    setFruits((prev) =>
      prev.map((f) => (f.id === selected.id ? { ...f, pos_x: x, pos_y: y, harvested_at: null } : f)),
    );
    const wasInBox = !!selected.harvested_at;
    await run(async () => {
      await updateFruit(selected.id, { pos_x: x, pos_y: y });
      // 상자에 있던 열매를 나무에 놓았다면 그건 「다시 걸기」다.
      if (wasInBox) await setFruitHarvested(selected.id, false);
    }, '자리를 저장하지 못했어요.');
  }

  async function handlePickPhoto(fruit: PrayerFruit) {
    if (!userId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage('사진 접근을 허용해 주세요.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (picked.canceled || !picked.assets[0]) return;

    const asset = picked.assets[0];
    setBusy(true);
    const { path, error } = await uploadFruitPhoto(userId, asset.uri, asset.mimeType);
    setBusy(false);
    if (error || !path) {
      setMessage(error ?? '사진을 올리지 못했어요.');
      return;
    }
    const previous = fruit.photo_path;
    await run(async () => {
      await updateFruit(fruit.id, { photo_path: path });
      if (previous) await removeFruitPhoto(previous);
    }, '사진을 저장하지 못했어요.');
  }

  async function handleDeleteFruit(fruit: PrayerFruit) {
    const ok = await confirmDelete(`${fruit.name} 열매와 기도제목을 모두 지울까요?`);
    if (!ok) return;
    await run(async () => {
      await deleteFruit(fruit.id, fruit.photo_path);
      setSelectedId(null);
    }, '열매를 지우지 못했어요.');
  }

  async function handleSavePlaylist() {
    if (!userId) return;
    const url = playlistDraft.trim();
    if (url && !parsePrayerMusicUrl(url)) {
      setMessage('유튜브 재생목록 주소를 알아보지 못했어요. (youtube.com/playlist?list=… 형태)');
      return;
    }
    await run(async () => {
      await setPrayerPlaylist(userId, url);
      setMessage(url ? '기도음악을 저장했어요.' : '기도음악을 비웠어요.');
    }, '기도음악을 저장하지 못했어요.');
  }

  if (authLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }
  if (!session) return <Redirect href="/profile" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.lead}>
            열매를 하나 고른 뒤 나무를 누르면 그 자리로 옮겨집니다.
          </ThemedText>

          <View style={styles.treeWrap}>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <TreeCanvas
                width={treeWidth}
                fruits={treeFruits}
                selectedId={selectedId}
                onPressFruit={(fruit) => setSelectedId(fruit.id)}
                onPressCanvas={handleMove}
              />
            )}
          </View>

          {message ? (
            <ThemedText type="small" themeColor="accent" style={styles.lead}>
              {message}
            </ThemedText>
          ) : null}

          {/* ── 열매 심기 ─────────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="subtitle">🌱 열매 심기</ThemedText>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="기도할 사람 이름"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
            <TextInput
              value={newMemo}
              onChangeText={setNewMemo}
              placeholder="한 줄 메모 (선택)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
            <Pressable
              onPress={handleAddFruit}
              disabled={busy || !newName.trim()}
              style={[
                styles.primaryButton,
                { backgroundColor: theme.accent, opacity: busy || !newName.trim() ? 0.5 : 1 },
              ]}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                나무에 심기
              </ThemedText>
            </Pressable>
          </View>

          {/* ── 열매 목록 ─────────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="subtitle">🍎 열매 {fruits.length}</ThemedText>
            {fruits.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                아직 심은 열매가 없어요.
              </ThemedText>
            ) : (
              fruits.map((fruit) => {
                const answered = fruit.topics.filter((t) => t.answered).length;
                const photo = fruitPhotoUrl(fruit.photo_path);
                const isSelected = fruit.id === selectedId;
                return (
                  <Pressable
                    key={fruit.id}
                    onPress={() => setSelectedId(isSelected ? null : fruit.id)}
                    style={[
                      styles.fruitRow,
                      {
                        borderColor: isSelected ? theme.accent : theme.border,
                        backgroundColor: isSelected ? theme.accentSoft : 'transparent',
                      },
                    ]}>
                    <View style={styles.fruitRowHead}>
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.thumb} />
                      ) : (
                        <View style={[styles.thumb, { backgroundColor: theme.accentSoft }]} />
                      )}
                      <View style={styles.fruitRowText}>
                        <ThemedText type="smallBold">{fruit.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {fruit.harvested_at ? '🧺 과일상자에 담김 · ' : ''}
                          {ripenessLabel(fruit.topics.length, answered)} ·{' '}
                          {lastPrayedLabel(fruit.last_prayed_at)}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {isSelected ? '▲' : '▼'}
                      </ThemedText>
                    </View>

                    {isSelected ? (
                      <View style={styles.fruitDetail}>
                        <TextInput
                          defaultValue={fruit.name}
                          onEndEditing={(e) => {
                            const name = e.nativeEvent.text.trim();
                            if (name && name !== fruit.name) {
                              run(() => updateFruit(fruit.id, { name }), '이름을 저장하지 못했어요.');
                            }
                          }}
                          placeholder="이름"
                          placeholderTextColor={theme.textSecondary}
                          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                        />
                        <TextInput
                          defaultValue={fruit.memo}
                          onEndEditing={(e) => {
                            const memo = e.nativeEvent.text;
                            if (memo !== fruit.memo) {
                              run(() => updateFruit(fruit.id, { memo }), '메모를 저장하지 못했어요.');
                            }
                          }}
                          placeholder="메모"
                          placeholderTextColor={theme.textSecondary}
                          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                        />

                        {/* 기도제목 */}
                        {fruit.topics.map((topic) => (
                          <View key={topic.id} style={styles.topicRow}>
                            <Pressable
                              onPress={() =>
                                run(
                                  () => setTopicAnswered(topic.id, !topic.answered),
                                  '응답 표시를 저장하지 못했어요.',
                                )
                              }
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: topic.answered }}
                              style={[
                                styles.check,
                                {
                                  borderColor: topic.answered ? theme.done : theme.border,
                                  backgroundColor: topic.answered ? theme.done : 'transparent',
                                },
                              ]}>
                              {topic.answered ? (
                                <ThemedText style={styles.checkMark}>✓</ThemedText>
                              ) : null}
                            </Pressable>
                            <ThemedText
                              type="small"
                              style={[styles.topicBody, topic.answered && styles.topicAnswered]}
                              themeColor={topic.answered ? 'textSecondary' : 'text'}>
                              {topic.body}
                            </ThemedText>
                            <Pressable
                              onPress={() =>
                                run(() => deleteTopic(topic.id), '기도제목을 지우지 못했어요.')
                              }
                              style={styles.topicDelete}>
                              <ThemedText type="small" themeColor="textSecondary">
                                ✕
                              </ThemedText>
                            </Pressable>
                          </View>
                        ))}

                        <View style={styles.addRow}>
                          <TextInput
                            value={topicDraft}
                            onChangeText={setTopicDraft}
                            placeholder="기도제목 추가"
                            placeholderTextColor={theme.textSecondary}
                            style={[
                              styles.input,
                              styles.addInput,
                              { color: theme.text, borderColor: theme.border },
                            ]}
                          />
                          <Pressable
                            onPress={() => {
                              const body = topicDraft.trim();
                              if (!userId || !body) return;
                              setTopicDraft('');
                              run(
                                () => addTopic(userId, fruit.id, body),
                                '기도제목을 넣지 못했어요.',
                              );
                            }}
                            disabled={busy || !topicDraft.trim()}
                            style={[
                              styles.smallButton,
                              {
                                backgroundColor: theme.accent,
                                opacity: busy || !topicDraft.trim() ? 0.5 : 1,
                              },
                            ]}>
                            <ThemedText type="smallBold" style={styles.primaryButtonText}>
                              추가
                            </ThemedText>
                          </Pressable>
                        </View>

                        <View style={styles.detailButtons}>
                          {answered > 0 && answered === fruit.topics.length ? (
                            <Pressable
                              onPress={() =>
                                run(async () => {
                                  await setFruitHarvested(fruit.id, !fruit.harvested_at);
                                }, '열매를 옮기지 못했어요.')
                              }
                              disabled={busy}
                              style={[styles.smallButton, { backgroundColor: theme.accentSoft }]}>
                              <ThemedText type="smallBold">
                                {fruit.harvested_at ? '🌳 나무에 다시' : '🧺 상자에 담기'}
                              </ThemedText>
                            </Pressable>
                          ) : null}
                          <Pressable
                            onPress={() => handlePickPhoto(fruit)}
                            disabled={busy}
                            style={[styles.smallButton, { backgroundColor: theme.accentSoft }]}>
                            <ThemedText type="smallBold">🖼 사진</ThemedText>
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteFruit(fruit)}
                            disabled={busy}
                            style={[styles.smallButton, { backgroundColor: theme.accentSoft }]}>
                            <ThemedText type="smallBold">🗑 열매 지우기</ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </View>

          {/* ── 기도음악 ─────────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="subtitle">🎵 기도음악</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              내 유튜브 재생목록 주소를 넣으면 기도할 때 나무 화면에서 바로 틀 수 있어요. 재생목록은
              본인이 고른 것만 저장됩니다.
            </ThemedText>
            <TextInput
              value={playlistDraft}
              onChangeText={setPlaylistDraft}
              placeholder="https://www.youtube.com/playlist?list=..."
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {playlistDraft.trim()
                ? draftMusic
                  ? draftMusic.kind === 'playlist'
                    ? `재생목록 ${draftMusic.id} 로 읽었어요.`
                    : '영상 하나로 읽었어요.'
                  : '아직 주소를 알아보지 못했어요.'
                : ' '}
            </ThemedText>
            <Pressable
              onPress={handleSavePlaylist}
              disabled={busy}
              style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: busy ? 0.5 : 1 }]}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                저장
              </ThemedText>
            </Pressable>
            {music ? <PrayerMusicPlayer embedUrl={music.embedUrl} height={180} /> : null}
          </View>
        </View>
      </ScrollView>
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
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.two },
  lead: { textAlign: 'center' },
  treeWrap: { alignItems: 'center', minHeight: 120 },
  section: {
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
  },
  primaryButton: { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF' },
  fruitRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  fruitRowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  thumb: { width: 36, height: 36, borderRadius: 18 },
  fruitRowText: { flex: 1 },
  fruitDetail: { gap: Spacing.two },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  topicBody: { flex: 1 },
  topicAnswered: { textDecorationLine: 'line-through' },
  topicDelete: { padding: 4 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  addInput: { flex: 1 },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  detailButtons: { flexDirection: 'row', gap: Spacing.two },
});
