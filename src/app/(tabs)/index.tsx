import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PopupNoticeModal } from '@/components/PopupNoticeModal';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useGradient, useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getFirstQtEntry, getQtEntryForDate, getVersesForRange, DEFAULT_TRANSLATION } from '@/db/bible';
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

// 새부대교회 스마트주보는 별도 Next.js 앱(dg-smart-bulletin)으로 배포되어 있어
// 내부 라우트가 아니라 외부 링크로 연다.
const SMART_BULLETIN_URL = 'https://dg-smart-bulletin.vercel.app/church/saebudae-church';

const CHURCH_HOME_URL = 'https://newwineskin.co.kr';

/**
 * 홈 화면 바둑판.
 *
 * 예전에는 알림마당·R2M·목자편지가 각각 큰 카드였고 나머지는 아래 작은 줄에
 * 몰려 있었다. 카드가 커서 화면 하나에 서너 개밖에 안 들어와, 아래쪽 기능은
 * 있는 줄도 모르고 지나쳤다. 아이콘 바둑판으로 바꿔 한눈에 다 보이게 한다.
 *
 * 순서는 교회에서 자주 여는 차례대로다.
 */
type HomeTile = {
  emoji: string;
  label: string;
  href: Href;
  /** 로그인해야 쓸 수 있는 곳 — 안 했으면 마이페이지로 보낸다 */
  requiresAuth?: boolean;
  /** 앱 밖으로 나가는 곳 */
  externalUrl?: string;
};

// 공지사항은 바둑판에 넣지 않는다 — 제목이 바로 보이는 한 줄 띠가 위에 따로
// 있고, 그게 아이콘 한 칸보다 훨씬 잘 읽힌다.
const HOME_TILES: HomeTile[] = [
  { emoji: '💌', label: '목자의 편지', href: '/shepherd-letters' },
  { emoji: '🔥', label: 'R2M훈련', href: '/bible-reading' },
  { emoji: '📆', label: '성경통독도우미', href: '/reading-helper', requiresAuth: true },
  { emoji: '📰', label: '새부대스마트주보', href: '/' as Href, externalUrl: SMART_BULLETIN_URL },
  { emoji: '🏠', label: '새부대홈페이지', href: '/' as Href, externalUrl: CHURCH_HOME_URL },
  // 데이빗북스 하나만 걸던 자리를 성장 탭으로 넓혔다. 데이빗북스는 그 안에
  // 있고, 순종일기·우선순위·천국재정·샬롬기도단도 같이 열린다.
  { emoji: '🌱', label: '성장', href: '/growth' },
  { emoji: '📋', label: '게시판', href: '/boards' },
  { emoji: '🤍', label: 'David Bible 후원', href: '/support' },
  { emoji: '💬', label: '커뮤니티', href: '/community', requiresAuth: true },
];

export default function HomeScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const gradient = useGradient();
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
          const verses = await getVersesForRange(db, qt.bookId, qt.chapter, qt.startVerse, qt.endVerse, DEFAULT_TRANSLATION);
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
      {/* 앱을 열자마자 한 번. 기간이 지났거나 오늘 이미 닫았으면 스스로 안 뜬다. */}
      <PopupNoticeModal />
      <SafeAreaView style={styles.safeAreaOuter}>
        <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.safeArea}>
          {/* 1. 오늘의 말씀 — 화면에서 가장 중요한 자리라 유일하게 그라데이션을 줘서
              다른 카드와 무게를 다르게 했다. Primary 버튼("QT 시작")도 여기 하나뿐이다. */}
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <ThemedText type="small" style={styles.heroLabel}>
              오늘의 말씀
            </ThemedText>
            {verseRef ? (
              <>
                <ThemedText type="smallBold" style={styles.heroRef}>
                  {verseRef}
                </ThemedText>
                <ThemedText style={styles.heroExcerpt} numberOfLines={4}>
                  {verseExcerpt}
                </ThemedText>
              </>
            ) : (
              <ThemedText style={styles.heroLabel}>오늘의 QT 본문을 준비하고 있어요.</ThemedText>
            )}
            <Pressable
              onPress={() => router.push('/meditation')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={[styles.primaryButtonText, { color: theme.accent }]}>
                QT 시작하기
              </ThemedText>
            </Pressable>
          </LinearGradient>

          {/* 2. 오늘의 영적 여정 */}
          <View style={styles.journeyRow}>
            {journeySteps.map((step, i) => (
              <View key={step.label} style={styles.journeyStepWrap}>
                <Pressable onPress={() => router.push(step.href)} style={({ pressed }) => [pressed && styles.pressed]}>
                  <View
                    style={[
                      styles.journeyDot,
                      { backgroundColor: step.done ? theme.done : theme.backgroundElement, borderColor: theme.border, borderWidth: 1 },
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
            style={({ pressed }) => [
              styles.noticeStrip,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" numberOfLines={1} style={styles.noticeStripText}>
              📢 {notice ? notice.title : '등록된 소식이 없어요'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              더보기 ›
            </ThemedText>
          </Pressable>

          {/* 4. 바둑판 — 나머지 기능을 한눈에 */}
          <View style={styles.tileGrid}>
            {HOME_TILES.map((tile) => {
              const badge =
                tile.label === '목자의 편지'
                  ? letterUnseen
                    ? 'NEW'
                    : null
                  : tile.label === 'R2M훈련' && enrollment
                    ? `오늘 ${checklistCount}/7`
                    : null;
              return (
                <Pressable
                  key={tile.label}
                  onPress={() => {
                    if (tile.externalUrl) {
                      Linking.openURL(tile.externalUrl);
                      return;
                    }
                    router.push(tile.requiresAuth && !session ? '/profile' : tile.href);
                  }}
                  style={({ pressed }) => [
                    styles.tile,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText style={styles.tileEmoji}>{tile.emoji}</ThemedText>
                  <ThemedText type="small" style={styles.tileLabel} numberOfLines={2}>
                    {tile.label}
                  </ThemedText>
                  {badge ? (
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.tileBadge}>
                      {badge}
                    </ThemedText>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// 카드가 바탕 위에 떠 보이도록 하는 공통 그림자. 강하지 않게 — 층만 만든다.
const cardShadow = {
  shadowColor: '#0F2433',
  shadowOpacity: 0.05,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
} as const;

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
    shadowColor: '#0F2433',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  heroLabel: {
    color: '#D7EAF7',
  },
  heroRef: {
    color: '#FFFFFF',
  },
  heroExcerpt: {
    lineHeight: 26,
    color: '#F2F9FD',
  },
  primaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    marginTop: Spacing.one,
    backgroundColor: '#FFFFFF',
  },
  primaryButtonText: {
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
    borderWidth: 1,
    ...cardShadow,
  },
  noticeStripText: {
    flex: 1,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 1,
    ...cardShadow,
  },
  letterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  // 한 줄에 셋 — 라벨이 긴 "새부대스마트주보"도 두 줄로 들어간다.
  tile: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: Spacing.four,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
    gap: 2,
  },
  tileEmoji: { fontSize: 26 },
  tileLabel: { textAlign: 'center' },
  tileBadge: { textAlign: 'center', fontSize: 11 },
  pressed: {
    opacity: 0.7,
  },
});
