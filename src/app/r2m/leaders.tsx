import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getIsAdmin } from '@/db/profile';
import { getEnrolledUsersStatus, type DailyChecklist, type EnrolledUserStatus } from '@/db/r2m';

const CHECKLIST_DOTS: { key: keyof DailyChecklist; label: string }[] = [
  { key: 'qt', label: 'QT' },
  { key: 'reading', label: '읽기' },
  { key: 'meditation', label: '묵상' },
  { key: 'prayer', label: '기도' },
  { key: 'memorization', label: '암송' },
  { key: 'obedience', label: '순종' },
  { key: 'gratitude', label: '감사' },
];

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function R2MLeadersScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<EnrolledUserStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      getIsAdmin(session.user.id)
        .then(setIsAdmin)
        .catch(() => setIsAdmin(false));
      getEnrolledUsersStatus()
        .then(setUsers)
        .catch((e) => setError(e?.message ?? String(e)));
    }, [session]),
  );

  if (loading) return null;

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">마이페이지에서 로그인해주세요.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (isAdmin === false) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">관리자만 접근할 수 있어요.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            리더관리
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            오늘의 훈련 완료 여부만 확인할 수 있어요. 묵상/기도 내용은 어떤 관리자도 볼 수 없습니다.
          </ThemedText>

          {error && (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          )}

          {users.map((u) => {
            const inactive = !u.lastActivityAt || daysSince(u.lastActivityAt) >= 3;
            return (
              <View key={u.userId} style={[styles.userCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.userHeader}>
                  <ThemedText type="smallBold">{u.username}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {u.courseTitle}
                  </ThemedText>
                </View>
                <View style={styles.dotsRow}>
                  {CHECKLIST_DOTS.map((d) => (
                    <View key={d.key} style={styles.dotWrap}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: u.today[d.key] ? theme.accent : theme.background },
                        ]}
                      />
                      <ThemedText type="small" themeColor="textSecondary">
                        {d.label}
                      </ThemedText>
                    </View>
                  ))}
                </View>
                {inactive && (
                  <ThemedText type="small" style={styles.inactiveText}>
                    ⚠️ 최근 활동 없음 — 관심이 필요해요
                  </ThemedText>
                )}
              </View>
            );
          })}

          {users.length === 0 && !error && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              아직 등록된 훈련생이 없어요.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  safeAreaCentered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
  },
  errorText: {
    color: '#e03131',
  },
  userCard: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  dotWrap: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  inactiveText: {
    color: '#e8590c',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
});
