import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RevivalAngelsMark } from '@/components/RevivalAngelsMark';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PopupNoticeModal } from '@/components/PopupNoticeModal';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGradient, useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { StringKey } from '@/constants/strings';
import { getFirstQtEntry, getQtEntryForDate } from '@/db/bible';
import { getMyActiveEnrollment, getTodayChecklistCount, type ActiveEnrollment } from '@/db/r2m';
import { getMeditationNote } from '@/db/userData';
import { hasQtRecordFor } from '@/db/qtApp';
import { getLatestLetter, type ShepherdLetter } from '@/db/shepherdLetters';
import { ATTENDANCE_POINTS, getAttendedDates, getStepsByDate, setAttended, STEP_GOAL } from '@/lib/readingHelper/db';
import { getMinistryLive, type MinistryLive } from '@/db/ministryLive';
import { getLatestNotice, type Notice } from '@/db/notices';
import { getCommunityUnread } from '@/db/community';
import { hasUnseenLetter } from '@/lib/shepherdLetterBadge';
import { APP_WINDOW, openAppWindow } from '@/lib/openExternal';
import { getArcadeState } from '@/lib/arcade';
import { getCoupangShortcutUrl } from '@/lib/supportLinks';
import { getSupportSettings } from '@/db/support';
import type { Href } from 'expo-router';

function todayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type JourneyStep = { label: string; href: Href; done?: boolean };

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
  /**
   * 이모지 대신 받침을 가득 채우는 그림.
   *
   * 바둑판은 이모지로 가지런한 것이 보기 좋아서 꼭 필요한 한두 칸에만 둔다.
   * 사진이 아니라 **그려 넣는 것**이라 68px 받침 안에서도 흐려지지 않는다.
   */
  Mark?: (props: { size: number }) => React.ReactElement;
  /** 문구 열쇠(STRINGS). 화면에 그릴 때 t() 를 지난다 */
  label: StringKey;
  href: Href;
  /**
   * 문구와 상관없이 이 칸을 가리키는 이름.
   *
   * 예전에는 `tile.label === '목자의 편지'` 로 배지를 골랐는데, 화면을 영어로
   * 바꾸면 그 비교가 조용히 다 어긋난다. 무엇인지는 열쇠로 가르고 문구는
   * 보여 주기만 한다.
   */
  key: string;
  /** 로그인해야 쓸 수 있는 곳 — 안 했으면 마이페이지로 보낸다 */
  requiresAuth?: boolean;
  /**
   * 앱 밖으로 나가는 칸. 있으면 `href` 대신 이 주소를 연다.
   *
   * 이름을 주는 이유는 `openAppWindow` 의 설명 그대로다 — 누를 때마다 새 탭이
   * 생기면 데이빗바이블이 여러 탭에 뜨고, 웹 저장소(OPFS)를 한 탭만 잡을 수
   * 있어서 나중 탭이 「저장소 오류」로 죽는다.
   */
  external?: { url: string; window: string };
};

