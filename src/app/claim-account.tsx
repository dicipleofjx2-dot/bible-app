import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  confirmAccountLink,
  getMyLinkRequests,
  needsAccountLink,
  PENDING_LINK_KEY,
  requestAccountLink,
  type LinkRequest,
} from '@/db/accountLink';

/**
 * 예전 계정 기록 이어받기.
 *
 * 화면이 두 얼굴을 가진다:
 *   · 지금 계정(카카오)으로 보면 → 예전 이메일을 적는 칸
 *   · 예전 계정(이메일)으로 로그인해 보면 → 「이어받기」 단추
 *
 * 한 화면에 둔 이유: 성도가 로그아웃했다 다시 들어와도 **같은 자리**로 오면
 * 되기 때문이다. 화면이 둘이면 "그 다음에 어디로 가라"를 설명해야 한다.
 */
export default function ClaimAccountScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user?.id ?? '';
  const myEmail = (session?.user?.email ?? '').toLowerCase();

  const [needs, setNeeds] = useState(false);
  const [requests, setRequests] = useState<LinkRequest[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [oldEmail, setOldEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setNeeds(await needsAccountLink());
    setRequests(await getMyLinkRequests());
    try {
      const raw = await AsyncStorage.getItem(PENDING_LINK_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { id: string; email: string };
        setPendingId(saved.id);
        setPendingEmail(saved.email);
      }
    } catch {
      // 기기에 적어 둔 것이 깨졌으면 없는 셈 친다. 신청은 서버에 남아 있다.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function submit() {
    const email = oldEmail.trim().toLowerCase();
    if (!email.includes('@')) return setError('이메일을 정확히 적어 주세요.');
    if (email === myEmail) return setError('지금 쓰고 계신 계정과 같은 이메일입니다.');
    setBusy(true);
    setError(null);
    const { error: e } = await requestAccountLink(userId, email);
    setBusy(false);
    if (e) return setError(e);
    const list = await getMyLinkRequests();
    setRequests(list);
    const mine = list.find((r) => r.oldEmail === email && r.status === 'pending');
    if (mine) {
      // 예전 계정으로 로그인하면 RLS 때문에 이 신청이 안 보인다. 그래서
      // 번호를 기기에 적어 둔다 — 성도가 번호를 옮겨 적을 필요가 없다.
      await AsyncStorage.setItem(PENDING_LINK_KEY, JSON.stringify({ id: mine.id, email }));
      setPendingId(mine.id);
      setPendingEmail(email);
    }
    setOldEmail('');
    setMessage('신청했습니다. 이제 아래 안내대로 예전 계정으로 한 번만 로그인해 주세요.');
  }

  async function confirm() {
    if (!pendingId) return;
    setBusy(true);
    setError(null);
    const { error: e, moved } = await confirmAccountLink(pendingId);
    setBusy(false);
    if (e) return setError(e);
    await AsyncStorage.removeItem(PENDING_LINK_KEY);
    setPendingId(null);
    setMessage(`${moved ?? 0}개의 기록을 옮겼습니다. 이제 카카오로 다시 로그인하시면 그대로 이어집니다.`);
    await load();
  }

  // 예전 계정으로 로그인한 상태인가 — 기기에 적어 둔 이메일과 지금 계정이 같다.
  const isOldAccount = Boolean(pendingId && pendingEmail && pendingEmail === myEmail);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">예전 기록 이어받기</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            예전에 이메일로 가입해 쓰시다가 카카오로 들어오셨다면, 그때의 통독 기록과
            포인트를 지금 계정으로 옮길 수 있습니다.
          </ThemedText>

          {message && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold" themeColor="accent">
                {message}
              </ThemedText>
            </ThemedView>
          )}
          {error && (
            <ThemedText type="small" style={{ color: '#e03131' }}>
              {error}
            </ThemedText>
          )}

          {isOldAccount ? (
            // ── 예전 계정으로 로그인한 상태 ──
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="subtitle">이 계정의 기록을 옮길까요?</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                지금 {myEmail} 로 로그인해 계십니다. 아래를 누르면 이 계정의 통독 기록·
                포인트·기도제목이 카카오 계정으로 넘어갑니다.
              </ThemedText>
              <Pressable
                onPress={confirm}
                disabled={busy}
                style={[styles.button, { backgroundColor: theme.accent, opacity: busy ? 0.5 : 1 }]}>
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                  기록 옮기기
                </ThemedText>
              </Pressable>
            </ThemedView>
          ) : pendingId ? (
            // ── 신청은 했고, 예전 계정 로그인을 기다리는 중 ──
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">다음 한 걸음이 남았습니다</ThemedText>
              <ThemedText type="small">
                1. 로그아웃합니다{'\n'}
                2. <ThemedText type="smallBold">{pendingEmail}</ThemedText> 과 그때 쓰시던
                비밀번호로 로그인합니다{'\n'}
                3. 이 화면으로 다시 오시면 「기록 옮기기」 단추가 뜹니다
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                비밀번호를 확인하는 이유는 하나입니다 — 그래야 남이 남의 기록을 가져갈 수
                없습니다. 비밀번호가 기억나지 않으시면 교회 관리자에게 말씀해 주세요.
              </ThemedText>
            </ThemedView>
          ) : (
            // ── 신청 전 ──
            <ThemedView type="backgroundElement" style={styles.card}>
              {!needs && (
                <ThemedText type="small" themeColor="textSecondary">
                  지금 계정에 이미 기록이 있습니다. 그래도 예전 계정이 따로 있으시면
                  아래에 적어 주세요.
                </ThemedText>
              )}
              <ThemedText type="smallBold">예전에 쓰시던 이메일</ThemedText>
              <TextInput
                value={oldEmail}
                onChangeText={setOldEmail}
                placeholder="example@naver.com"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
              />
              <Pressable
                onPress={submit}
                disabled={busy || !oldEmail.trim()}
                style={[
                  styles.button,
                  { backgroundColor: theme.accent, opacity: busy || !oldEmail.trim() ? 0.5 : 1 },
                ]}>
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                  이어받기 신청
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}

          {requests.length > 0 && (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                신청 기록
              </ThemedText>
              {requests.map((r) => (
                <ThemedView key={r.id} type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">{r.oldEmail}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {r.status === 'confirmed'
                      ? `옮김 완료 · ${r.movedRows ?? 0}개`
                      : r.status === 'pending'
                        ? '예전 계정 로그인을 기다리는 중'
                        : r.status}
                  </ThemedText>
                </ThemedView>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five },
  sectionTitle: { marginTop: Spacing.three },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  input: { borderRadius: Spacing.two, padding: Spacing.two, fontSize: 15 },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
});
