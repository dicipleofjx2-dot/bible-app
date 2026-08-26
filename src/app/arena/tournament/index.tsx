import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getIsAdmin } from '@/db/profile';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { listTournaments, roundName, type Tournament } from '@/lib/arena/tournament';

const STATUS_LABEL: Record<Tournament['status'], string> = {
  draft: '준비 중',
  qualifying: '예선 진행 중',
  bracket: '본선 진행 중',
  done: '끝난 대회',
};

export default function TournamentListScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Tournament[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [rows, admin] = await Promise.all([
          listTournaments(),
          userId ? getIsAdmin(userId).catch(() => false) : Promise.resolve(false),
        ]);
        if (cancelled) return;
        setList(rows);
        setIsAdmin(admin);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
            <ThemedText type="smallBold">← 뒤로</ThemedText>
          </Pressable>

          <ThemedText type="title">🏅 대회</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.lead}>
            예선은 방탈출 기록으로 가립니다. 대회 기간에 방을 많이 나올수록 좋은
            자리에서 본선을 시작해요.
          </ThemedText>

          {isAdmin && (
            <Pressable
              onPress={() => router.push('/arena/tournament/admin' as Href)}
              style={({ pressed }) => [
                styles.adminButton,
                { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">⚙️ 대회 관리 (관리자)</ThemedText>
            </Pressable>
          )}

          {loading ? (
            <ActivityIndicator style={styles.loading} />
          ) : list.length === 0 ? (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
                아직 열린 대회가 없습니다. 대회가 열리면 여기에 보입니다 — 그때까지는
                방탈출에서 기록을 쌓아 두세요. 그 기록이 그대로 예선 점수가 됩니다.
              </ThemedText>
            </View>
          ) : (
            list.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => router.push(`/arena/tournament/${t.id}` as Href)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">{t.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.line}>
                  {STATUS_LABEL[t.status]}
                  {t.status === 'bracket' && t.current_round ? ` · ${roundName(t.current_round)}` : ''}
                  {t.status === 'qualifying' ? ` · ${t.qualify_from} ~ ${t.qualify_to}` : ''}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  본선 {t.bracket_size}명
                </ThemedText>
              </Pressable>
            ))
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
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 4, marginTop: Spacing.two },
  line: { lineHeight: 20 },
  adminButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  loading: { marginTop: Spacing.three },
  pressed: { opacity: 0.7 },
});