// 공지사항은 바둑판에 넣지 않는다 — 제목이 바로 보이는 한 줄 띠가 위에 따로
// 있고, 그게 아이콘 한 칸보다 훨씬 잘 읽힌다.
const HOME_TILES: HomeTile[] = [
  // 순서를 사장님이 다시 정하셨다(2026-10-27). 기도 → 전도 → 목장 → 배움 →
  // 사귐 → 사역 → 소식. 교회가 성도에게 바라는 걸음의 차례이기도 하다.
  //
  // 성경읽기·QT 묵상·성경연구는 **말씀 탭에 그대로 있다**(word.tsx). QT 는 이
  // 화면 맨 위의 「QT 시작하기」 카드가 이미 같은 곳으로 보낸다.
  //
  // 목자의 편지 칸은 뺐다 — 새 편지는 알림마당이 띄우고, 이 화면 위쪽 띠에도
  // 제목이 그대로 보인다. 화면(/shepherd-letters)은 그대로 살아 있다.

  // 중보기도센터(옛 24시간 기도의 집) — 다른 앱이다(prayer.dgaiworks.com).
  // 영성부 사역의 핵심이고, 교회의 기도제목은 **여기서만** 올린다(2026-10-02).
  // 기도제목이 여러 곳에 흩어지면 어느 곳에서도 다 모아 기도하지 못한다.
  // 계정은 같은 카카오라 따로 가입하지 않는다.
  {
    key: 'prayerHouse',
    emoji: '🕯️',
    label: 'home.prayerHouse',
    href: '/',
    external: { url: 'https://prayer.dgaiworks.com/', window: APP_WINDOW.prayerHouse },
  },
  // 복음전도 — 이웃초청예배를 향한 전도대상자 돌봄·중보기도·교회 전략(0090).
  // 대상자는 본인만 보므로 로그인이 필요하다.
  { key: 'evangelism', emoji: '🕊️', label: 'home.evangelism', href: '/evangelism' as Href, requiresAuth: true },
  // 신바람목장(목장마을ON) — 우리 목장이 「작은 교회」가 되고, 목장들이 모여
  // 마을이 된다. 교적에 목장이 걸려 있어야 방이 열리므로 로그인이 필요하다.
  { key: 'village', emoji: '🏡', label: 'home.village', href: '/village' as Href, requiresAuth: true },
  // 새부대에듀센터 — 배우는 것을 모은 문. 성경통독도우미도 이 안으로 들어갔다
  // (2026-10-27). 배우는 앱이 하나씩 늘 때마다 홈에 칸을 더하면 바둑판이 끝없이
  // 길어진다 — 늘어나는 것은 /edu 에 한 줄씩 더한다.
  { key: 'edu', emoji: '📚', label: 'home.edu', href: '/edu' as Href },
  // 코이노니아 — 함께 겨루고 놀고 이야기하는 자리(2026-10-27). 성경게임대전·
  // 성경 아케이드와 커뮤니티를 여기 모았다. 셋 다 혼자가 아니라 함께 하는
  // 것이어서 홈에 각각 칸을 두면 같은 성격의 칸이 바둑판에 흩어져 붙는다.
  { key: 'koinonia', emoji: '🤝', label: 'home.koinonia', href: '/koinonia' as Href },
  // 부흥의 천사들 — 네 사역 신청과 중보기도·데이빗북스·전도가 그 안에 있다.
  {
    key: 'growth',
    emoji: '😇',
    // 포스터 사진을 줄여 걸었더니 글씨와 인물이 뭉개져 얼룩으로 보였다.
    // 작은 받침에서도 버티도록 따로 그린 표식을 올린다 — 포스터는 사역 화면
    // 배경에 그대로 있다.
    Mark: RevivalAngelsMark,
    label: 'tab.growth',
    href: '/growth',
  },
  // 새부대매거진(New Wine) — 매거진과 새부대 방송, 교회 홈페이지가 그 안에 있다.
  // 소식은 읽는 것과 듣는 것으로 오므로 한 칸에 욱여넣지 않는다.
  { key: 'newWine', emoji: '🍇', label: 'home.newWine', href: '/newwine' as Href },
];

