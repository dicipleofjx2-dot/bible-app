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
  getTodayChecklist,
  type ActiveEnrollment,
  type DailyChecklist,
  type Mission,
} from '@/db/r2m';
import type { Href } from 'expo-router';
import { useI18n } from '@/lib/i18n';
import type { StringKey } from '@/constants/strings';

type ChecklistItem = { key: keyof DailyChecklist; labelKey: StringKey; href: Href };

// 말이 아니라 열쇠만. 모듈 상수에 말을 담으면 처음 언어로 굳는다.
const CHECKLIST_ITEMS: ChecklistItem[] = [
  { key: 'qt', labelKey: 'r2m.item.qt', href: '/meditation' },
  { key: 'reading', labelKey: 'r2m.item.reading', href: '/read' },
  { key: 'meditation', labelKey: 'r2m.item.meditation', href: '/notes' },
  { key: 'prayer', labelKey: 'r2m.item.prayer', href: '/prayer-group' },
  { key: 'memorization', labelKey: 'r2m.item.memorization', href: '/reading-helper' },
  { key: 'obedience', labelKey: 'r2m.item.obedience', href: '/spiritual-journal' },
  { key: 'gratitude', labelKey: 'r2m.item.gratitude', href: '/r2m/gratitude' },
];

const EMPTY_CHECKLIST: DailyChecklist = {
  qt: false,
  reading: false,
  meditation: false,
  prayer: false,
  memorization: false,
  obedience: false,
  gratitude: false,
};

export default function R2MDashboardScreen() {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const { session } = useAuth();
  // 관리자뿐 아니라 리더로 지정된 회원도 리더관리에 들어간다.
  const [canLead, setCanLead] = useState(false);
  const [enrollment, setEnrollment] = useState<ActiveEnrollment | null | undefined>(undefined);
  const [checklist, setChecklist] = useState<DailyChecklist>(EMPTY_CHECKLIST);
  const [missions, setMissions] = useState<Mission[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setCanLead(false);
        setEnrollment(null);
        setChecklist(EMPTY_CHECKLIST);
        setMissions([]);
        return;
      }
      getLeaderScope(session.user.id)
        .then((s) => setCanLead(s.isAdmin || s.isLeader))
        .catch(() => setCanLead(false));
      getTodayChecklist(session.user.id)
        .then(setChecklist)
        .catch(() => setChecklist(EMPTY_CHECKLIST));
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

  const doneCount = Object.values(checklist).filter(Boolean).length;

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
                    done: doneCount,
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

              <View style={styles.section}>
                <ThemedText type="smallBold">{t('r2m.home.todayTraining')}</ThemedText>
                {CHECKLIST_ITEMS.map((item) => {
                  const done = checklist[item.key];
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => router.push(item.href)}
                      style={({ pressed }) => [
                        styles.checklistRow,
                        { backgroundColor: theme.backgroundElement },
                        pressed && styles.pressed,
                      ]}>
                      <View style={[styles.checklistDot, { backgroundColor: done ? theme.accent : theme.background }]}>
                        <ThemedText
                          type="small"
                          themeColor={done ? undefined : 'textSecondary'}
                          style={done ? styles.checklistDotDoneText : undefined}>
                          {done ? '✓' : ''}
                        </ThemedText>
                      </View>
                      <ThemedText type="smallBold" style={styles.checklistLabel}>
                        {t(item.labelKey)}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {done ? t('r2m.home.done') : t('r2m.home.go')}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.linksRow}>
            {/* 목장방은 누구에게나 보인다. 교적에 목장이 없는 사람에게는 화면이
                왜 비어 있는지 안내한다 — 단추를 감추면 물어볼 곳이 없어진다. */}
            <Pressable onPress={() => router.push('/r2m/cell')}>
              <ThemedText type="link" themeColor="accent">
                {t('nav.cellRoom')}
              </ThemedText>
            </Pressable>
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
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  checklistDot: {
    width: 28,
    height: 28,
    borderRadius: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistDotDoneText: {
    color: '#ffffff',
  },
  checklistLabel: {
    flex: 1,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
