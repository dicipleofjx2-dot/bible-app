import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  deleteMyAccount,
  getAccountSummary,
  labelOf,
  type AccountSummary,
} from '@/db/deleteAccount';

/**
 * 계정 삭제.
 *
 * 구글 플레이 정책이 요구하는 화면이다 — 앱 안에서 계정을 지울 수 있어야 하고,
 * 무엇이 함께 지워지는지 알려야 한다. 그래서 지우기 전에 **내 기록을 세어 보여 준다.**
 * 실수로 누르는 일이 없도록 「삭제」 두 글자를 손으로 적게 한다.
 */
const CONFIRM_WORD = '삭제';

// 되돌릴 수 없는 단추에만 쓰는 붉은색. 테마에는 없는 색이라 여기서만 정한다.
const DANGER = '#B3261E';

export default function DeleteAccountScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const email = session?.user?.email ?? '';

  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!session) return;
    getAccountSummary()
      .then(setSummary)
      .catch(() => setSummary({}));
  }, [session]);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount();
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '계정을 지우지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThemedText type="title">계정을 지웠습니다</ThemedText>
            <ThemedText themeColor="textSecondary">
              그동안 함께해 주셔서 고맙습니다. 언제든 다시 오시면 새로 시작하실 수 있습니다.
            </ThemedText>
            <Pressable
              onPress={() => router.replace('/')}
              style={[styles.button, { backgroundColor: theme.accent }]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                처음 화면으로
              </ThemedText>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ThemedText type="title">계정 삭제</ThemedText>
            <ThemedText themeColor="textSecondary">
              계정을 지우려면 먼저 로그인해 주세요. 본인 확인을 위해서입니다.
            </ThemedText>
            <Pressable
              onPress={() => router.push('/profile')}
              style={[styles.button, { backgroundColor: theme.accent }]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                로그인하러 가기
              </ThemedText>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const rows = Object.entries(summary ?? {});

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title">계정 삭제</ThemedText>
          {!!email && (
            <ThemedText themeColor="textSecondary">지금 로그인한 계정 · {email}</ThemedText>
          )}

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">함께 지워지는 것</ThemedText>
            {summary === null ? (
              <ThemedText themeColor="textSecondary">기록을 세는 중…</ThemedText>
            ) : rows.length === 0 ? (
              <ThemedText themeColor="textSecondary">
                지워질 개인 기록이 없습니다.
              </ThemedText>
            ) : (
              <View style={styles.list}>
                {rows.map(([table, count]) => (
                  <View key={table} style={styles.row}>
                    <ThemedText>{labelOf(table)}</ThemedText>
                    <ThemedText themeColor="textSecondary">{count}건</ThemedText>
                  </View>
                ))}
              </View>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              통독·큐티·감사일기 같은 개인 기록은 계정과 함께 사라지고 되돌릴 수 없습니다.
              게시판이나 기도나무에 남기신 글은 다른 분들의 대화가 끊기지 않도록 글은 남고
              작성자 이름만 지워집니다.
            </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">지우기 전에 한 번만 더</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              기록을 남겨 두고 싶으시면 삭제 대신 <ThemedText type="smallBold">로그아웃</ThemedText>만
              하셔도 됩니다. 다른 계정으로 옮기려던 것이라면{' '}
              <ThemedText type="smallBold">예전 기록 이어받기</ThemedText>를 먼저 보세요.
            </ThemedText>
            <Pressable
              onPress={() => router.push('/claim-account')}
              style={[styles.buttonQuiet, { borderColor: theme.border }]}>
              <ThemedText type="link">예전 기록 이어받기</ThemedText>
            </Pressable>
          </View>

          <View style={styles.confirmBox}>
            <ThemedText type="smallBold">
              정말 지우시려면 «{CONFIRM_WORD}» 두 글자를 적어 주세요
            </ThemedText>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              placeholder={CONFIRM_WORD}
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text, backgroundColor: theme.background },
              ]}
              autoCapitalize="none"
            />
          </View>

          {!!error && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold" style={{ color: DANGER }}>
                지우지 못했습니다
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                이 문구를 그대로 알려 주시면 도와드릴 수 있습니다.
              </ThemedText>
            </View>
          )}

          <Pressable
            disabled={typed.trim() !== CONFIRM_WORD || busy}
            onPress={handleDelete}
            style={[
              styles.button,
              {
                backgroundColor:
                  typed.trim() === CONFIRM_WORD && !busy ? (DANGER) : theme.border,
              },
            ]}>
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              {busy ? '지우는 중…' : '계정을 영구히 삭제합니다'}
            </ThemedText>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.buttonQuiet}>
            <ThemedText type="link" themeColor="textSecondary">
              그만두기
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', width: '100%' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  scrollContent: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  card: { borderRadius: 12, padding: Spacing.three, gap: Spacing.two },
  list: { gap: Spacing.one },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmBox: { gap: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
    fontSize: 17,
  },
  button: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  buttonQuiet: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
});
