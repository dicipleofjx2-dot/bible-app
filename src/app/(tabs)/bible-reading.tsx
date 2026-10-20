import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  getLeaderScope,
  getMissionsForWeek,
  getMyActiveEnrollment,
  type ActiveEnrollment,
  type Mission,
} from '@/db/r2m';
import { useI18n } from '@/lib/i18n';

export default function R2MDashboardScreen() {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const { session } = useAuth();
  // 관리자뿐 아니라 리더로 지정된 회원도 리더관리에 들어간다.
  const [canLead, setCanLead] = useState(false);
  const [enrollment, setEnrollment] = useState<ActiveEnrollment | null | undefined>(undefined);
  const [missions, setMissions] = useState<Mission[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setCanLead(false);
        setEnrollment(null);
        setMissions([]);
        return;
      }
      getLeaderScope(session.user.id)
        .then((s) => setCanLead(s.isAdmin || s.isLeader))
        .catch(() => setCanLead(false));
      getMyActiveEnrollment(session.user.id, lang)
        .then((e) => {
          setEnrollment(e);
          if (e) {
            getMissionsForWeek(e.courseId, e.currentWeek)
              .then(setMissions)
              .catch(() => setMissions([]));
          } else {
            setMissions([]);
          }
        })
        .catch(() => setEnrollment(null));
    }, [session, lang]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeAreaOuter}>
        <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            R2M
          </ThemedText>

          {enrollment === null && (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="smallBold">{t('r2m.home.noCourseTitle')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('r2m.home.noCourseBody')}
              </ThemedText>
              <Pressable
                onPress={() => router.push('/r2m/courses')}
                style={[styles.primaryButton, { backgroundColor: theme.accent }]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {t('r2m.home.browse')}
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}

          {enrollment && (
            <>
              <ThemedView type="backgroundElement" style={styles.headerCard}>
                <ThemedText type="smallBold">{enrollment.courseTitle}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('r2m.home.weekProgress', {
                    week: enrollment.currentWeek,
                    total: enrollment.totalWeeks,
                  })}
                </ThemedText>
                {enrollment.leaderMessage ? (
                  <View style={[styles.leaderMessage, { borderColor: theme.accent }]}>
                    <ThemedText type="small">💬 {enrollment.leaderMessage}</ThemedText>
                  </View>
                ) : null}
              </ThemedView>

              {missions.length > 0 && (
                <View style={styles.section}>
                  <ThemedText type="smallBold">{t('r2m.home.missions')}</ThemedText>
                  {missions.map((m) => (
                    <ThemedText key={m.id} type="small" themeColor="textSecondary">
                      • {m.body}
                    </ThemedText>
                  ))}
                </View>
              )}
            </>
          )}

          <View style={styles.linksRow}>
            {/* 목장방(/r2m/cell)은 없앴다(2026-09-23). 홈 바둑판의 🏡 신바람목장이
                같은 목장을 훨씬 넓게 연다 — 공지·소통창·모임 보고가 모두 그리로
                옮겨 갔고 표는 그대로라 옛 글이 그대로 이어진다. 여기 링크를 남겨
                두면 같은 목장으로 가는 문이 둘이 되어, 어느 쪽에 적었는지 서로
                모르게 된다. */}
            <Pressable onPress={() => router.push('/r2m/courses')}>
              <ThemedText type="link" themeColor="textSecondary">
                {t('nav.courses')}
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push('/r2m/progress')}>
              <ThemedText type="link" themeColor="textSecondary">
                {t('r2m.progress.title')}
              </ThemedText>
            </Pressable>
            {canLead && (
              <Pressable onPress={() => router.push('/r2m/leaders')}>
                <ThemedText type="link" themeColor="textSecondary">
                  {t('r2m.leaders.title')}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeAreaOuter: {
    flex: 1,
    width: '100%',
  },
  scrollOuter: {
    flex: 1,
    width: '100%',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 32,
  },
  emptyCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    marginTop: Spacing.one,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  headerCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  leaderMessage: {
    marginTop: Spacing.two,
    paddingLeft: Spacing.two,
    borderLeftWidth: 2,
  },
  section: {
    gap: Spacing.two,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
});
