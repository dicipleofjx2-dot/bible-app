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
  // 성경읽기·QT 묵상·성경연구 세 칸을 뺐다(2026-09-23).
  //
  // 셋 다 **말씀 탭에 그대로 있고**(word.tsx), QT 는 이 화면 맨 위의 「QT 시작하기」
  // 카드가 이미 같은 곳으로 보낸다. 바둑판에 또 두면 같은 문이 한 화면에 두 번
  // 생기는 셈이라, 정작 한 번밖에 없는 칸들이 아래로 밀렸다.
  // 지운 것은 이 세 칸뿐이다 — 화면(/read·/meditation·/bible-study)은 그대로다.
  // 24시간 기도의 집 — 다른 앱이다(prayer.dgaiworks.com). 교회 소식을 나르는
  // 주보와 달리 기도는 이 앱이 맡은 개인 경건훈련 그대로라, 홈에 자리를 준다.
  // 계정은 같은 카카오라 따로 가입하지 않는다.
  {
    key: 'prayerHouse',
    emoji: '🕯️',
    label: 'home.prayerHouse',
    href: '/',
    external: { url: 'https://prayer.dgaiworks.com/', window: APP_WINDOW.prayerHouse },
  },
  // 목자의 편지는 교회로 갈린다. 로그인 전에는 어느 교회인지 알 수 없어 목록이
  // 비므로(→ `@/lib/churchScope`) 빈 화면을 보여 주기보다 로그인으로 안내한다.
  { key: 'shepherdLetter', emoji: '💌', label: 'home.shepherdLetter', href: '/shepherd-letters', requiresAuth: true },
  // 신바람목장(목장마을ON) — 우리 목장이 「작은 교회」가 되고, 목장들이 모여
  // 마을이 된다. 목자의 편지 바로 뒤에 둔 이유: 둘 다 목양의 자리이고, 편지를
  // 읽고 나면 자연스레 우리 목장으로 건너간다.
  // 교적에 목장이 걸려 있어야 방이 열리므로 로그인이 필요하다.
  { key: 'village', emoji: '🏡', label: 'home.village', href: '/village' as Href, requiresAuth: true },
  // 바이블 저니 ON — 다른 앱이다(journey.dgaiworks.com). 성경 서른두 코스와
  // 세계사 열세 코스를 위성지도·3D 지형 위에서 따라간다.
  // 무거운 화면이라 한 창에 모은다(→ APP_WINDOW.bibleJourney).
  {
    key: 'bibleJourney',
    emoji: '🗺️',
    label: 'home.bibleJourney',
    href: '/',
    external: { url: 'https://journey.dgaiworks.com/', window: APP_WINDOW.bibleJourney },
  },
  { key: 'r2m', emoji: '🔥', label: 'home.r2m', href: '/bible-reading' },
  { key: 'readingHelper', emoji: '📆', label: 'home.readingHelper', href: '/reading-helper', requiresAuth: true },
  // 성경게임대전 — 로그인 없이도 방에 들어가 볼 수 있게 두었다. 기록 저장만
  // 로그인이 필요하다(→ docs/arena/README.md). 문 앞에서 막으면 「무슨 게임인지
  // 보지도 못하고」 돌아간다.
  // `as Href` 인 이유: expo-router 의 라우트 타입(.expo/types/router.d.ts)은 개발
  // 서버가 돌 때 다시 만들어진다. 새 화면을 더한 직후에는 아직 그 목록에 없어서
  // 타입 검사가 막힌다. 서버가 한 번 돌면 캐스팅 없이도 통과한다.
  { key: 'arena', emoji: '🏆', label: 'home.arena', href: '/arena' as Href },
  // 성경 아케이드 — 대전 바로 옆에 둔다. 둘 다 게임이고, 대전이 겨루는
  // 자리라면 아케이드는 혼자 하는 자리다. 오늘 받은 포인트가 있으면 딱지로
  // 붙는다(아래 badge) — 아이콘 한 칸에 더 적을 자리는 없다.
  { key: 'arcade', emoji: '🕹️', label: 'home.arcade', href: '/arcade' as Href },
  // 주보와 교회 홈페이지 칸은 뺐다. 이 앱은 개인 경건훈련 자리이고, 교회 소식은
  // 스마트주보 앱이 따로 맡는다 — 홈 화면에 둘 다 두면 어느 앱을 쓰는 중인지
  // 흐려진다. 주보로 가는 길은 목자의 편지·알림마당 알림에 그대로 있다.
  // 데이빗북스 하나만 걸던 자리를 성장 탭으로 넓혔다. 데이빗북스는 그 안에
  // 있고, 순종일기·우선순위·천국재정·샬롬기도단도 같이 열린다.
  { key: 'growth', emoji: '🌱', label: 'tab.growth', href: '/growth' },
  // 게시판 칸은 스마트주보로 옮겼다. 게시판은 교회가 함께 쓰는 곳이고, 이 앱은
  // 개인 경건훈련 자리다. 주보에 「게시판 면」이 생겨 거기서 읽고 쓴다 —
  // 표는 같은 것이라 옛 글이 그대로 이어지고, 교회 홈페이지에도 함께 보인다.
  { key: 'community', emoji: '💬', label: 'home.community', href: '/community', requiresAuth: true },
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
    { label: t('home.prayer'), href: '/prayer-group' },
    { label: t('home.obedience'), href: '/spiritual-journal' },
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
              const badge =
                tile.key === 'shepherdLetter'
                  ? letterUnseen
                    ? 'NEW'
                    : null
                  : tile.key === 'r2m' && enrollment
                    ? `${checklistCount}/7`
                    : tile.key === 'arcade' && session && arcadeToday > 0
                      ? `${arcadeToday}점`
                    : tile.key === 'community' && communityUnread > 0
                      ? // 99를 넘으면 「99+」로 적는다. 세 자리가 되면 아이콘을 덮는다.
                        communityUnread > 99
                        ? '99+'
                        : String(communityUnread)
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
                    <ThemedText style={styles.tileEmoji}>{tile.emoji}</ThemedText>
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
