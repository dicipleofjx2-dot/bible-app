import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getFirstQtEntry, getQtEntryForDate, getVersesForRange } from '@/db/bible';
import { getMyActiveEnrollment, getTodayChecklistCount, type ActiveEnrollment } from '@/db/r2m';
import { getMeditationNote } from '@/db/userData';
import { getLatestLetter, type ShepherdLetter } from '@/db/shepherdLetters';
import { getLatestNotice, type Notice } from '@/db/notices';
import { hasUnseenLetter } from '@/lib/shepherdLetterBadge';
import type { Href } from 'expo-router';

function todayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type JourneyStep = { label: string; href: Href; done?: boolean };

const RECOMMENDED: { emoji: string; label: string; href: Href; requiresAuth?: boolean }[] = [
  { emoji: '📕', label: '데이빗북스', href: '/library' },
  { emoji: '📆', label: '성경통독도우미', href: '/reading-helper', requiresAuth: true },
];

export default function HomeScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { session } = useAuth();

  const [verseRef, setVerseRef] = useState('');
  const [verseExcerpt, setVerseExcerpt] = useState('');
  const [qtDoneToday, setQtDoneToday] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [enrollment, setEnrollment] = useState<ActiveEnrollment | null>(null);
  const [checklistCount, setChecklistCount] = useState(0);
  const [letter, setLetter] = useState<ShepherdLetter | null>(null);
  const [letterUnseen, setLetterUnseen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const today = todayDateString();
        let qt = await getQtEntryForDate(db, today);
        if (!qt) qt = await getFirstQtEntry(db);
        if (qt) {
          const verses = await getVersesForRange(db, qt.bookId, qt.chapter, qt.startVerse, qt.endVerse, 'open_ko');
          setVerseRef(qt.label);
          setVerseExcerpt(verses.map((v) => v.text).join(' '));
        }
        const note = await getMeditationNote(today).catch(() => null);
        setQtDoneToday(!!note);
      })();
    }, [db]),
  );

  useFocusEffect(
    useCallback(() => {
      getLatestNotice()
        .then(setNotice)
        .catch(() => setNotice(null));
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      getLatestLetter()
        .then(async (l) => {
          setLetter(l);
          setLetterUnseen(await hasUnseenLetter(l?.createdAt ?? null));
        })
        .catch(() => setLetter(null));
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setEnrollment(null);
        setChecklistCount(0);
        return;
      }
      getMyActiveEnrollment(session.user.id)
        .then(setEnrollment)
        .catch(() => setEnrollment(null));
      getTodayChecklistCount(session.user.id)
        .then(setChecklistCount)
        .catch(() => setChecklistCount(0));
    }, [session]),
  );

  const journeySteps: JourneyStep[] = [
    { label: 'QT', href: '/meditation', done: qtDoneToday },
    { label: '묵상', href: '/word-notes' },
    { label: '기도', href: '/prayer-group' },
    { label: '순종', href: '/spiritual-journal' },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeAreaOuter}>
        <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.safeArea}>
          {/* 1. 오늘의 말씀 — 화면의 유일한 Primary 버튼("QT 시작")을 담는 히어로 카드 */}
          <ThemedView type="backgroundElement" style={styles.heroCard}>
            <ThemedText type="small" themeColor="textSecondary">
              오늘의 말씀
            </ThemedText>
            {verseRef ? (
              <>
                <ThemedText type="smallBold" themeColor="accent">
                  {verseRef}
                </ThemedText>
                <ThemedText style={styles.heroExcerpt} numberOfLines={4}>
                  {verseExcerpt}
                </ThemedText>
              </>
            ) : (
              <ThemedText themeColor="textSecondary">오늘의 QT 본문을 준비하고 있어요.</ThemedText>
            )}
            <Pressable
              onPress={() => router.push('/meditation')}
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                QT 시작하기
              </ThemedText>
            </Pressable>
          </ThemedView>

          {/* 2. 오늘의 영적 여정 */}
          <View style={styles.journeyRow}>
            {journeySteps.map((step, i) => (
              <View key={step.label} style={styles.journeyStepWrap}>
                <Pressable onPress={() => router.push(step.href)} style={({ pressed }) => [pressed && styles.pressed]}>
                  <View
                    style={[
                      styles.journeyDot,
                      { backgroundColor: step.done ? theme.accent : theme.backgroundElement },
                    ]}>
                    <ThemedText type="small" themeColor={step.done ? undefined : 'textSecondary'} style={step.done ? styles.journeyDotDoneText : undefined}>
                      {step.done ? '✓' : i + 1}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.journeyLabel}>
                    {step.label}
                  </ThemedText>
                </Pressable>
                {i < journeySteps.length - 1 && <View style={[styles.journeyLine, { backgroundColor: theme.backgroundElement }]} />}
              </View>
            ))}
          </View>

          {/* 3. 알림마당 — 제목만 노출되는 한 줄 스트립 */}
          <Pressable
            onPress={() => router.push('/notice-board')}
            style={({ pressed }) => [styles.noticeStrip, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <ThemedText type="small" numberOfLines={1} style={styles.noticeStripText}>
              📢 {notice ? notice.title : '등록된 소식이 없어요'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              더보기 ›
            </ThemedText>
          </Pressable>

          {/* 4. R2M */}
          <Pressable
            onPress={() => router.push('/bible-reading')}
            style={({ pressed }) => [styles.card, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              R2M
            </ThemedText>
            {enrollment ? (
              <ThemedText type="smallBold">
                {enrollment.courseTitle} · {enrollment.currentWeek}/{enrollment.totalWeeks}주차 · 오늘의 훈련 {checklistCount}/7
              </ThemedText>
            ) : (
              <ThemedText type="smallBold">훈련과정에 등록해보세요</ThemedText>
            )}
          </Pressable>

          {/* 5. 목자의 편지 */}
          <Pressable
            onPress={() => router.push('/shepherd-letters')}
            style={({ pressed }) => [styles.card, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <View style={styles.letterHeader}>
              <ThemedText type="small" themeColor="textSecondary">
                목자의 편지
              </ThemedText>
              {letterUnseen && (
                <View style={[styles.newPill, { backgroundColor: theme.accent }]}>
                  <ThemedText type="small" style={styles.newPillText}>
                    NEW
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText type="smallBold" numberOfLines={1}>
              {letter ? letter.title : '아직 등록된 편지가 없어요'}
            </ThemedText>
          </Pressable>

          {/* 6. 커뮤니티 */}
          <Pressable
            onPress={() => router.push(session ? '/community' : '/profile')}
            style={({ pressed }) => [styles.card, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor="textSecondary">
              커뮤니티
            </ThemedText>
            <ThemedText type="smallBold">성도들과 나누는 소식과 글</ThemedText>
          </Pressable>

          {/* 7. 추천 콘텐츠 */}
          <View style={styles.recommendedRow}>
            {RECOMMENDED.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.requiresAuth && !session ? '/profile' : item.href)}
                style={({ pressed }) => [styles.recommendedItem, pressed && styles.pressed]}>
                <ThemedText type="small">{item.emoji} {item.label}</ThemedText>
              </Pressable>
            ))}
          </View>

          {/* 8. 후원 — 카드가 아닌 옅은 풋터 링크 */}
          <Pressable onPress={() => router.push('/support')} style={styles.supportLink}>
            <ThemedText type="small" themeColor="textSecondary">
              🤍 David Bible 후원하기
            </ThemedText>
          </Pressable>
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
  safeArea: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  heroCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  heroExcerpt: {
    lineHeight: 24,
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
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  journeyStepWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  journeyDot: {
    width: 36,
    height: 36,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  journeyDotDoneText: {
    color: '#ffffff',
  },
  journeyLabel: {
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  journeyLine: {
    flex: 1,
    height: 2,
    marginHorizontal: Spacing.half,
    marginBottom: Spacing.four,
  },
  noticeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  noticeStripText: {
    flex: 1,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  letterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  newPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.three,
  },
  newPillText: {
    color: '#ffffff',
    fontSize: 11,
  },
  recommendedRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  recommendedItem: {
    paddingVertical: Spacing.one,
  },
  supportLink: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
