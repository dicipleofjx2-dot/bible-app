import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { StringKey } from '@/constants/strings';
import {
  getEnrolledUsersStatus,
  getLeaderScope,
  type DailyChecklist,
  type EnrolledUserStatus,
  type LeaderScope,
} from '@/db/r2m';

// 말이 아니라 열쇠만. 모듈 상수에 말을 담으면 처음 언어로 굳는다.
const CHECKLIST_DOTS: { key: keyof DailyChecklist; labelKey: StringKey }[] = [
  { key: 'qt', labelKey: 'r2m.item.qt' },
  { key: 'reading', labelKey: 'r2m.short.reading' },
  { key: 'meditation', labelKey: 'r2m.short.meditation' },
  { key: 'prayer', labelKey: 'r2m.short.prayer' },
  { key: 'memorization', labelKey: 'r2m.short.memorization' },
  { key: 'obedience', labelKey: 'r2m.short.obedience' },
  { key: 'gratitude', labelKey: 'r2m.short.gratitude' },
];

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function R2MLeadersScreen() {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const { session, loading } = useAuth();
  const [scope, setScope] = useState<LeaderScope | null>(null);
  const [users, setUsers] = useState<EnrolledUserStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      const userId = session.user.id;
      // 명단은 자격에 따라 범위가 달라지므로 자격을 먼저 확인하고 나서 부른다.
      getLeaderScope(userId)
        .then((s) => {
          setScope(s);
          if (!s.isAdmin && !s.isLeader) return;
          return getEnrolledUsersStatus(userId, s, lang).then(setUsers);
        })
        .catch((e) => setError(e?.message ?? String(e)));
    }, [session, lang]),
  );

  if (loading) return null;

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">{t('r2m.needLogin')}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (scope && !scope.isAdmin && !scope.isLeader) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">{t('r2m.leaders.onlyLeaders')}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            {t('r2m.leaders.title')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {scope?.isAdmin ? t('r2m.leaders.noteAdmin') : t('r2m.leaders.noteLeader')}
          </ThemedText>

          {scope?.isAdmin && (
            <Pressable
              onPress={() => router.push('/r2m/leader-assign')}
              style={({ pressed }) => [
                styles.assignButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">{t('r2m.leaders.assignLink')}</ThemedText>
            </Pressable>
          )}

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
                    {u.courseTitle || t('r2m.leaders.noCourse')}
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
                        {t(d.labelKey)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
                {inactive && (
                  <ThemedText type="small" style={styles.inactiveText}>
                    {t('r2m.leaders.inactive')}
                  </ThemedText>
                )}
              </View>
            );
          })}

          {users.length === 0 && !error && scope && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              {scope.isAdmin ? t('r2m.leaders.emptyAdmin') : t('r2m.leaders.emptyLeader')}
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
  assignButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
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
