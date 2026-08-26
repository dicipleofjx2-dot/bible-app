import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { createDuel, joinDuel } from '@/lib/arena/duel';
import { ESCAPE_ROOMS } from '@/lib/arena/rooms';

const LEVEL_LABEL = ['', '쉬움', '보통', '어려움'];

/** 대결 시작 화면 — 만들거나, 번호를 넣고 들어가거나. */
export default function DuelHomeScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  async function make(roomId: string) {
    setBusy(true);
    setError(null);
    try {
      const id = await createDuel(roomId);
      router.replace(`/arena/duel/${id}` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : '대결을 만들지 못했습니다');
      setBusy(false);
    }
  }

  async function join() {
    const trimmed = code.replace(/\D/g, '');
    if (trimmed.length !== 6) {
      setError('여섯 자리 번호를 넣어 주세요');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await joinDuel(trimmed);
      router.replace(`/arena/duel/${id}` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : '들어가지 못했습니다');
      setBusy(false);
    }
  }

  if (!userId) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
              <ThemedText type="smallBold">← 뒤로</ThemedText>
            </Pressable>
            <ThemedText type="title">⚔️ 둘이 겨루기</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.lead}>
              겨루려면 두 사람 다 로그인해야 합니다. 누가 이겼는지 남겨야 하니까요.
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
          </ScrollView>
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

          <ThemedText type="title">⚔️ 둘이 겨루기</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.lead}>
            같은 방에 둘이 동시에 들어가 누가 먼저 나오는지 겨룹니다. 상대가 몇 번째
            자물쇠를 풀고 있는지 화면 위에 보여요.
          </ThemedText>

          {error && (
            <View style={[styles.errorCard, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="small" style={{ color: theme.accent }}>
                {error}
              </ThemedText>
            </View>
          )}

          {busy && <ActivityIndicator style={styles.loading} />}

          {!picking ? (
            <>
              <Pressable
                disabled={busy}
                onPress={() => setPicking(true)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.onAccent}>
                  대결 만들기
                </ThemedText>
              </Pressable>

              <ThemedText type="subtitle" style={styles.sectionTitle}>
                번호로 들어가기
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                상대가 알려 준 여섯 자리 번호를 넣으세요.
              </ThemedText>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                placeholder="000000"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.codeInput,
                  { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text },
                ]}
              />
              <Pressable
                disabled={busy}
                onPress={join}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">들어가기</ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                어느 방에서 겨룰까요?
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                둘 다 이 방에 들어갑니다. 겨루기는 개인 기록(두 판)에 들어가지 않아요.
              </ThemedText>
              {ESCAPE_ROOMS.map((room) => (
                <Pressable
                  key={room.id}
                  disabled={busy}
                  onPress={() => make(room.id)}
                  style={({ pressed }) => [
                    styles.roomRow,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText style={styles.roomEmoji}>{room.emoji}</ThemedText>
                  <View style={styles.roomBody}>
                    <ThemedText type="smallBold">{room.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {room.passage} · {LEVEL_LABEL[room.level]}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setPicking(false)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">그만두기</ThemedText>
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
  sectionTitle: { marginTop: Spacing.four },
  errorCard: { borderRadius: 10, padding: 12, marginTop: Spacing.two },
  loading: { marginTop: Spacing.two },
  primaryButton: { borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.three },
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
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  roomEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  roomBody: { flex: 1, minWidth: 0, gap: 2 },
  pressed: { opacity: 0.7 },
});
