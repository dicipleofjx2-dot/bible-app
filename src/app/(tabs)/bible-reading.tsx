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

type ChecklistItem = { key: keyof DailyChecklist; label: string; href: Href };

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { key: 'qt', label: 'QT', href: '/meditation' },
  { key: 'reading', label: '성경읽기', href: '/read' },
  { key: 'meditation', label: '묵상', href: '/notes' },
  { key: 'prayer', label: '기도', href: '/prayer-group' },
  { key: 'memorization', label: '말씀암송', href: '/reading-helper' },
  { key: 'obedience', label: '순종', href: '/spiritual-journal' },
  { key: 'gratitude', label: '감사', href: '/r2m/gratitude' },
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
      getMyActiveEnrollment(session.user.id)
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
    }, [session]),
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
              <ThemedText type="smallBold">아직 등록된 훈련과정이 없어요</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                말씀을 읽고, 묵상하고, 기도하고, 순종하며 함께 성장하는 R2M 훈련과정에 참여해보세요.
              </ThemedText>
              <Pressable
                onPress={() => router.push('/r2m/courses')}
                style={[styles.primaryButton, { backgroundColor: theme.accent }]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  훈련과정 둘러보기
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}

          {enrollment && (
            <>
              <ThemedView type="backgroundElement" style={styles.headerCard}>
                <ThemedText type="smallBold">{enrollment.courseTitle}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {enrollment.currentWeek} / {enrollment.totalWeeks}주차 · 이번 주 진행률 {doneCount}/7
                </ThemedText>
                {enrollment.leaderMessage ? (
                  <View style={[styles.leaderMessage, { borderColor: theme.accent }]}>
                    <ThemedText type="small">💬 {enrollment.leaderMessage}</ThemedText>
                  </View>
                ) : null}
              </ThemedView>

              {missions.length > 0 && (
                <View style={styles.section}>
                  <ThemedText type="smallBold">이번 주 미션</ThemedText>
                  {missions.map((m) => (
                    <ThemedText key={m.id} type="small" themeColor="textSecondary">
                      • {m.body}
                    </ThemedText>
                  ))}
                </View>
              )}

              <View style={styles.section}>
                <ThemedText type="smallBold">오늘의 훈련</ThemedText>
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
                        {item.label}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {done ? '완료' : '하러 가기 ›'}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.linksRow}>
            <Pressable onPress={() => router.push('/r2m/courses')}>
              <ThemedText type="link" themeColor="textSecondary">
                훈련과정
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push('/r2m/progress')}>
              <ThemedText type="link" themeColor="textSecondary">
                성장기록
              </ThemedText>
            </Pressable>
            {canLead && (
              <Pressable onPress={() => router.push('/r2m/leaders')}>
                <ThemedText type="link" themeColor="textSecondary">
                  리더관리
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
