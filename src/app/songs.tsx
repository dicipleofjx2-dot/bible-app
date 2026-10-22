import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrayerMusicPlayer } from '@/components/PrayerMusicPlayer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { FontFamily } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';
import { fetchDecisionSongs, type DecisionSong } from '@/lib/decisionSongs';
import { parsePrayerMusicUrl } from '@/lib/prayerTree';

/**
 * 결단송 — 주일 설교마다 말씀광산에서 만든 찬양.
 *
 * **유튜브로 듣는다(2026-10-22).** 전에는 호스팅에 올린 음원을 앱 안 플레이어로
 * 틀었는데, 같은 곡이 유튜브에도 있어서 두 벌을 들고 있었다. 음원 쪽을 걷고
 * 유튜브만 남긴다 — 올리는 분도 한 군데만 올리면 된다.
 *
 * 유튜브 앱으로 넘기지 않고 **화면 안에 심는다.** 넘기면 앱을 나가게 되고,
 * 돌아오면 목록을 처음부터 다시 찾아야 한다(기도음악에서 쓰던 그 플레이어다).
 *
 * 가사는 그대로 둔다. 다만 지금 부르는 줄을 밝히지는 않는다 — 그건 음원의 재생
 * 시각을 알아야 하는 일인데, 유튜브 안에서 흐르는 시각은 바깥에서 볼 수 없다.
 */
export default function SongsScreen() {
  const theme = useTheme();
  const [songs, setSongs] = useState<DecisionSong[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cur, setCur] = useState(0);

  const load = useCallback(() => {
    fetchDecisionSongs()
      .then((list) => {
        setSongs(list);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => load(), [load]);

  const song = songs?.[cur] ?? null;
  const source = song?.youtube ? parsePrayerMusicUrl(song.youtube) : null;

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{error}</ThemedText>
      </ThemedView>
    );
  }
  if (!songs) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }
  if (!songs.length || !song) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={{ color: theme.textSecondary }}>아직 올라온 결단송이 없습니다.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.player, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            {source ? (
              <PrayerMusicPlayer embedUrl={source.embedUrl} height={200} />
            ) : (
              <>
                {song.cover ? <Image source={{ uri: song.cover }} style={styles.cover} contentFit="cover" /> : null}
                {/* 유튜브 주소가 아직 안 붙은 곡. 들을 길은 없지만 글은 있다. */}
                <Pressable onPress={() => Linking.openURL(song.link)}>
                  <ThemedText type="smallBold" style={{ color: theme.accent, textAlign: 'center' }}>
                    아직 영상이 없어요 · 글에서 보기 ↗
                  </ThemedText>
                </Pressable>
              </>
            )}

            <ThemedText style={styles.songTitle}>{song.title}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
              주일 설교 「{song.sermon}」{song.scripture ? ` · ${song.scripture}` : ''}
            </ThemedText>

            {song.mv ? (
              <Pressable
                onPress={() => Linking.openURL(song.mv!)}
                style={({ pressed }) => [styles.mvBtn, { borderColor: theme.accent }, pressed && styles.pressed]}
                accessibilityLabel="웹툰 뮤직비디오 보기">
                <ThemedText type="smallBold" style={{ color: theme.accent, textAlign: 'center' }}>
                  🎬 웹툰 뮤직비디오 보기
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          {/* 가사 */}
          {song.cues.length ? (
            <View style={[styles.lyrics, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {song.cues.map((c, i) => (
                <ThemedText key={i} style={[styles.line, { color: theme.text }]}>
                  {c.text}
                </ThemedText>
              ))}
            </View>
          ) : null}

          {/* 다른 곡 */}
          {songs.length > 1 ? (
            <View style={styles.list}>
              <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
                다른 결단송
              </ThemedText>
              {songs.map((s, i) =>
                i === cur ? null : (
                  <Pressable
                    key={s.id}
                    onPress={() => setCur(i)}
                    style={({ pressed }) => [
                      styles.row,
                      { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                      pressed && styles.pressed,
                    ]}>
                    {s.cover ? (
                      <Image source={{ uri: s.cover }} style={styles.thumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.thumb, { backgroundColor: theme.accentSoft }]} />
                    )}
                    <View style={styles.rowText}>
                      <ThemedText type="smallBold" numberOfLines={2}>
                        {s.title}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
                        {s.sermon}
                      </ThemedText>
                    </View>
                  </Pressable>
                ),
              )}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  scroll: { padding: Spacing.three, gap: Spacing.three, maxWidth: 560, alignSelf: 'center', width: '100%' },
  player: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
  },
  cover: { width: 160, height: 160, borderRadius: Spacing.three },
  songTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: Spacing.one },
  mvBtn: {
    alignSelf: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 24,
  },
  lyrics: { borderRadius: Spacing.four, borderWidth: 1, padding: Spacing.four, gap: Spacing.two },
  line: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 26, textAlign: 'center' },
  list: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.two,
  },
  thumb: { width: 56, height: 56, borderRadius: Spacing.two },
  rowText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
});
