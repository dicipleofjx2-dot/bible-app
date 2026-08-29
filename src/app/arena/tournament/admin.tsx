import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getIsAdmin } from '@/db/profile';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { confirmDestructive } from '@/lib/readingHelper/confirm';
import {
  championTotal,
  closeRound,
  createTournament,
  getBracket,
  deleteTournament,
  listTournaments,
  prizeTable,
  roundName,
  startBracket,
  type BracketMatch,
  type Tournament,
} from '@/lib/arena/tournament';
import { firstWinLosesMoney, minSponsorFor } from '@/lib/arena/prizeMath';
import { getGateState, setRoomsOpen, type GateState } from '@/lib/arena/gate';

/** 대회 관리 — 열기 · 예선 마감 · 라운드 마감. → docs/arena/README.md
 *
 * 되돌릴 수 없는 단추가 둘 있다(대진 짜기·라운드 마감). 둘 다 한 번 더 묻는다. */

const SIZES = [4, 8, 16, 32];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function TournamentAdminScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [list, setList] = useState<Tournament[]>([]);
  const [brackets, setBrackets] = useState<Record<string, BracketMatch[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 새 대회
  const [name, setName] = useState('제1회 성경게임대전');
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(plusDays(14));
  const [size, setSize] = useState(16);
  const [fee, setFee] = useState('20');
  const [sponsor, setSponsor] = useState('700');

  const [gate, setGate] = useState<GateState | null>(null);

  const load = useCallback(async () => {
    const [rows, g] = await Promise.all([listTournaments(), getGateState()]);
    setList(rows);
    setGate(g);
    const bs: Record<string, BracketMatch[]> = {};
    for (const t of rows.filter((x) => x.status === 'bracket')) {
      bs[t.id] = await getBracket(t.id);
    }
    setBrackets(bs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!userId) {
          setIsAdmin(false);
          return;
        }
        const admin = await getIsAdmin(userId).catch(() => false);
        if (cancelled) return;
        setIsAdmin(admin);
        if (admin) await load();
      })();
      return () => {
        cancelled = true;
      };
    }, [userId, load])
  );

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '실패했습니다');
    }
    setBusy(false);
  }

  if (isAdmin === null) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!isAdmin) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText type="subtitle">관리자만 볼 수 있습니다</ThemedText>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ThemedText type="smallBold">← 뒤로</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
            <ThemedText type="smallBold">← 뒤로</ThemedText>
          </Pressable>

          <ThemedText type="title">⚙️ 대회 관리</ThemedText>

          {error && (
            <View style={[styles.errorCard, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="small" style={{ color: theme.accent }}>
                {error}
              </ThemedText>
            </View>
          )}
          {busy && <ActivityIndicator style={styles.loading} />}

          {/* ── 방탈출 문 여닫기 ──
              대회를 시작하기도 전에 사람들이 들어와 문제를 다 풀어 버린 일이
              있었다. 미리 본 사람이 유리해지면 대회가 대회가 아니다. */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            방탈출 문
          </ThemedText>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="smallBold" style={{ color: gate?.is_open ? theme.done : theme.accent }}>
              {gate?.opened_by_admin
                ? '🔓 열어 두었습니다 — 누구나 들어갈 수 있습니다'
                : gate?.is_open
                  ? '🔓 예선 기간이라 열려 있습니다'
                  : '🔒 잠겨 있습니다 — 관리자만 들어갈 수 있습니다'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
              잠가 두면 예선이 시작되기 전에 문제가 새어 나가지 않습니다. 예선이 있는
              대회를 열면 그 기간에는 저절로 열립니다. 관리자는 잠겨 있어도 언제나
              들어가 확인할 수 있어요.
            </ThemedText>
            <Pressable
              disabled={busy}
              onPress={async () => {
                const opening = !gate?.opened_by_admin;
                const ok = await confirmDestructive(
                  opening ? '문을 열까요?' : '문을 잠글까요?',
                  opening
                    ? '누구나 방탈출에 들어가 문제를 볼 수 있게 됩니다.'
                    : '관리자를 뺀 모두가 못 들어가게 됩니다. 예선이 진행 중인 대회가 있으면 그 기간에는 그래도 열립니다.',
                  opening ? '열기' : '잠그기'
                );
                if (ok) void run(() => setRoomsOpen(opening));
              }}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.onAccent}>
                {gate?.opened_by_admin ? '문 잠그기' : '문 열기'}
              </ThemedText>
            </Pressable>
          </View>

          {/* ── 새 대회 ── */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            새 대회 열기
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary">
            대회 이름
          </ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
          />

          <ThemedText type="small" themeColor="textSecondary">
            예선 기간 (이 기간에 친 방탈출 기록만 셉니다)
          </ThemedText>
          <View style={styles.row}>
            <TextInput
              value={from}
              onChangeText={setFrom}
              placeholder="2026-08-26"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, styles.half, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
            />
            <TextInput
              value={to}
              onChangeText={setTo}
              placeholder="2026-09-09"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, styles.half, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
            />
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            본선 인원
          </ThemedText>
          <View style={styles.row}>
            {SIZES.map((s) => (
              <Pressable
                key={s}
                onPress={() => setSize(s)}
                style={({ pressed }) => [
                  styles.sizeChip,
                  {
                    borderColor: size === s ? theme.accent : theme.border,
                    backgroundColor: size === s ? theme.accentSoft : theme.backgroundElement,
                  },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={size === s ? { color: theme.accent } : undefined}>
                  {s}명
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <ThemedText type="small" themeColor="textSecondary">
                참가비 (본선 오를 때)
              </ThemedText>
              <TextInput
                value={fee}
                onChangeText={(t) => setFee(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
              />
            </View>
            <View style={styles.half}>
              <ThemedText type="small" themeColor="textSecondary">
                교회 출연 포인트
              </ThemedText>
              <TextInput
                value={sponsor}
                onChangeText={(t) => setSponsor(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
              />
            </View>
          </View>

          {/* 상금 미리보기. 「1등 하면 얼마」를 열기 전에 보고 정해야 한다. */}
          {(() => {
            const f = Number(fee || 0);
            const sp = Number(sponsor || 0);
            const rows = prizeTable(size, f, sp);
            const pool = f * size + sp;
            const champ = championTotal(rows);
            const risky = firstWinLosesMoney(size, f, sp);
            return (
              <View style={[styles.previewCard, { backgroundColor: theme.accentSoft }]}>
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  이렇게 열면 — 상금 풀 {pool}점
                </ThemedText>
                {rows.map((r) => (
                  <ThemedText key={r.round} type="small" style={styles.line}>
                    · {roundName(r.round)} 승 {r.winners}명 × {r.perWinner}점
                  </ThemedText>
                ))}
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  우승자 합계 {champ}점 (참가비 빼면 {champ - f}점)
                </ThemedText>
                {risky && (
                  <ThemedText type="small" style={[styles.line, { color: '#C0392B' }]}>
                    ⚠️ 지금 설정이면 첫 판을 이겨도 {rows[0]?.perWinner}점이라 참가비 {f}점을
                    못 건집니다. 이기고도 손해 보면 아무도 안 나옵니다 — 출연 포인트를{' '}
                    {minSponsorFor(size, f)}점 이상으로 올리거나 인원을 줄이세요.
                  </ThemedText>
                )}
              </View>
            );
          })()}

          <Pressable
            disabled={busy}
            onPress={() =>
              run(() =>
                createTournament(name.trim(), from.trim(), to.trim(), size, Number(fee || 0), Number(sponsor || 0))
              )
            }
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={styles.onAccent}>
              대회 열기 (예선 시작)
            </ThemedText>
          </Pressable>

          {/* ── 진행 중인 대회 ── */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            대회 목록
          </ThemedText>

          {list.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              아직 연 대회가 없습니다.
            </ThemedText>
          )}

          {list.map((t) => {
            const b = brackets[t.id] ?? [];
            const cur = b.filter((m) => m.round === t.current_round);
            const undecided = cur.filter((m) => !m.winner_name).length;
            return (
              <View
                key={t.id}
                style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText type="smallBold">{t.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
                  {t.status === 'qualifying'
                    ? `예선 중 · ${t.qualify_from} ~ ${t.qualify_to} · 본선 ${t.bracket_size}명`
                    : t.status === 'bracket'
                      ? `본선 ${roundName(t.current_round ?? 0)} · 아직 안 끝난 경기 ${undecided}개`
                      : t.status === 'done'
                        ? '끝난 대회'
                        : '준비 중'}
                </ThemedText>

                {/* 잘못 만든 대회 지우기.
                    비어 있는 대회만 지워진다 — 참가비가 오간 대회를 지우면
                    성도들이 낸 20점이 기록째 사라지기 때문이다(0069가 막는다).
                    막힌 경우에는 왜 안 되는지가 오류 문구로 뜬다. */}
                <Pressable
                  disabled={busy}
                  onPress={async () => {
                    const ok = await confirmDestructive(
                      `«${t.name}» 을 지울까요?`,
                      '잘못 만든 대회를 없앱니다. 참가비가 오갔거나 경기를 치른 대회는 지워지지 않습니다.',
                      '지우기'
                    );
                    if (ok) void run(() => deleteTournament(t.id));
                  }}
                  style={({ pressed }) => [styles.deleteRow, pressed && styles.pressed]}>
                  <ThemedText type="small" style={{ color: theme.accent }}>
                    이 대회 지우기
                  </ThemedText>
                </Pressable>

                {t.status === 'qualifying' && (
                  <Pressable
                    disabled={busy}
                    onPress={async () => {
                      const ok = await confirmDestructive(
                        '예선을 마감할까요?',
                        `지금까지의 기록으로 상위 ${t.bracket_size}명을 뽑아 대진표를 짭니다. 되돌릴 수 없습니다.`,
                        '대진 짜기'
                      );
                      if (ok) void run(() => startBracket(t.id));
                    }}
                    style={({ pressed }) => [
                      styles.actionButton,
                      { backgroundColor: theme.backgroundSelected },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold" style={styles.onAccent}>
                      예선 마감하고 대진 짜기
                    </ThemedText>
                  </Pressable>
                )}

                {t.status === 'bracket' && (
                  <>
                    {undecided > 0 && (
                      <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
                        마감하면 안 친 사람은 부전패가 됩니다. 둘 다 안 쳤으면 예선 성적이
                        좋은 쪽이 올라갑니다.
                      </ThemedText>
                    )}
                    <Pressable
                      disabled={busy}
                      onPress={async () => {
                        const ok = await confirmDestructive(
                          `${roundName(t.current_round ?? 0)}을 마감할까요?`,
                          undecided > 0
                            ? `아직 안 끝난 경기 ${undecided}개가 부전패로 처리됩니다. 되돌릴 수 없습니다.`
                            : '다음 라운드 대진을 짭니다. 되돌릴 수 없습니다.',
                          '마감'
                        );
                        if (ok) void run(() => closeRound(t.id));
                      }}
                      style={({ pressed }) => [
                        styles.actionButton,
                        { backgroundColor: theme.backgroundSelected },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="smallBold" style={styles.onAccent}>
                        {roundName(t.current_round ?? 0)} 마감하고 다음으로
                      </ThemedText>
                    </Pressable>
                  </>
                )}

                <Pressable
                  onPress={() => router.push(`/arena/tournament/${t.id}` as Href)}
                  style={({ pressed }) => [
                    styles.linkButton,
                    { borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small">대진표 보기 ›</ThemedText>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  deleteRow: { alignSelf: "flex-end", paddingVertical: 4, paddingHorizontal: 6 },
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  backRow: { marginBottom: Spacing.two },
  sectionTitle: { marginTop: Spacing.four },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1, gap: 4 },
  previewCard: { borderRadius: 12, padding: 14, gap: 4, marginTop: Spacing.three },
  sizeChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6, marginTop: Spacing.two },
  line: { lineHeight: 20 },
  errorCard: { borderRadius: 10, padding: 12, marginTop: Spacing.two },
  loading: { marginTop: Spacing.two },
  primaryButton: { borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.three },
  actionButton: { borderRadius: 999, paddingVertical: 11, alignItems: 'center', marginTop: Spacing.one },
  linkButton: { borderRadius: 999, borderWidth: 1, paddingVertical: 9, alignItems: 'center', marginTop: Spacing.one },
  onAccent: { color: '#fff' },
  pressed: { opacity: 0.7 },
});
