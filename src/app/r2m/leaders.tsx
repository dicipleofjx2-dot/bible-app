import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { StringKey } from '@/constants/strings';
import { getDevotionBoard, getMyLedCellId, type DevotionRow } from '@/db/cell';
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
  // 내가 목자인 목장과 그 목장의 이번 주 경건생활. 목자가 아니면 비어 있다.
  const [ledCellId, setLedCellId] = useState<string | null>(null);
  const [devotion, setDevotion] = useState<DevotionRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      const userId = session.user.id;
      // 명단은 자격에 따라 범위가 달라지므로 자격을 먼저 확인하고 나서 부른다.
      // 목장의 목자면 리더관리를 볼 수 있다. 예전에는 r2m_leaders 라는 별개
      // 표에 이름이 있어야 했고, 실제로 목자 열두 분 중 한 분이 빠져 있었다.
      // 목장이 정본이므로 목자를 바꿀 때 그 표를 따로 손볼 필요가 없어야 한다.
      getMyLedCellId()
        .then((cellId) => {
          setLedCellId(cellId);
          if (cellId) return getDevotionBoard(cellId).then(setDevotion);
        })
        .catch(() => setLedCellId(null));

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

  // 목장의 목자도 들어온다 — 옛 리더 표에 이름이 없어도.
  if (scope && !scope.isAdmin && !scope.isLeader && !ledCellId) {
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

          {/* ── 우리 목장 경건생활 (목자에게만) ──
              옛 배정표(r2m_leader_members)가 아니라 교적의 목장을 본다. 둘이
              어긋나 있어서(24건 중 7건) 목자가 남의 목원을 보고 있었다. */}
          {ledCellId && devotion.length > 0 && (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                우리 목장 이번 주
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                지난 7일 동안 며칠 했는지입니다. 뜸한 분에게 문자로 안부를 물어 주세요.
              </ThemedText>
              {devotion.map((d) => {
                const total = d.qt + d.reading + d.meditation + d.obedience + d.gratitude;
                return (
                  <ThemedView key={d.userId} type="backgroundElement" style={styles.devotionCard}>
                    <View style={styles.devotionHeader}>
                      <ThemedText type="smallBold">{d.name}</ThemedText>
                      {d.phone ? (
                        <Pressable
                          onPress={() => Linking.openURL(`sms:${d.phone}`)}
                          hitSlop={8}
                          style={[styles.smsButton, { borderColor: theme.accent }]}>
                          <ThemedText type="small" themeColor="accent">
                            문자로 격려
                          </ThemedText>
                        </Pressable>
                      ) : (
                        <ThemedText type="small" themeColor="textSecondary">
                          연락처 없음
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText type="small" themeColor={total === 0 ? 'textSecondary' : 'text'}>
                      큐티 {d.qt} · 통독 {d.reading} · 묵상 {d.meditation} · 순종 {d.obedience} ·
                      감사 {d.gratitude}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      성경읽기 {d.bibleReading} · 암송 {d.memorization}
                      {d.lastActive ? ` · 마지막 ${d.lastActive}` : ' · 이번 주 기록 없음'}
                    </ThemedText>
                  </ThemedView>
                );
              })}
            </>
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
  sectionTitle: { marginTop: Spacing.four },
  devotionCard: { padding: Spacing.three, borderRadius: Spacing.three, gap: 2 },
  devotionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Spacing.two },
  smsButton: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Spacing.two, borderWidth: 1 },
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
