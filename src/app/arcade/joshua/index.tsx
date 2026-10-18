import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { createRoom, joinRoom, WARS } from '@/lib/joshua';

/** 여호수아의 전쟁 첫 화면 — 혼자 연습 / 방 만들기 / 초대 번호로 들어가기.
 * → docs/arcade/README.md */
export default function JoshuaHomeScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function make() {
    setBusy(true);
    setError(null);
    try {
      const id = await createRoom();
      router.replace(`/arcade/joshua/${id}` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : '방을 만들지 못했습니다');
      setBusy(false);
    }
  }

  async function join() {
    const trimmed = code.replace(/\D/g, '');
    if (trimmed.length !== 6) {
      setError('여섯 자리 초대 번호를 넣어 주세요');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await joinRoom(trimmed);
      router.replace(`/arcade/joshua/${id}` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : '들어가지 못했습니다');
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
            <ThemedText type="smallBold">← 뒤로</ThemedText>
          </Pressable>

          <ThemedText type="title">⚔️ 여호수아의 전쟁</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.lead}>
            가나안 정복의 네 전쟁을 둘이서 함께 치릅니다. 초대 번호를 보내 친구와 같은 판을
            동시에 하고, 점수를 합쳐 연합 승리에 도전하세요.
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            {WARS.map((w) => (
              <ThemedText key={w.id} type="small" style={styles.line}>
                {w.emoji} {w.title} <ThemedText type="small" themeColor="textSecondary">({w.passage})</ThemedText>
              </ThemedText>
            ))}
          </View>

          {error && (
            <View style={[styles.errorCard, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="small" style={{ color: theme.accent }}>
                {error}
              </ThemedText>
            </View>
          )}
          {busy && <ActivityIndicator style={styles.loading} />}

          <Pressable
            disabled={busy}
            onPress={() => router.push('/arcade/joshua/solo' as Href)}
            style={({ pressed }) => [styles.secondaryButton, { borderColor: theme.border }, pressed && styles.pressed]}>
            <ThemedText type="smallBold">혼자 연습하기</ThemedText>
          </Pressable>

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            둘이서 하기
          </ThemedText>

          {!userId ? (
            <>
              <ThemedText type="small" themeColor="textSecondary" style={styles.lead}>
                함께 하려면 두 사람 다 로그인해야 합니다.
              </ThemedText>
              <Pressable
                onPress={() => router.push('/profile')}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.onAccent}>
                  로그인하러 가기
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                disabled={busy}
                onPress={make}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected },
                  busy && styles.dim,
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.onAccent}>
                  방 만들고 초대 번호 받기
                </ThemedText>
              </Pressable>

              <ThemedText type="small" themeColor="textSecondary" style={[styles.lead, styles.orLine]}>
                또는 친구에게 받은 초대 번호로 들어가기
              </ThemedText>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                style={[
                  styles.codeInput,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
                ]}
              />
              <Pressable
                disabled={busy}
                onPress={join}
                style={({ pressed }) => [styles.secondaryButton, { borderColor: theme.border }, pressed && styles.pressed]}>
                <ThemedText type="smallBold">이 번호로 들어가기</ThemedText>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  backRow: { marginBottom: Spacing.two },
  lead: { lineHeight: 20 },
  line: { lineHeight: 24 },
  orLine: { marginTop: Spacing.three },
  sectionTitle: { marginTop: Spacing.four },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 2, marginTop: Spacing.two },
  errorCard: { borderRadius: 10, padding: 12, marginTop: Spacing.two },
  loading: { marginTop: Spacing.two },
  primaryButton: { borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.two },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  onAccent: { color: '#fff' },
  codeInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 24,
    letterSpacing: 6,
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  dim: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
