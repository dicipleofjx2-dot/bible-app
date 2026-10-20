import { Image } from 'expo-image';
import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily } from '@/constants/typography';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cueAt } from '@/lib/decisionSongs';
import { useSongPlayer } from '@/lib/songPlayer';

/**
 * 결단송 — 주일 설교마다 말씀광산에서 만든 찬양을 새 곡부터 차례로 흘려 듣는다(2026-10-02).
 *
 * 곡은 워드프레스 「결단송」에서 읽는다(→ `@/lib/decisionSongs`). 음원도 거기(호스팅)에 있다.
 * 플레이어는 앱 전체에 하나(→ `@/lib/songPlayer`) — 이 화면을 떠나도 노래가 이어진다.
 * 가사 시간표가 있는 곡은 지금 부르는 줄을 밝힌다.
 */
export default function SongsScreen() {
  const theme = useTheme();
  const { songs, error, cur, song, status, load, toggle, pick, step } = useSongPlayer();
  const lyricsRef = useRef<ScrollView>(null);
  const lineY = useRef<number[]>([]);

  useEffect(() => load(), [load]);
  // 곡이 바뀌면 가사 줄 위치를 다시 잰다
  useEffect(() => {
    lineY.current = [];
  }, [song]);

  const line = useMemo(() => (song ? cueAt(song.cues, status.currentTime) : -1), [song, status.currentTime]);

  // 지금 줄이 가사 칸 가운데쯤 오게
  useEffect(() => {
    const y = lineY.current[line];
    if (line >= 0 && y !== undefined) lyricsRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
  }, [line]);

  const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const pct = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

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
          {/* 지금 곡 */}
          <View style={[styles.player, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            {song.cover ? <Image source={{ uri: song.cover }} style={styles.cover} contentFit="cover" /> : null}
            <ThemedText style={styles.songTitle}>{song.title}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
              주일 설교 「{song.sermon}」{song.scripture ? ` · ${song.scripture}` : ''}
            </ThemedText>

            <View style={[styles.bar, { backgroundColor: theme.accentSoft }]}>
              <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: theme.accent }]} />
            </View>
            <View style={styles.times}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>{mm(status.currentTime)}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>{status.duration ? mm(status.duration) : ''}</ThemedText>
            </View>

            <View style={styles.controls}>
              <Pressable onPress={() => step(-1)} style={({ pressed }) => [styles.small, pressed && styles.pressed]} accessibilityLabel="이전 곡">
                <ThemedText style={styles.ctrlText}>⏮</ThemedText>
              </Pressable>
              <Pressable
                onPress={toggle}
                style={({ pressed }) => [styles.big, { backgroundColor: theme.accent }, pressed && styles.pressed]}
                accessibilityLabel={status.playing ? '잠시 멈춤' : '듣기'}>
                <ThemedText style={styles.bigText}>{status.playing ? '❚❚' : '▶'}</ThemedText>
              </Pressable>
              <Pressable onPress={() => step(1)} style={({ pressed }) => [styles.small, pressed && styles.pressed]} accessibilityLabel="다음 곡">
                <ThemedText style={styles.ctrlText}>⏭</ThemedText>
              </Pressable>
            </View>
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
            {song.youtube ? (
              <Pressable onPress={() => Linking.openURL(song.youtube!)}>
                <ThemedText type="smallBold" style={{ color: theme.accent, textAlign: 'center' }}>
                  ▶ 유튜브에서 영상으로 보기
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          {/* 가사 — 지금 부르는 줄을 밝힌다 */}
          {song.cues.length ? (
            <View style={[styles.lyricsBox, { backgroundColor: theme.readingBackground, borderColor: theme.border }]}>
              <ScrollView ref={lyricsRef} style={styles.lyrics} nestedScrollEnabled>
                {song.cues.map((c, i) => (
                  <ThemedText
                    key={i}
                    onLayout={(e) => (lineY.current[i] = e.nativeEvent.layout.y)}
                    style={[
                      styles.lyric,
                      { color: i === line ? theme.accent : theme.textSecondary },
                      i === line && styles.lyricNow,
                    ]}>
                    {c.text}
                  </ThemedText>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* 플레이리스트 — 새 곡부터 */}
          <ThemedText style={styles.listHead}>결단송 {songs.length}곡</ThemedText>
          {songs.map((s, i) => (
            <Pressable
              key={s.id}
              onPress={() => pick(i)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: i === cur ? theme.accentSoft : theme.backgroundElement, borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              {s.cover ? <Image source={{ uri: s.cover }} style={styles.thumb} contentFit="cover" /> : <View style={[styles.thumb, { backgroundColor: theme.accentSoft }]} />}
              <View style={styles.rowText}>
                <ThemedText style={styles.rowTitle} numberOfLines={1}>
                  {i === cur && status.playing ? '♪ ' : ''}
                  {s.title}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
                  {s.sermon}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  scroll: { padding: Spacing.three, gap: Spacing.three, maxWidth: 640, width: '100%', alignSelf: 'center' },
  player: { borderWidth: 1, borderRadius: 20, padding: Spacing.four, gap: Spacing.two, alignItems: 'stretch' },
  cover: { width: '100%', aspectRatio: 3 / 2, borderRadius: 14 },
  songTitle: { fontFamily: FontFamily.display, fontWeight: "700", fontSize: 24, lineHeight: 32, textAlign: 'center', marginTop: Spacing.two },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: Spacing.two },
  barFill: { height: 6 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.five },
  small: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  ctrlText: { fontSize: 26, lineHeight: 32 },
  big: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  bigText: { color: '#FFFFFF', fontSize: 28, lineHeight: 34 },
  lyricsBox: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  lyrics: { maxHeight: 260, padding: Spacing.three },
  lyric: { fontFamily: FontFamily.serif, fontSize: 18, lineHeight: 32, textAlign: 'center' },
  lyricNow: { fontSize: 21 },
  listHead: { fontFamily: FontFamily.displayMedium, fontWeight: "700", fontSize: 18, marginTop: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two, borderWidth: 1, borderRadius: 14 },
  thumb: { width: 72, height: 48, borderRadius: 8 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: FontFamily.bold, fontWeight: "700", fontSize: 17 },
  pressed: { opacity: 0.7 },
  mvBtn: { alignSelf: 'center', minHeight: 48, paddingHorizontal: 20, justifyContent: 'center', borderWidth: 1.5, borderRadius: 24 },
});