export default function HomeScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { lang, t } = useI18n();
  const gradient = useGradient();

  // 바둑판 아이콘 받침. 밝은 모드와 어두운 모드가 서로 다른 방식으로 층을
  // 만든다 — 어두운 바탕에 검은 그림자는 보이지 않으므로, 어두울 때는 그림자
  // 대신 받침 색을 바탕보다 밝게 띄워 높이를 만든다.
  const isDark = useColorScheme() === 'dark';
  const padColors: readonly [string, string] = isDark
    ? ['#55392E', theme.accentSoft]
    : ['#FFFFFF', theme.accentSoft];
  const padRim = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.85)';
  // shadow* 낱개 속성은 RN 0.86에서 deprecated 라 boxShadow 한 줄로 쓴다.
  const padShadow = isDark ? null : { boxShadow: '0px 4px 8px rgba(74, 55, 48, 0.16)' };
  const { session } = useAuth();

  const [verseRef, setVerseRef] = useState('');
  const [qtDoneToday, setQtDoneToday] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [enrollment, setEnrollment] = useState<ActiveEnrollment | null>(null);
  const [checklistCount, setChecklistCount] = useState(0);
  const [letter, setLetter] = useState<ShepherdLetter | null>(null);
  // 목사님이 「성도와 함께 보기」를 켜 두신 동안에만 값이 들어온다. 평소에는 null.
  const [live, setLive] = useState<MinistryLive | null>(null);
  const [letterUnseen, setLetterUnseen] = useState(false);
  const [communityUnread, setCommunityUnread] = useState(0);
  // 아케이드에서 오늘 받은 포인트. 로그인 안 했으면 0으로 둔다.
  const [arcadeToday, setArcadeToday] = useState(0);
  // 후원 상자의 쿠팡 링크. 관리자가 등록하기 전에는 빈 값이다.
  const [coupangUrl, setCoupangUrl] = useState('');
  /*
   * 출석 도장. 맨 위에 둔다 — 하루에 한 번 누르는 것이라, 달력까지 들어가야 하면
   * 사흘이면 잊는다. 여기서 누르고 여기서 점수를 본다.
   *
   * 도장이 찍히는 곳은 달력과 같은 자리다(reading_helper_day_records.attended).
   * 두 화면이 같은 기록을 보므로 한쪽에서 찍으면 다른 쪽에도 바로 보인다.
   */
  const [attendedDays, setAttendedDays] = useState<Set<string>>(new Set());
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  /** 오늘 걸음 수(만보기). 0 이면 띠를 그리되 「걸어 보세요」로 둔다. */
  const [stepsToday, setStepsToday] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const today = todayDateString();
        let qt = await getQtEntryForDate(db, today);
        if (!qt) qt = await getFirstQtEntry(db);
        if (qt) {
          // 본문은 싣지 않는다. 개역개정은 대한성서공회 저작물이라 앱에 담아 두지
          // 않고 그 사이트로 보낸다(큐티 화면도 같다). 여기서는 범위만 알린다.
          setVerseRef(qt.label);
        }
        // ✓ 는 두 곳을 본다. 큐티가 데이빗 큐티 앱으로 옮겨졌으므로 그쪽 기록이
        // 먼저이고, 옛 화면으로 쓴 메모도 여전히 인정한다 — 어제까지 쓰던 사람의
        // ✓ 가 하루아침에 사라지면 "내 기록이 날아갔다"가 된다.
        const note = await getMeditationNote(today).catch(() => null);
        const doneInQtApp = session ? await hasQtRecordFor(session.user.id, today).catch(() => false) : false;
        setQtDoneToday(!!note || doneInQtApp);

        if (session) {
          // 못 읽어도 화면은 그대로 떠야 한다 — 출석과 걸음은 홈의 곁가지다.
          setAttendedDays(await getAttendedDates(session.user.id).catch(() => new Set<string>()));
          // 걸음은 기기 자정 기준이라 통독의 「오늘」(새벽 4시)과 다를 수 있다.
          const d = new Date();
          const stepKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const walked = await getStepsByDate(session.user.id, stepKey, stepKey).catch(() => new Map<string, number>());
          setStepsToday(walked.get(stepKey) ?? 0);
        } else {
          setAttendedDays(new Set());
          setStepsToday(0);
        }
      })();
    }, [db, session]),
  );

  useFocusEffect(
    useCallback(() => {
      getLatestNotice()
        .then(setNotice)
        .catch(() => setNotice(null));
    }, []),
  );

  // 커뮤니티에 안 읽은 글이 몇 개인지. 화면에 돌아올 때마다 다시 센다 —
  // 커뮤니티를 보고 나오면 그 자리에서 0이 되어야 한다.
  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setCommunityUnread(0);
        return;
      }
      getCommunityUnread()
        .then(setCommunityUnread)
        .catch(() => setCommunityUnread(0));
    }, [session]),
  );

  useFocusEffect(
    useCallback(() => {
      getMinistryLive()
        .then(setLive)
        .catch(() => setLive(null));
    }, []),
  );

  // 게임을 하고 돌아오면 그 자리에서 오늘 점수가 올라 있어야 한다.
  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setArcadeToday(0);
        return;
      }
      getArcadeState()
        .then((s) => setArcadeToday(s.todayPoints))
        .catch(() => setArcadeToday(0));
    }, [session]),
  );

  // 후원 상자의 쿠팡 링크. 관리자가 주소를 바꾸면 다음에 홈에 들어올 때 반영된다.
  useFocusEffect(
    useCallback(() => {
      getSupportSettings()
        .then((v) => setCoupangUrl(v.coupangUrl.trim()))
        .catch(() => setCoupangUrl(''));
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
      getMyActiveEnrollment(session.user.id, lang)
        .then(setEnrollment)
        .catch(() => setEnrollment(null));
      getTodayChecklistCount(session.user.id)
        .then(setChecklistCount)
        .catch(() => setChecklistCount(0));
    }, [session, lang]),
  );

  const journeySteps: JourneyStep[] = [
    { label: 'QT', href: '/meditation', done: qtDoneToday },
    { label: t('home.meditation'), href: '/word-notes' },
    // 샬롬기도단이 없어져 R2M 체크리스트와 같은 곳(중보기도 나무)으로 보낸다.
    { label: t('home.prayer'), href: '/prayer-tree' },
  ];

  const todayKey = todayDateString();
  const attendedToday = attendedDays.has(todayKey);
  const attendanceDays = attendedDays.size;

  /** 오늘 도장을 찍는다. 이미 찍었으면 달력으로 보낸다 — 떼는 것은 거기서 한다. */
  async function stampToday() {
    if (!session) {
      router.push('/profile');
      return;
    }
    if (attendedToday) {
      router.push('/calendar');
      return;
    }
    if (attendanceSaving) return;
    setAttendanceSaving(true);
    // 먼저 그린다 — 도장은 누른 그 순간에 찍혀야 한다.
    setAttendedDays((cur) => new Set(cur).add(todayKey));
    try {
      await setAttended(session.user.id, todayKey, true);
    } catch {
      setAttendedDays((cur) => {
        const next = new Set(cur);
        next.delete(todayKey);
        return next;
      });
    } finally {
      setAttendanceSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      {/* 앱을 열자마자 한 번. 기간이 지났거나 오늘 이미 닫았으면 스스로 안 뜬다. */}
      <PopupNoticeModal />
      <SafeAreaView style={styles.safeAreaOuter}>
        <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.safeArea}>
          {/*
            0. 출석 — 화면 맨 위.
            하루에 한 번 누르는 것이라 눈에 먼저 들어와야 하고, 여기서 바로 눌러야
            한다. 달력까지 들어가야 하면 사흘이면 잊는다.
            로그인 전에는 그릴 수 없다(점수가 사람에게 매인다).
          */}
          {session ? (
            <Pressable
              onPress={() => void stampToday()}
              disabled={attendanceSaving}
              style={({ pressed }) => [
                styles.attendanceBar,
                {
                  backgroundColor: attendedToday ? theme.backgroundElement : theme.accentSoft,
                  borderColor: attendedToday ? theme.border : theme.accent,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor={attendedToday ? undefined : 'accent'}>
                {attendedToday ? '✅ 오늘 출석했습니다' : `출석 체크 (+${ATTENDANCE_POINTS}점)`}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.attendanceScore}>
                {attendanceDays}일 · {(attendanceDays * ATTENDANCE_POINTS).toLocaleString()}점
              </ThemedText>
            </Pressable>
          ) : null}

          {/* 만보기 — 출석 바로 아래. 눌러서 들어가면 고리와 일주일 그래프가 있다.
              홈에서는 수만 보인다. 걸음은 「오늘 얼마나 움직였나」를 흘긋 보는 것이라
              숫자 하나면 충분하고, 더 넣으면 말씀 카드가 아래로 밀린다. */}
          {session ? (
            <Pressable
              onPress={() => router.push('/pedometer' as Href)}
              style={({ pressed }) => [
                styles.attendanceBar,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: stepsToday >= STEP_GOAL ? theme.done : theme.border,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">
                {stepsToday >= STEP_GOAL ? '🎉 오늘 만 걸음' : '👟 만보기'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.attendanceScore}>
                {stepsToday.toLocaleString()} / {STEP_GOAL.toLocaleString()} 걸음
              </ThemedText>
            </Pressable>
          ) : null}

          {/* 1. 오늘의 말씀 — 화면에서 가장 중요한 자리라 유일하게 그라데이션을 줘서
              다른 카드와 무게를 다르게 했다. Primary 버튼("QT 시작")도 여기 하나뿐이다. */}
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <ThemedText type="small" style={styles.heroLabel}>
              {t('home.todaysWord')}
            </ThemedText>
            {verseRef ? (
              <>
                <ThemedText type="smallBold" style={styles.heroRef}>
                  {verseRef}
                </ThemedText>
                <ThemedText style={styles.heroExcerpt} numberOfLines={2}>
                  {t('home.qtOpensAt')}
                </ThemedText>
              </>
            ) : (
              <ThemedText style={styles.heroLabel}>오늘의 QT 본문을 준비하고 있어요.</ThemedText>
            )}
            <Pressable
              onPress={() => router.push('/meditation')}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={[styles.primaryButtonText, { color: theme.accent }]}>
                {t('home.qtStart')}
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

          {/* 2.5 목회동행 — 목사님이 사역 중이신 동안에만 뜬다. 끝나면 사라진다. */}
          {live && (
            <Pressable
              onPress={() => openAppWindow(live.url, APP_WINDOW.ministryLive)}
              style={({ pressed }) => [
                styles.noticeStrip,
                { backgroundColor: theme.accentSoft, borderColor: theme.accent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small" numberOfLines={1} style={styles.noticeStripText}>
                🚶 지금 목회동행 중 — {live.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                함께 보기
              </ThemedText>
            </Pressable>
          )}

          {/* 2.6 목자의 편지 — 새 편지가 오면 제목이 홈에 뜬다.
              예전에는 💌 타일에 작은 「NEW」 딱지만 붙어서, 편지가 와도
              들어가 보기 전에는 알 수 없었다. */}
          {letter && (
            <Pressable
              onPress={() => router.push('/shepherd-letters')}
              style={({ pressed }) => [
                styles.noticeStrip,
                letterUnseen
                  ? { backgroundColor: theme.accentSoft, borderColor: theme.accent }
                  : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small" numberOfLines={1} style={styles.noticeStripText}>
                💌 {letterUnseen ? '새 편지 — ' : ''}
                {letter.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('home.more')}
              </ThemedText>
            </Pressable>
          )}

          {/* 3. 알림마당 — 제목만 노출되는 한 줄 스트립 */}
          <Pressable
            onPress={() => router.push('/notice-board')}
            style={({ pressed }) => [
              styles.noticeStrip,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" numberOfLines={1} style={styles.noticeStripText}>
              📢 {notice ? notice.title : t('home.noNews')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('home.more')}
            </ThemedText>
          </Pressable>

          {/* 4. 바둑판 — 나머지 기능을 한눈에 */}
          <View style={styles.tileGrid}>
            {HOME_TILES.map((tile) => {
              /*
               * 딱지는 칸마다 하나뿐이다. 아케이드와 커뮤니티가 둘 다 코이노니아
               * 안으로 들어갔으니(2026-10-27) 딱지도 그 한 문 앞에서 다툰다 —
               * **안 읽은 글을 먼저** 보여 준다. 오늘 점수는 내가 이미 아는 것이고,
               * 안 읽은 글은 누가 나에게 말을 걸어 둔 것이다.
               */
              const badge =
                tile.key === 'r2m' && enrollment
                  ? `${checklistCount}/7`
                  : tile.key === 'koinonia' && communityUnread > 0
                    ? // 99를 넘으면 「99+」로 적는다. 세 자리가 되면 아이콘을 덮는다.
                      communityUnread > 99
                      ? '99+'
                      : String(communityUnread)
                    : tile.key === 'koinonia' && session && arcadeToday > 0
                      ? `${arcadeToday}점`
                      : null;
              return (
                <Pressable
                  key={tile.key}
                  onPress={() => {
                    if (tile.external) {
                      openAppWindow(tile.external.url, tile.external.window);
                      return;
                    }
                    router.push(tile.requiresAuth && !session ? '/profile' : tile.href);
                  }}
                  style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
                  {/*
                    네모 카드를 걷어내고 받침 원만 남긴다. 카드가 여섯 개 늘어서
                    있으면 테두리와 바탕이 먼저 보이고 정작 아이콘은 그 안에
                    작게 묻힌다. 원 하나면 아이콘이 곧 단추가 된다.

                    입체감은 전부 이 원에 싣는다 — 위가 밝고 아래가 어두운
                    그라디언트로 빛을 받은 것처럼, 흰 테두리로 윗면 하이라이트를,
                    아래 그림자로 높이를 만든다.
                  */}
                  <LinearGradient
                    colors={padColors}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={[styles.tilePad, padShadow, { borderColor: padRim }]}>
                    {tile.Mark ? (
                      <tile.Mark size={66} />
                    ) : (
                      <ThemedText style={styles.tileEmoji}>{tile.emoji}</ThemedText>
                    )}
                  </LinearGradient>
                  {/* ↗ 는 앱 밖으로 나간다는 뜻. 마이페이지의 바깥 링크와 같은 표시를 쓴다 —
                      눌렀을 때 다른 앱이 열리는 것을 미리 알 수 있어야 한다. */}
                  <ThemedText type="small" style={styles.tileLabel} numberOfLines={2}>
                    {t(tile.label as StringKey)}
                    {tile.external ? ' ↗' : ''}
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

          {/*
            5. 후원 — 화면 맨 아래.

            바둑판 한 칸에서 내려왔다. 아이콘 한 칸에는 이름밖에 못 적는데,
            후원에는 **누르면 되는 길이 둘**이다 — 쿠팡으로 응원하는 것과, 홈
            화면에 아이콘을 깔아 두는 것. 그 둘이 보이지 않으면 「후원」이라는
            이름만 남고 아무도 안 누른다.

            값이 더 드는 일이 아니라는 것도 한 줄로 말해 둔다. 그게 없으면
            후원이라는 낱말 앞에서 대부분 그냥 지나간다.
          */}
          <View
            style={[
              styles.supportCard,
              cardShadow,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <View style={styles.supportHead}>
              <ThemedText style={styles.supportEmoji}>🤍</ThemedText>
              <View style={styles.supportHeadBody}>
                <ThemedText type="smallBold">{t('home.support')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('home.supportLead')}
                </ThemedText>
              </View>
            </View>

            <View style={styles.supportRow}>
              {/* 링크가 아직 안 걸렸으면 쿠팡 단추 대신 후원 화면으로 보낸다 —
                  눌렀는데 아무 일도 안 일어나는 것이 제일 나쁘다. */}
              <Pressable
                onPress={() =>
                  coupangUrl ? Linking.openURL(coupangUrl) : router.push('/support')
                }
                style={({ pressed }) => [
                  styles.supportButton,
                  { backgroundColor: theme.accentSoft, borderColor: theme.accent },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  {t('home.supportCoupang')}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => Linking.openURL(getCoupangShortcutUrl())}
                style={({ pressed }) => [
                  styles.supportButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">{t('home.supportShortcut')}</ThemedText>
              </Pressable>
            </View>

            <Pressable onPress={() => router.push('/support')} style={({ pressed }) => [pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.supportMore}>
                {t('home.supportMore')}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// 카드가 바탕 위에 떠 보이도록 하는 공통 그림자. 강하지 않게 — 층만 만든다.
const cardShadow = {
  shadowColor: '#4A3730',
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
  supportCard: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  supportHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  supportEmoji: { fontSize: 28, lineHeight: 36 },
  supportHeadBody: { flex: 1, gap: 2 },
  // 두 단추는 한 줄에 반씩. 좁은 화면에서는 줄이 바뀌면서 각자 한 줄을 쓴다 —
  // 글씨를 줄이지 않는다(→ 글씨는 크게, 단추는 넉넉히).
  supportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  supportButton: {
    flexGrow: 1,
    flexBasis: 150,
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  supportMore: { textAlign: 'center' },
  attendanceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: 1,
  },
  attendanceScore: {
    marginLeft: 'auto',
  },
  heroCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
    shadowColor: '#4A3730',
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
  // 카드가 없어지면 항목끼리 붙어 보인다. 세로 간격을 따로 벌린다.
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.two, rowGap: Spacing.four },
  // 한 줄에 셋 — 라벨이 긴 "새부대스마트주보"도 두 줄로 들어간다.
  tile: {
    width: '31.5%',
    // 정사각형(aspectRatio: 1)을 버린다. 카드가 있을 때는 그 칸을 카드가 채워
    // 정사각형이 곧 단추였지만, 카드를 걷어낸 지금은 넓은 화면에서 237px짜리
    // 빈 사각형 한가운데 68px 원 하나만 남는다. 높이는 내용만큼만 준다.
    minHeight: 108,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Spacing.one,
    paddingHorizontal: Spacing.one,
    gap: Spacing.two,
  },
  tilePad: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileEmoji: { fontSize: 34, lineHeight: 42 },
  tileLabel: { textAlign: 'center' },
  tileBadge: { textAlign: 'center', fontSize: 11 },
  pressed: {
    opacity: 0.7,
  },
});
