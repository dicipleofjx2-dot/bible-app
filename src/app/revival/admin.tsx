import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthPicker } from '@/components/MonthPicker';
import { Raised, useRaise } from '@/components/Raised';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  REVIVAL_MINISTRIES,
  addSession,
  formatMeetsOn,
  getAllRequests,
  getUpcomingSessions,
  isAppAdmin,
  ministryOf,
  removeSession,
  type RevivalKind,
  type RevivalRequest,
  type RevivalSession,
} from '@/db/revival';

/**
 * 사역 관리 — 날짜를 정하고, 신청자를 본다.
 *
 * 관리자만 들어온다. 그런데 **화면에서 막는 것은 안내일 뿐**이다 — 신청 글은
 * DB 정책이 「본인 또는 같은 교회 관리자」로 막고 있어서, 관리자가 아닌 사람이
 * 주소를 직접 쳐도 자기 글 말고는 돌아오지 않는다.
 *
 * 신청 글에는 무슨 병인지, 무엇에 눌려 있는지가 적혀 있다. 한 줄 요약으로
 * 흘려보내지 않고 적으신 그대로 보여 준다 — 기도할 사람이 알아야 할 것이다.
 */
export default function RevivalAdminScreen() {
  const theme = useTheme();
  const { strongShadow } = useRaise();
  const { session } = useAuth();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<RevivalSession[]>([]);
  const [requests, setRequests] = useState<RevivalRequest[]>([]);
  const [filter, setFilter] = useState<RevivalKind | null>(null);

  // 날짜 넣는 칸
  const [kind, setKind] = useState<RevivalKind>('HEALING');
  const [meetsOn, setMeetsOn] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    getUpcomingSessions().then(setSessions).catch(() => setSessions([]));
    getAllRequests().then(setRequests).catch(() => setRequests([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setAdmin(false);
        return;
      }
      isAppAdmin(session.user.id)
        .then((v) => {
          setAdmin(v);
          if (v) load();
        })
        .catch(() => setAdmin(false));
    }, [session, load]),
  );

  async function add() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meetsOn)) {
      setMessage('날짜는 2026-11-09 처럼 적어 주세요.');
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = await addSession({ kind, meetsOn, place, note });
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMeetsOn('');
    setPlace('');
    setNote('');
    load();
  }

  if (admin === null) return <ThemedView style={styles.container} />;

  if (!admin) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText themeColor="textSecondary">관리자만 볼 수 있는 화면입니다.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const shown = filter ? requests.filter((r) => r.kind === filter) : requests;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            부흥의 천사들 · 사역 관리
          </ThemedText>

          {/* ── 날짜 정하기 ── */}
          <Raised>
            <ThemedText type="smallBold">이 달의 사역 날짜</ThemedText>
            <View style={styles.chipRow}>
              {REVIVAL_MINISTRIES.map((m) => (
                <Pressable
                  key={m.kind}
                  onPress={() => setKind(m.kind)}
                  style={[
                    styles.chip,
                    {
                      borderColor: kind === m.kind ? m.color : theme.border,
                      backgroundColor: kind === m.kind ? m.color : 'transparent',
                    },
                  ]}>
                  <ThemedText
                    type="small"
                    themeColor={kind === m.kind ? undefined : 'textSecondary'}
                    style={kind === m.kind ? styles.chipOn : undefined}>
                    {m.emoji} {m.name}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            {/*
              날짜는 **달력에서 고른다.** 「2026-11-09」처럼 적게 하면 한 자리만
              틀려도 조용히 엉뚱한 날이 되고, 폰에서는 그 열 글자를 치는 것 자체가
              일이다. 고른 날은 아래 한 줄로 다시 확인해 준다.
            */}
            <MonthPicker value={meetsOn} onChange={setMeetsOn} tint={ministryOf(kind).color} />
            <ThemedText type="small" themeColor={meetsOn ? 'accent' : 'textSecondary'}>
              {meetsOn ? `고른 날 — ${formatMeetsOn(meetsOn)}` : '달력에서 날짜를 고르세요'}
            </ThemedText>
            <TextInput
              value={place}
              onChangeText={setPlace}
              placeholder="자리 — 본당, 주일 2부 예배 후 (비워도 됩니다)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
            />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="한 줄 안내 (비워도 됩니다)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
            />
            <Pressable
              onPress={() => void add()}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: ministryOf(kind).color, opacity: busy ? 0.6 : 1 },
                strongShadow,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.primaryText}>
                날짜 넣기
              </ThemedText>
            </Pressable>
            {message && (
              <ThemedText type="small" themeColor="accent">
                {message}
              </ThemedText>
            )}

            {sessions.map((s) => (
              <View key={s.id} style={styles.sessionRow}>
                <ThemedText type="small">
                  {ministryOf(s.kind).emoji} {formatMeetsOn(s.meetsOn)}
                  {s.place ? ` · ${s.place}` : ''}
                </ThemedText>
                <Pressable
                  onPress={async () => {
                    await removeSession(s.id);
                    load();
                  }}
                  hitSlop={8}
                  style={styles.pushRight}>
                  <ThemedText type="small" themeColor="textSecondary">
                    지우기
                  </ThemedText>
                </Pressable>
              </View>
            ))}
          </Raised>

          {/* ── 신청자 ── */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            신청한 분들 {shown.length}
          </ThemedText>
          <View style={styles.chipRow}>
            <Pressable
              onPress={() => setFilter(null)}
              style={[
                styles.chip,
                { borderColor: filter === null ? theme.accent : theme.border },
              ]}>
              <ThemedText type="small" themeColor={filter === null ? 'accent' : 'textSecondary'}>
                전체
              </ThemedText>
            </Pressable>
            {REVIVAL_MINISTRIES.map((m) => (
              <Pressable
                key={m.kind}
                onPress={() => setFilter(m.kind)}
                style={[
                  styles.chip,
                  { borderColor: filter === m.kind ? theme.accent : theme.border },
                ]}>
                <ThemedText type="small" themeColor={filter === m.kind ? 'accent' : 'textSecondary'}>
                  {m.emoji} {m.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {shown.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              아직 신청이 없습니다.
            </ThemedText>
          )}

          {shown.map((r) => (
            <Raised key={r.id}>
              <ThemedText type="small" themeColor="textSecondary">
                {ministryOf(r.kind).emoji} {ministryOf(r.kind).name} · {r.createdAt.slice(0, 10)}
              </ThemedText>
              <ThemedText type="smallBold">{r.name || '이름을 안 적으셨습니다'}</ThemedText>
              <ThemedText>{r.body}</ThemedText>
              {r.afterNote ? (
                <View style={[styles.afterBox, { borderColor: theme.accent }]}>
                  <ThemedText type="small" themeColor="accent">
                    기도받은 뒤 ({r.afterAt?.slice(0, 10)})
                  </ThemedText>
                  <ThemedText type="small">{r.afterNote}</ThemedText>
                </View>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  받은 뒤 기록은 아직 없습니다
                </ThemedText>
              )}
            </Raised>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  title: { fontSize: 24 },
  sectionTitle: { marginTop: Spacing.three },
  card: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.two },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    borderWidth: 1,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  primaryButton: {
    marginTop: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  primaryText: { color: '#ffffff' },
  chipOn: { color: '#ffffff' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pushRight: { marginLeft: 'auto' },
  afterBox: { borderLeftWidth: 2, paddingLeft: Spacing.three, gap: 2, marginTop: Spacing.one },
  pressed: { opacity: 0.7 },
});
