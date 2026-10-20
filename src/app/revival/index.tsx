import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  REVIVAL_MINISTRIES,
  formatMeetsOn,
  getUpcomingSessions,
  isAppAdmin,
  type RevivalSession,
} from '@/db/revival';

/**
 * 부흥의 천사들 — 네 사역의 문.
 *
 * 사역은 넷이고 바뀌지 않는다. 바뀌는 것은 **언제 하는가**다. 그래서 각 칸에
 * 다음 날짜를 함께 적는다 — 날짜가 없으면 들어가 봐야 신청할 자리가 없다.
 */
export default function RevivalHomeScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const [sessions, setSessions] = useState<RevivalSession[]>([]);
  const [admin, setAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getUpcomingSessions()
        .then((rows) => {
          if (!cancelled) setSessions(rows);
        })
        .catch(() => {
          /* 일정을 못 읽어도 사역 칸은 보여야 한다 */
        });
      if (session) {
        isAppAdmin(session.user.id)
          .then((v) => {
            if (!cancelled) setAdmin(v);
          })
          .catch(() => setAdmin(false));
      } else {
        setAdmin(false);
      }
      return () => {
        cancelled = true;
      };
    }, [session]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            부흥의 천사들
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            네 가지 사역으로 섬깁니다. 날짜를 보시고 들어가 기도를 신청하세요.
          </ThemedText>

          {REVIVAL_MINISTRIES.map((m) => {
            // 그 사역의 가장 가까운 날. 일정은 이미 날짜순으로 와 있다.
            const next = sessions.find((s) => s.kind === m.kind);
            return (
              <Pressable
                key={m.kind}
                onPress={() => router.push(`/revival/${m.kind}`)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.cardHead}>
                  <ThemedText style={styles.emoji}>{m.emoji}</ThemedText>
                  <View style={styles.cardTitleWrap}>
                    <ThemedText type="smallBold">{m.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {m.summary}
                    </ThemedText>
                  </View>
                </View>
                {next ? (
                  <ThemedText type="smallBold" themeColor="accent" style={styles.when}>
                    {formatMeetsOn(next.meetsOn)}
                    {next.place ? ` · ${next.place}` : ''}
                  </ThemedText>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.when}>
                    다음 날짜가 아직 정해지지 않았습니다
                  </ThemedText>
                )}
              </Pressable>
            );
          })}

          {admin && (
            <Pressable
              onPress={() => router.push('/revival/admin')}
              style={({ pressed }) => [
                styles.adminButton,
                { borderColor: theme.accent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="accent">
                사역 관리 — 날짜 정하기 · 신청자 보기
              </ThemedText>
            </Pressable>
          )}

          {!session && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
              기도를 신청하시려면 먼저 로그인해 주세요.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  title: { fontSize: 26 },
  card: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.two },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  cardTitleWrap: { flex: 1, gap: 2 },
  emoji: { fontSize: 28 },
  when: { marginTop: Spacing.one },
  adminButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    alignItems: 'center',
  },
  footnote: { textAlign: 'center', marginTop: Spacing.three },
  pressed: { opacity: 0.7 },
});
