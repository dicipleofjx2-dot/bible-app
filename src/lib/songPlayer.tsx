import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioStatus } from 'expo-audio';
import { router, usePathname, type Href } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { fetchDecisionSongs, type DecisionSong } from '@/lib/decisionSongs';

/**
 * 결단송 플레이어 — 앱 전체에 하나(2026-10-02).
 *
 * 결단송 화면 안에 플레이어를 두었더니 다른 화면으로 넘어가는 순간 화면이 닫히며 노래도 꺼졌다
 * (「앱을 꺼도 나온다면서 화면만 넘어가도 안 난다」). 그래서 플레이어를 맨 바깥(_layout)에 두고,
 * 결단송 화면은 이것을 보여 주고 부리기만 한다. 다른 화면에서는 아래 작은 띠(SongMiniBar)로
 * 멈추거나 결단송 화면으로 돌아간다.
 */
type Ctx = {
  songs: DecisionSong[] | null;
  error: string | null;
  cur: number;
  song: DecisionSong | null;
  status: AudioStatus;
  /** 결단송 화면을 열 때 목록을 불러온다(한 번만) */
  load: () => void;
  toggle: () => void;
  pick: (i: number) => void;
  step: (d: number) => void;
  stop: () => void;
};

const SongCtx = createContext<Ctx | null>(null);

export function useSongPlayer(): Ctx {
  const c = useContext(SongCtx);
  if (!c) throw new Error('SongPlayerProvider 안에서만 씁니다');
  return c;
}

export function SongPlayerProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState<DecisionSong[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cur, setCur] = useState(0);
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const wantPlay = useRef(false);
  const loading = useRef(false);

  const curId = useRef<number | null>(null);

  // 플레이리스트를 열 때마다 새로 받는다 — 한 번만 받으면 앱을 켜 둔 동안 새로 올린 곡이 안 보였다(2026-10-03).
  // 듣던 곡은 새 목록에서도 그 곡을 가리키게 한다(맨 위에 새 곡이 끼어도 노래가 바뀌지 않게).
  const load = useCallback(() => {
    if (loading.current) return;
    loading.current = true;
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
    fetchDecisionSongs()
      .then((list) => {
        setError(null);
        const keep = curId.current === null ? -1 : list.findIndex((s) => s.id === curId.current);
        setSongs(list);
        setCur(keep >= 0 ? keep : 0);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => {
        loading.current = false;
      });
  }, []);

  const song = songs?.[cur] ?? null;
  const audio = song?.audio ?? null;
  curId.current = song?.id ?? null;

  // 곡을 바꾸면 그 음원으로 — 듣던 중이었으면 이어서. 음원 주소로만 반응한다(목록을 새로 받아도 같은 곡이면 끊지 않게)
  useEffect(() => {
    if (!audio) return;
    player.replace({ uri: audio });
    if (wantPlay.current) player.play();
  }, [audio, player]);

  // 끝나면 다음 곡(마지막 뒤엔 처음으로)
  useEffect(() => {
    if (status.didJustFinish && songs?.length) {
      wantPlay.current = true;
      setCur((i) => (i + 1) % songs.length);
    }
  }, [status.didJustFinish, songs?.length]);

  // 안드로이드 홈 화면 웹앱은 홈에서 「뒤로」를 누르면 앱이 닫히며 노래도 끊긴다(2026-10-02).
  // 듣는 동안 홈 화면에는 같은 주소의 「받침」 기록을 하나 깔아, 첫 「뒤로」는 받침만 걷고 안내를 띄운다.
  // 3초 안에 한 번 더 누르면 그대로 둔다 — 그다음 「뒤로」에 앱이 닫힌다.
  const path = usePathname();
  const [backHint, setBackHint] = useState(false);
  const playingRef = useRef(false);
  const lastBack = useRef(0);
  playingRef.current = status.playing;
  useEffect(() => {
    if (Platform.OS !== 'web' || !status.playing || path !== '/') return;
    if ((window.history.state as { dgSongGuard?: boolean } | null)?.dgSongGuard) return;
    window.history.pushState({ ...(window.history.state ?? {}), dgSongGuard: true }, '', window.location.href);
  }, [status.playing, path]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onPop = (e: PopStateEvent) => {
      if (!playingRef.current || window.location.pathname !== '/') return;
      if ((e.state as { dgSongGuard?: boolean } | null)?.dgSongGuard) return;
      const now = Date.now();
      if (now - lastBack.current < 3000) return; // 한 번 더 눌렀다 — 닫히게 둔다
      lastBack.current = now;
      window.history.pushState({ ...(window.history.state ?? {}), dgSongGuard: true }, '', window.location.href);
      setBackHint(true);
      setTimeout(() => setBackHint(false), 3000);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const toggle = useCallback(() => {
    if (status.playing) {
      wantPlay.current = false;
      player.pause();
    } else {
      wantPlay.current = true;
      player.play();
    }
  }, [status.playing, player]);

  const pick = useCallback(
    (i: number) => {
      wantPlay.current = true;
      if (i === cur) player.play();
      else setCur(i);
    },
    [cur, player],
  );

  const step = useCallback(
    (d: number) => {
      if (!songs?.length) return;
      wantPlay.current = status.playing || wantPlay.current;
      setCur((i) => (i + d + songs.length) % songs.length);
    },
    [songs?.length, status.playing],
  );

  const stop = useCallback(() => {
    wantPlay.current = false;
    player.pause();
  }, [player]);

  const value = useMemo(
    () => ({ songs, error, cur, song, status, load, toggle, pick, step, stop }),
    [songs, error, cur, song, status, load, toggle, pick, step, stop],
  );
  return (
    <SongCtx.Provider value={value}>
      {children}
      <SongMiniBar backHint={backHint} />
    </SongCtx.Provider>
  );
}

/** 다른 화면에서 듣는 동안 아래에 뜨는 작은 띠 — 누르면 결단송 화면, ❚❚ 로 멈춤 */
function SongMiniBar({ backHint }: { backHint: boolean }) {
  const c = useContext(SongCtx)!;
  const theme = useTheme();
  const path = usePathname();
  if (!c.song || path === '/songs' || (!c.status.playing && c.status.currentTime === 0)) return null;
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      {backHint ? (
        <View style={[styles.hint, { backgroundColor: theme.text }]}>
          <ThemedText type="small" style={{ color: theme.background, textAlign: 'center' }}>
            한 번 더 누르면 앱이 닫히고 결단송도 멈춥니다.{'\n'}노래를 들으며 나가려면 홈 버튼을 눌러 주세요.
          </ThemedText>
        </View>
      ) : null}
      <View style={[styles.bar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Pressable onPress={() => router.push('/songs' as Href)} style={styles.title} accessibilityLabel="결단송 화면으로">
          <ThemedText type="smallBold" numberOfLines={1}>
            ♪ {c.song.title}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={c.toggle}
          style={({ pressed }) => [styles.btn, { backgroundColor: theme.accent }, pressed && { opacity: 0.7 }]}
          accessibilityLabel={c.status.playing ? '잠시 멈춤' : '듣기'}>
          <ThemedText style={styles.btnText}>{c.status.playing ? '❚❚' : '▶'}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 폰 앱은 아래 탭 막대 위에, 웹은 탭 막대가 위에 있으니 맨 아래에
  wrap: { position: 'absolute', left: 0, right: 0, bottom: Platform.OS === 'web' ? 16 : 92, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 360,
    width: '86%',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  title: { flex: 1 },
  hint: { maxWidth: 360, width: '86%', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8 },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 16, lineHeight: 20 },
});
