/**
 * 화면 문구 — 한국어와 영어.
 *
 * 필리핀 성도가 늘어 화면을 영어로도 읽을 수 있어야 한다. 66개 화면에 한글
 * 문구가 1,000개 넘게 흩어져 있어 한 번에 다 옮길 수 없다. **자주 쓰는 화면
 * 부터** 여기로 옮기고 조금씩 늘린다.
 *
 * 아직 안 옮긴 문구는 화면에 한글 그대로 남는다. 그 편이 빈칸보다 낫다 —
 * 영어로 바꿔 놓고 절반이 사라지면 쓸 수가 없다.
 *
 * ## 적는 규칙
 *
 * 열쇠는 `화면.무엇` 꼴로 적는다(`home.qtStart`). 문구 자체를 열쇠로 쓰면
 * (`'QT 시작': ...`) 한글을 고칠 때마다 열쇠가 바뀌어 못 찾는다.
 *
 * 영어는 **교회에서 쓰는 말**로 적는다. 기계 번역식 직역보다, 영어권 교회가
 * 실제로 쓰는 낱말을 고른다 — 「말씀」은 'Word', 「묵상」은 'Meditation',
 * 「목자의 편지」는 'Pastor's Letter'.
 */

export type LangEntry = { ko: string; en: string };

export const STRINGS = {
  // ── 아래 칸(탭) ───────────────────────────────────────────────
  'tab.home': { ko: '홈', en: 'Home' },
  'tab.word': { ko: '말씀', en: 'Word' },
  'tab.growth': { ko: '성장', en: 'Growth' },
  'tab.more': { ko: '더보기', en: 'More' },

  // ── 홈 ───────────────────────────────────────────────────────
  'home.qtStart': { ko: 'QT 시작하기', en: 'Start QT' },
  'home.todaysWord': { ko: '오늘의 말씀', en: "Today's Word" },
  'home.qtOpensAt': {
    ko: '본문은 QT 화면에서 대한성서공회 성경읽기로 열립니다.',
    en: 'The passage opens on the QT screen.',
  },
  'home.more': { ko: '더보기 ›', en: 'More ›' },
  'tab.r2m': { ko: 'R2M', en: 'R2M' },
  'home.meditation': { ko: '묵상', en: 'Meditation' },
  'home.obedience': { ko: '순종', en: 'Obedience' },
  'home.prayer': { ko: '기도', en: 'Prayer' },
  'home.community': { ko: '커뮤니티', en: 'Community' },
  'home.board': { ko: '게시판', en: 'Board' },
  'home.shepherdLetter': { ko: '목자의 편지', en: "Pastor's Letter" },
  'home.readingHelper': { ko: '성경통독도우미', en: 'Bible Reading Helper' },
  'home.r2m': { ko: 'R2M훈련', en: 'R2M Training' },
  'home.churchBulletin': { ko: '새부대스마트주보', en: 'Church Bulletin' },
  'home.churchSite': { ko: '새부대홈페이지', en: 'Church Website' },
  'home.support': { ko: 'David Bible 후원', en: 'Support David Bible' },
  'home.noNews': { ko: '등록된 소식이 없어요', en: 'No news yet' },

  // ── 말씀 ─────────────────────────────────────────────────────
  'word.title': { ko: '오늘의 말씀', en: "Today's Word" },
  'word.dailyQt': { ko: '매일Q.T', en: 'Daily QT' },
  'word.dailyQtDesc': {
    ko: '오늘의 QT 본문과 묵상 노트',
    en: "Today's passage and reflection notes",
  },
  'word.qtNotes': { ko: 'Q.T묵상', en: 'QT Notes' },
  'word.qtNotesDesc': {
    ko: '지금까지 쓴 QT 묵상 노트 모아보기',
    en: 'All the reflections you have written',
  },
  'word.bibleRead': { ko: '성경읽기', en: 'Read the Bible' },
  'word.bibleReadDesc': { ko: '자유롭게 성경 본문 읽기', en: 'Read any passage freely' },
  'word.readingHelperDesc': { ko: '365일 통독 + 퀴즈 + 암송', en: '365-day plan, quiz, memorization' },
  'word.verseNotes': { ko: '구절묵상', en: 'Verse Notes' },
  'word.myNotes': { ko: '내가 쓴 것', en: 'My Notes' },
  'word.myNotesDesc': {
    ko: '하이라이트·암송 구절 모아보기',
    en: 'Your highlights and memory verses',
  },
  'word.study': { ko: '성경연구', en: 'Bible Study' },
  'word.studyDesc': { ko: '성경검색·주석·성경지도', en: 'Search, commentary, maps' },
  'word.deepDive': { ko: '깊이 보기', en: 'Go Deeper' },

  // ── 성장 ─────────────────────────────────────────────────────
  'growth.recordDay': { ko: '하루를 기록하기', en: 'Record Your Day' },
  'growth.title': { ko: '함께 자라기', en: 'Grow Together' },
  'growth.obedienceDiary': { ko: '순종일기', en: 'Obedience Diary' },
  'growth.obedienceDiaryDesc': {
    ko: '말씀을 따라 산 하루를 기록',
    en: 'Record a day lived by the Word',
  },
  'growth.priority': { ko: '우선순위', en: 'Priorities' },
  'growth.priorityDesc': { ko: '오늘 우선해야 할 일 정리', en: "Sort out today's priorities" },
  'growth.shalomPrayer': { ko: '샬롬기도단', en: 'Shalom Prayer Team' },
  'growth.shalomPrayerDesc': {
    ko: '함께 기도제목을 나누는 공간',
    en: 'Share prayer requests together',
  },
  'growth.davidBooks': { ko: '데이빗북스', en: 'David Books' },
  'growth.davidBooksDesc': { ko: '전자책 서재', en: 'E-book library' },
  'growth.finance': { ko: '천국재정', en: 'Kingdom Finance' },
  'growth.financeDesc': {
    ko: '재정을 하나님 나라 관점으로',
    en: 'Money through a Kingdom lens',
  },

  // ── 더보기 ───────────────────────────────────────────────────
  'more.myPage': { ko: '마이페이지', en: 'My Page' },
  'more.myPageDesc': {
    ko: '로그인·닉네임·관리자 메뉴',
    en: 'Sign in, nickname, admin menu',
  },
  'more.support': { ko: '후원', en: 'Support' },
  'more.supportDesc': { ko: '쿠팡파트너스·후원계좌', en: 'Coupang Partners, giving account' },

  // ── 성경읽기 ─────────────────────────────────────────────────
  'read.translation': { ko: '역본', en: 'Version' },
  'read.select': { ko: '선택', en: 'Select' },
  'read.publisherSite': { ko: '출판사 사이트', en: "Publisher's site" },
  'read.bookmark': { ko: '책갈피', en: 'Bookmark' },
  'read.bookmarked': { ko: '꽂힘', en: 'Bookmarked' },
  'read.close': { ko: '닫기', en: 'Close' },
  // 「창세기 1장」 / "Genesis 1". 영어에는 「장」에 해당하는 말을 붙이지 않는다 —
  // "Genesis chapter 1" 은 설교 때나 쓰지, 화면 단추에는 아무도 그렇게 안 쓴다.
  'read.bookChapter': { ko: '{book} {chapter}장', en: '{book} {chapter}' },
  'read.fontSmaller': { ko: '가 작게', en: 'A−' },
  'read.fontBigger': { ko: '가 크게', en: 'A+' },
  'read.fontButton': { ko: '가', en: 'A' },
  'read.longPressHint': {
    ko: '구절을 잠시 누르고 있으면 색칠하고 묵상을 적을 수 있어요',
    en: 'Press and hold a verse to highlight it and write a reflection',
  },
  'read.readAtPublisher': { ko: '📖 {source}에서 읽기', en: '📖 Read at {source}' },
  'read.linkOnlyNote': {
    ko: '이 역본은 출판사 사이트에서 보실 수 있습니다. 앱에서 바로 읽으시려면 위에서 오픈성경을 골라 주세요.',
    en: 'This version is read on the publisher’s own site. To read inside the app, choose Open Bible above.',
  },
  'read.prevChapter': { ko: '이전 장', en: 'Previous' },
  'read.nextChapter': { ko: '다음 장', en: 'Next' },

  // ── 책·장 고르기 ─────────────────────────────────────────────
  'picker.chooseBook': { ko: '책 선택', en: 'Choose a Book' },
  'picker.back': { ko: '뒤로', en: 'Back' },
  'picker.close': { ko: '닫기', en: 'Close' },
  'picker.ot': { ko: '구약', en: 'Old Testament' },
  'picker.nt': { ko: '신약', en: 'New Testament' },

  // ── 책갈피 ───────────────────────────────────────────────────
  'bm.title': { ko: '책갈피', en: 'Bookmarks' },
  'bm.remove': { ko: '🔖 이 장의 책갈피 빼기', en: '🔖 Remove the bookmark on this chapter' },
  'bm.add': { ko: '🔖 지금 이 자리에 꽂기 · {label}', en: '🔖 Bookmark this spot · {label}' },
  'bm.empty': {
    ko: '아직 꽂아 둔 책갈피가 없습니다. 위 단추로 지금 보고 있는 자리를 꽂아 두면, 나중에 여기서 바로 그 자리로 올 수 있어요.',
    en: 'No bookmarks yet. Use the button above to mark where you are, and you can come straight back here later.',
  },
  'bm.delete': { ko: '빼기', en: 'Remove' },
  'bm.close': { ko: '닫기', en: 'Close' },
  // 어디쯤 읽고 있었는지. 절 번호를 모를 때 대신 쓴다.
  'bm.atStart': { ko: '첫머리', en: 'the beginning' },
  'bm.nearStart': { ko: '앞부분', en: 'the first part' },
  'bm.middle': { ko: '중간쯤', en: 'the middle' },
  'bm.nearEnd': { ko: '뒷부분', en: 'the last part' },
  // 「창세기 1장 5절」 / "Genesis 1:5". 영어 성경은 장·절을 콜론으로 잇는다.
  'bm.refVerse': { ko: '{book} {chapter}장 {verse}절', en: '{book} {chapter}:{verse}' },
  'bm.refWhere': { ko: '{book} {chapter}장 · {where}', en: '{book} {chapter} · {where}' },

  // ── 마이페이지 ───────────────────────────────────────────────
  'profile.nicknamePlaceholder': { ko: '닉네임을 입력하세요', en: 'Enter a nickname' },
  'profile.save': { ko: '저장', en: 'Save' },
  'profile.saved': { ko: '저장됨', en: 'Saved' },
  'profile.checking': { ko: '확인 중', en: 'Checking' },
  'profile.changeChurch': { ko: '교회 옮기기', en: 'Change church' },
  'profile.enter': { ko: '들어가기', en: 'Enter' },
  'profile.inviteCodePlaceholder': {
    ko: '초대 코드 (예: KQ7M2XPD)',
    en: 'Invite code (e.g. KQ7M2XPD)',
  },

  // ── 통독도우미 ───────────────────────────────────────────────
  //
  // 필리핀 성도가 매일 여는 화면이다. 여기가 영어로 안 되면 언어 전환은
  // 있으나 마나다 — 홈만 영어고 정작 날마다 쓰는 자리는 한글이 된다.
  'rh.homeBack': { ko: '◀ 데이빗바이블 홈', en: '◀ David Bible Home' },
  'rh.guestBanner': {
    ko: '둘러보는 중입니다 — 오늘 시작하면 읽을 1일차예요.',
    en: 'Just looking around — this is Day 1, what you would read if you started today.',
  },
  'rh.guestBannerSignIn': { ko: '로그인하면', en: 'Sign in' },
  'rh.guestBannerRest': {
    ko: ' 내 진도와 포인트가 이어집니다.',
    en: ' to keep your progress and points.',
  },
  // 두 단추가 서로 다른 곳으로 간다. 위는 대한성서공회 **사이트**(개역개정),
  // 아래는 앱 안에서 읽기다. 영어로 두면 위 단추는 한국어 성경으로 나가므로
  // 아예 감추고, 앱 안 읽기(ESV)를 으뜸 단추로 올린다 — 이름만 영어로 바꾸면
  // 눌렀을 때 읽을 수 없는 글이 뜬다.
  'rh.readToday': {
    ko: '📖 오늘 본문 읽기 (개역개정 · 성서공회)',
    en: '📖 Read today’s passage',
  },
  'rh.readInApp': {
    ko: '앱에서 읽기 (오픈성경 · 인터넷 없어도 됩니다)',
    en: 'Read in the app (works offline)',
  },
  'rh.missedDays': {
    ko: '못 읽고 지나간 날이 {n}일 있어요.',
    en: 'You have {n} day(s) you did not get to.',
  },
  'rh.missedResume': {
    ko: '{date}부터 이어서 읽어 보실래요?',
    en: 'Would you like to pick up from {date}?',
  },
  'rh.togetherToday': {
    ko: '🌿 오늘 {n}명이 함께 읽었어요',
    en: '🌿 {n} people read along today',
  },
  'rh.togetherJoined': { ko: ' · 함께 걷는 분 {n}명', en: ' · {n} walking together' },
  'rh.markRead': { ko: '오늘 통독 완료', en: 'Finished today’s reading' },
  'rh.markReadNote': {
    ko: '달력의 ✓ 는 그날 성경퀴즈에서 {score}점 이상을 맞은 날에 찍힙니다. 위 체크는 나만 보는 표시예요.',
    en: 'The ✓ on the calendar appears when you score {score} or higher on that day’s Bible quiz. The check above is just for you.',
  },
  'rh.myPoints': { ko: '{who} 포인트', en: '{who} Points' },
  'rh.me': { ko: '내', en: 'My' },
  'rh.todayPlus': { ko: '오늘 +{n}', en: 'Today +{n}' },
  'rh.points': { ko: '{n}점', en: '{n} pts' },
  'rh.pointsBreakdown': {
    ko: '성경퀴즈 {quiz}점 ({quizCount}회) · 암송 {mem}점 ({memCount}회) · 3초 OX {speed}점 ({speedCount}회)',
    en: 'Quiz {quiz} pts ({quizCount}×) · Memorization {mem} pts ({memCount}×) · 3-Second OX {speed} pts ({speedCount}×)',
  },
  'rh.pointsRule': {
    ko: '성경퀴즈 80점대 10점 · 90점대 20점 · 100점 30점, 암송 성공 {mem}점, 3초 OX 전부 맞히면 {speed}점',
    en: 'Quiz: 80s = 10 pts · 90s = 20 pts · 100 = 30 pts. Memorization {mem} pts. A perfect 3-Second OX earns {speed} pts.',
  },
  'rh.wordCardRule': {
    ko: '오늘 성경퀴즈에서 {score}점 이상을 맞으면 그날 말씀카드를 만들 수 있어요.',
    en: 'Score {score} or higher on today’s quiz to unlock that day’s Word Card.',
  },
  'rh.rankTitle': { ko: '🏅 통독 순위', en: '🏅 Reading Leaderboard' },
  'rh.rankNo': { ko: '{n}등', en: '#{n}' },
  'rh.rankMeSuffix': { ko: ' (나)', en: ' (you)' },
  'rh.rankWeek': { ko: '이번 주 +{n}', en: 'This week +{n}' },
  'rh.rankMine': {
    ko: '나는 {total}명 중 {rank}등 · 총 {points}점',
    en: 'You are #{rank} of {total} · {points} pts total',
  },
  'rh.rankHint': {
    ko: '순위는 지금까지 쌓은 총점으로 매깁니다. 이름은 마이페이지에서 닉네임을 지으면 바뀝니다.',
    en: 'Ranking is by total points earned. Your name changes when you set a nickname on My Page.',
  },
  'rh.shopButton': {
    ko: '🎁 포인트 교환소 — 칭호·배지 바꾸기',
    en: '🎁 Points Shop — titles and badges',
  },
  'rh.adminBoard': { ko: '📋 통독 현황판 (관리자)', en: '📋 Reading Dashboard (admin)' },
  'rh.quizButton': { ko: '성경퀴즈 풀기', en: 'Take the Bible Quiz' },
  'rh.speedQuizButton': { ko: '⏱️ 3초 성경 OX', en: '⏱️ 3-Second Bible OX' },
  'rh.memorizeButton': { ko: '암송 퍼즐 게임', en: 'Memory Verse Puzzle' },
  'rh.tileTomorrow': { ko: '다음 날\n미리 보기', en: 'Preview\nNext Day' },
  'rh.tileCalendar': { ko: '통독\n캘린더', en: 'Reading\nCalendar' },
  'rh.tileArchive': { ko: '전체\n아카이브', en: 'Full\nArchive' },
  'rh.resetHint': {
    ko: '통독을 처음부터 다시 하고 싶으실 때만 누르세요. 지금까지의 기록과 포인트가 모두 지워지고 되돌릴 수 없습니다.',
    en: 'Only tap this if you want to start the whole plan over. All your records and points are erased, and it cannot be undone.',
  },
  'rh.resetting': { ko: '초기화하는 중…', en: 'Resetting…' },
  'rh.resetButton': { ko: '처음부터 다시 시작', en: 'Start Over' },
  'rh.resetConfirmTitle': { ko: '처음부터 다시 시작할까요?', en: 'Start over from the beginning?' },
  'rh.resetConfirmBody': {
    ko: 'Day 1부터 다시 시작합니다.\n지금까지의 통독 기록·퀴즈 점수·암송 기록이 모두 지워지고, 쌓인 포인트 {points}점도 0점이 됩니다.\n이 작업은 되돌릴 수 없습니다.',
    en: 'You will begin again at Day 1.\nAll reading records, quiz scores and memorization records are erased, and your {points} points go back to 0.\nThis cannot be undone.',
  },
  'rh.resetConfirmOk': { ko: '다시 시작', en: 'Start Over' },
  'rh.resetFailed': {
    ko: '초기화하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    en: 'Could not reset. Please try again in a moment.',
  },
  'rh.signInTitle': { ko: '로그인이 필요해요', en: 'Sign-in required' },
  'rh.signInBody': {
    ko: '{what}은 로그인해야 남길 수 있어요.\n지금 보시는 것은 그대로 보실 수 있습니다.',
    en: 'You need to sign in to save {what}.\nYou can keep browsing everything you see now.',
  },
  'rh.signInLater': { ko: '나중에', en: 'Later' },
  'rh.signIn': { ko: '로그인', en: 'Sign in' },
  'rh.whatReadingRecord': { ko: '통독 기록', en: 'your reading record' },
  'rh.sessionExpired': { ko: '로그인이 만료되었어요.', en: 'Your session has expired.' },
  'rh.sessionExpiredNote': {
    ko: '다시 로그인하시면 통독 기록이 그대로 이어집니다.',
    en: 'Sign in again and your reading record continues right where it was.',
  },
  'rh.signInAgain': { ko: '다시 로그인하기', en: 'Sign in again' },
  'rh.planLoadFailed': {
    ko: '읽기 계획을 불러오지 못했습니다.',
    en: 'Could not load the reading plan.',
  },
  'rh.quizNotReadyTitle': { ko: '성경퀴즈', en: 'Bible Quiz' },
  'rh.quizNotReady': {
    ko: '오늘의 퀴즈 콘텐츠는 아직 준비되지 않았습니다.',
    en: 'Today’s quiz is not ready yet.',
  },
  'rh.memorizeNotReadyTitle': { ko: '암송 퍼즐', en: 'Memory Verse Puzzle' },
  'rh.memorizeNotReady': {
    ko: '오늘의 암송구절이 아직 준비되지 않았습니다.',
    en: 'Today’s memory verse is not ready yet.',
  },

  // ── 오늘의 본문 이야기 / 아카이브 / 지난날 ──────────────────
  //
  // ⚠️ 해설·암송구절 **본문 자체는 한글로만 있다.** 사람이 써서 DB 에 담은
  //    글이라 코드로 옮길 수 없다. 여기서 영어가 되는 것은 제목·단추뿐이다.
  'lesson.narrativeTitle': { ko: '오늘의 본문 이야기', en: 'Today’s Passage, Retold' },
  'lesson.loadFailed': {
    ko: '콘텐츠를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
    en: 'Could not load the content. Please try again in a moment.',
  },
  'lesson.notReady': {
    ko: '이 날짜의 통독 콘텐츠는 아직 준비 중입니다. 곧 업데이트됩니다.',
    en: 'Content for this day is still being prepared. It will be added soon.',
  },
  'lesson.memorizationTitle': { ko: '오늘의 암송구절', en: 'Today’s Memory Verse' },

  'arch.title': { ko: '전체 아카이브', en: 'Full Archive' },
  'arch.empty': { ko: '아직 지나온 통독 기록이 없습니다.', en: 'No reading history yet.' },

  'dd.previewTitle': { ko: '미리 보는 날입니다', en: 'This is a preview' },
  'dd.previewNote': {
    ko: '본문과 해설을 미리 읽고 퀴즈·암송을 연습해 보실 수 있어요. 여기서 한 것은 기록과 포인트에 반영되지 않으니, 그날이 되면 다시 하시면 됩니다.',
    en: 'You can read ahead and practise the quiz and memory verse. Nothing here counts toward your record or points, so do it again when the day comes.',
  },
  'dd.readingDone': { ko: '읽기 완료', en: 'Reading' },
  'dd.done': { ko: '✓ 완료', en: '✓ Done' },
  'dd.notDone': { ko: '미완료', en: 'Not done' },
  'dd.quizNotTaken': { ko: '응시 안함', en: 'Not taken' },
  'dd.memSuccess': { ko: '✓ 성공 ({n}회 시도)', en: '✓ Solved ({n} tries)' },
  'dd.memFailed': { ko: '실패', en: 'Not solved' },
  'dd.memNotTried': { ko: '시도 안함', en: 'Not tried' },
  'dd.previewLesson': { ko: '📖 본문과 해설 미리 보기', en: '📖 Read ahead' },
  'dd.reviewLesson': { ko: '📖 처음부터 다시 보기', en: '📖 Read it again' },
  'dd.previewQuiz': { ko: '성경퀴즈 미리 풀어보기', en: 'Try the quiz early' },
  'dd.reviewQuiz': { ko: '성경퀴즈 다시 풀어보기', en: 'Take the quiz again' },
  'dd.previewOx': { ko: '⏱️ 3초 성경 OX 미리 해보기', en: '⏱️ Try 3-Second OX early' },
  'dd.reviewOx': { ko: '⏱️ 3초 성경 OX 다시 해보기', en: '⏱️ Play 3-Second OX again' },
  'dd.previewMem': { ko: '암송 퍼즐 미리 해보기', en: 'Try the memory puzzle early' },
  'dd.reviewMem': { ko: '암송 퍼즐 다시 해보기', en: 'Play the memory puzzle again' },
  'dd.notReady': {
    ko: '이 날의 해설과 퀴즈는 아직 준비되지 않았습니다. 조금 뒤에 다시 확인해 주세요.',
    en: 'The notes and quiz for this day are not ready yet. Please check back a little later.',
  },
  'dc.quizAgain': { ko: '성경퀴즈 다시 풀기', en: 'Take the quiz again' },
  'dc.oxAgain': { ko: '⏱️ 3초 성경 OX 다시 하기', en: '⏱️ Play 3-Second OX again' },
  'dc.memAgain': { ko: '암송 퍼즐 다시 하기', en: 'Play the memory puzzle again' },

  // ── 성경퀴즈 ─────────────────────────────────────────────────
  'quiz.title': { ko: '성경퀴즈', en: 'Bible Quiz' },
  'quiz.notReady': {
    ko: '오늘의 퀴즈 콘텐츠는 아직 준비되지 않았습니다.',
    en: 'Today’s quiz is not ready yet.',
  },
  'quiz.back': { ko: '돌아가기', en: 'Back' },
  'quiz.praise100': { ko: '🏆 당신은 성경박사인가?', en: '🏆 A true Bible scholar!' },
  'quiz.praise90': { ko: '🎉 대단합니다!', en: '🎉 Well done!' },
  'quiz.praise': { ko: '👏 수고했습니다!', en: '👏 Good work!' },
  'quiz.resultReview': { ko: '복습 결과', en: 'Review Result' },
  'quiz.result': { ko: '퀴즈 결과', en: 'Quiz Result' },
  'quiz.score': { ko: '{n}점', en: '{n} pts' },
  'quiz.reviewNotSaved': {
    ko: '복습 결과는 기록에 저장되지 않아요.',
    en: 'Review results are not saved to your record.',
  },
  'quiz.earned': { ko: '🎉 포인트 +{n}점을 받았어요!', en: '🎉 You earned +{n} points!' },
  'quiz.perfect': {
    ko: '만점이에요. 오늘도 수고하셨습니다.',
    en: 'A perfect score. Well done today.',
  },
  'quiz.canGetMore90': { ko: '100점을 맞으면 30점까지 받을 수 있어요.', en: 'Score 100 and you get 30 points.' },
  'quiz.canGetMore': {
    ko: '90점대는 20점, 100점은 30점까지 받을 수 있어요.',
    en: 'The 90s earn 20 points, and 100 earns 30.',
  },
  'quiz.tryAgain': {
    ko: '{score}점 이상이면 포인트가 쌓이고 말씀카드도 열려요. 다시 도전해보세요!',
    en: 'Score {score} or higher to earn points and unlock the Word Card. Give it another try!',
  },
  'quiz.wordCardUnlocked': {
    ko: '오늘 말씀카드를 만들 수 있어요.',
    en: 'You can make today’s Word Card.',
  },
  'quiz.makeWordCard': { ko: '💌 말씀카드 만들기', en: '💌 Make a Word Card' },
  'quiz.showAnswers': { ko: '정답/해설확인 ▶', en: 'Answers & explanations ▶' },
  'quiz.headerReview': { ko: ' (복습)', en: ' (review)' },
  'quiz.answerPlaceholder': { ko: '정답을 입력하세요', en: 'Type your answer' },
  'quiz.next': { ko: '다음', en: 'Next' },
  'quiz.seeScore': { ko: '점수 확인', en: 'See Score' },

  // ── 암송 퍼즐 ────────────────────────────────────────────────
  'mem.title': { ko: '암송 퍼즐', en: 'Memory Verse Puzzle' },
  'mem.notReady': {
    ko: '오늘의 암송구절이 아직 준비되지 않았습니다.',
    en: 'Today’s memory verse is not ready yet.',
  },
  'mem.reviewTitle': { ko: '암송구절 복습', en: 'Memory Verse Review' },
  'mem.todayTitle': { ko: '오늘의 암송구절', en: 'Today’s Memory Verse' },
  'mem.attemptsLeft': { ko: '남은 기회: {left}/{max}', en: 'Tries left: {left}/{max}' },
  'mem.successReview': { ko: '🎉 암송 성공!', en: '🎉 You got it!' },
  'mem.success': { ko: '🎉 암송 성공! 포인트 +{n}점', en: '🎉 You got it! +{n} points' },
  'mem.failed': { ko: '암송 실패', en: 'Not quite' },
  'mem.answerIs': { ko: '정답: {text}', en: 'Answer: {text}' },
  'mem.submit': { ko: '제출', en: 'Submit' },

  // ── 3초 성경 OX ──────────────────────────────────────────────
  'ox.title': { ko: '3초 성경 OX', en: '3-Second Bible OX' },
  'ox.notReady': {
    ko: '오늘의 퀴즈 콘텐츠가 아직 준비되지 않아 문제를 만들 수 없어요.',
    en: 'Today’s quiz content is not ready, so there are no questions yet.',
  },
  'ox.allCorrectReview': { ko: '🏆 전부 맞혔어요!', en: '🏆 All correct!' },
  'ox.allCorrect': { ko: '🏆 전부 맞혔어요! 포인트 +{n}점', en: '🏆 All correct! +{n} points' },
  'ox.allCorrectNote': {
    ko: '3초 안에 열 문제를 다 맞히다니, 오늘 본문을 제대로 읽으셨네요.',
    en: 'Ten questions in three seconds each — you really read today’s passage.',
  },
  'ox.retryNote': {
    ko: '열 문제를 모두 맞혀야 포인트 {n}점을 받아요. 다시 도전해보세요!',
    en: 'All ten must be correct to earn {n} points. Give it another try!',
  },
  'ox.retry': { ko: '다시 하기', en: 'Try Again' },
  'ox.correct': { ko: '⭕ 정답!', en: '⭕ Correct!' },
  'ox.timeout': { ko: '⏰ 시간 초과', en: '⏰ Time’s up' },
  'ox.wrong': { ko: '❌ 땡!', en: '❌ Wrong!' },
  'ox.answerIs': { ko: '정답은 「{answer}」', en: 'The answer is “{answer}”' },

  // ── 통독 캘린더 ──────────────────────────────────────────────
  //
  // 요일은 한 글자씩 따로 둔다. "일월화수목금토" 를 잘라 쓰면 영어에서 못 쓴다.
  'cal.sun': { ko: '일', en: 'S' },
  'cal.mon': { ko: '월', en: 'M' },
  'cal.tue': { ko: '화', en: 'T' },
  'cal.wed': { ko: '수', en: 'W' },
  'cal.thu': { ko: '목', en: 'T' },
  'cal.fri': { ko: '금', en: 'F' },
  'cal.sat': { ko: '토', en: 'S' },
  'cal.back': { ko: '◀ 돌아가기', en: '◀ Back' },
  'cal.yearMonth': { ko: '{year}년 {month}월', en: '{monthName} {year}' },
  'cal.wellDone': {
    ko: '🌿 이번주도 잘~ 했습니다. 당신 성실해요!!',
    en: '🌿 Another good week. You have been faithful!',
  },
  'cal.legend': {
    ko: '✓ 는 그날 성경퀴즈에서 80점 이상을 맞은 날입니다.',
    en: '✓ marks days you scored 80 or higher on the Bible quiz.',
  },
  'cal.legendPreview': {
    ko: '테두리가 있는 날은 앞으로 {n}일 안의 미리 보기입니다. 미리 풀어 본 퀴즈와 암송은 기록에 남지 않으니, 그날이 되면 다시 하시면 됩니다.',
    en: 'Outlined days are a preview of the next {n} days. Quizzes and memory verses you try early are not recorded, so do them again when the day comes.',
  },


  // ── 화면 제목(위 머리줄) ─────────────────────────────────────
  //
  // Stack 의 헤더에 뜨는 이름들. 화면 안이 아직 한글이어도 여기는 옮긴다 —
  // 말씀·성장 탭에서 이미 영어 이름으로 들어가는데, 들어가자마자 머리줄만
  // 한글이면 다른 화면에 온 것처럼 보인다.
  'nav.plans': { ko: '읽기 계획', en: 'Reading Plans' },
  'nav.post': { ko: '게시글', en: 'Post' },
  'nav.profile': { ko: '마이페이지', en: 'My Page' },
  'nav.calendar': { ko: '달력', en: 'Calendar' },
  'nav.bibleStudy': { ko: '성경연구', en: 'Bible Study' },
  'nav.search': { ko: '성경검색', en: 'Search the Bible' },
  'nav.commentary': { ko: '주석', en: 'Commentary' },
  'nav.maps': { ko: '성경지도', en: 'Bible Maps' },
  'nav.obedience': { ko: '순종일기', en: 'Obedience Diary' },
  'nav.priority': { ko: '우선순위', en: 'Priorities' },
  'nav.finance': { ko: '천국재정', en: 'Kingdom Finance' },
  'nav.shalom': { ko: '샬롬기도단', en: 'Shalom Prayer Team' },
  'nav.privacy': { ko: '개인정보처리방침', en: 'Privacy Policy' },
  'nav.todaysWord': { ko: '오늘의 말씀', en: 'Today\'s Word' },
  'nav.qtNotes': { ko: 'Q.T묵상', en: 'QT Notes' },
  'nav.note': { ko: '묵상 노트', en: 'Reflection Note' },
  'nav.verseNotes': { ko: '구절묵상', en: 'Verse Notes' },
  'nav.community': { ko: '커뮤니티', en: 'Community' },
  'nav.read': { ko: '성경읽기', en: 'Read the Bible' },
  'nav.letter': { ko: '목자의 편지', en: 'Pastor\'s Letter' },
  'nav.letterAdmin': { ko: '목자의 편지 관리', en: 'Manage Pastor\'s Letter' },
  'nav.boards': { ko: '게시판', en: 'Boards' },
  'nav.boardPost': { ko: '글', en: 'Post' },
  'nav.boardsAdmin': { ko: '게시판 관리', en: 'Manage Boards' },
  'nav.notices': { ko: '알림마당', en: 'Notices' },
  'nav.noticesAdmin': { ko: '알림마당 관리', en: 'Manage Notices' },
  'nav.support': { ko: '후원', en: 'Support' },
  'nav.supportAdmin': { ko: '후원정보 관리', en: 'Manage Support Info' },
  'nav.courses': { ko: '훈련과정', en: 'Training Courses' },
  'nav.coursesAdmin': { ko: 'R2M 훈련과정 관리', en: 'Manage R2M Courses' },
  'nav.gratitude': { ko: '감사노트', en: 'Gratitude Notes' },
  'nav.progress': { ko: '성장기록', en: 'Growth Record' },
  'nav.leaders': { ko: '리더관리', en: 'Leaders' },
  'nav.leaderAssign': { ko: '리더 지정 · 멤버 배정', en: 'Assign Leaders and Members' },

  // ── 정답·해설 ────────────────────────────────────────────────
  'ans.title': { ko: '정답/해설', en: 'Answers & Explanations' },
  'ans.header': { ko: '정답/해설 확인 | Day {day}', en: 'Answers & Explanations | Day {day}' },
  'ans.loadFailed': { ko: '콘텐츠를 불러오지 못했습니다.', en: 'Could not load the content.' },
  'ans.score': { ko: '채점 결과: {right} / {total} 문제 정답', en: 'Result: {right} of {total} correct' },
  'ans.myAnswer': { ko: '내 답변: {answer}', en: 'Your answer: {answer}' },
  'ans.correctAnswer': { ko: '정답: {answer}', en: 'Correct answer: {answer}' },
  'ans.explanation': { ko: '해설: {text}', en: 'Why: {text}' },
  'ans.noAnswer': { ko: '(답변 없음)', en: '(no answer)' },

  // ── 통독 시작하기(온보딩) ────────────────────────────────────
  'ob.sessionExpired': {
    ko: '로그인이 만료된 것 같아요. 마이페이지에서 다시 로그인한 뒤 시작해 주세요.',
    en: 'Your session seems to have expired. Please sign in again on My Page and then start.',
  },
  'ob.goToMyPage': { ko: '마이페이지로 가기', en: 'Go to My Page' },
  'ob.start': { ko: '시작하기', en: 'Get Started' },
  'ob.next': { ko: '다음', en: 'Next' },
  'ob.welcome': { ko: '환영합니다!', en: 'Welcome!' },
  'ob.welcomeBody': {
    ko: '1년 1독 성경통독의 여정을 시작합니다.\n매일 말씀과 함께 성장하는 시간이 되기를 소망합니다.',
    en: 'You are beginning a one-year journey through the whole Bible.\nMay it be a time of growing with the Word each day.',
  },
  'ob.howTitle': { ko: '성경통독 운영 방식', en: 'How the Reading Plan Works' },
  'ob.dailyTitle': { ko: '매일 진도', en: 'Daily Reading' },
  'ob.dailyDesc': {
    ko: '평일 3장 / 주일 5장\n(자동 진도)',
    en: '3 chapters on weekdays\n5 on Sundays (automatic)',
  },
  'ob.quizTitle': { ko: '퀴즈 & 암송', en: 'Quiz & Memorization' },
  'ob.quizDesc': {
    ko: '성경 퀴즈 20문항\n& 암송 퍼즐 게임',
    en: '20 quiz questions\n& a memory verse puzzle',
  },
  'ob.resetTitle': { ko: '오전 4시 갱신', en: 'Renews at 4 a.m.' },
  'ob.resetDesc': {
    ko: '매일 오전 4시\n새로운 말씀 갱신',
    en: 'A new passage every day\nat 4 in the morning',
  },
  'ob.beginTitle': { ko: '통독 시작', en: 'Begin Reading' },
  'ob.beginBadge': { ko: '첫째 날\n진도 시작하기', en: 'Day One\nStart here' },
  'ob.readyIn': { ko: '준비되셨나요?\n지금 바로 시작하세요!', en: 'Ready?\nStart right now!' },
  'ob.readyOut': {
    ko: '로그인 후 진행도를 저장할 수 있어요.\n버튼을 누르면 마이페이지로 이동합니다.',
    en: 'Sign in to save your progress.\nThe button takes you to My Page.',
  },

  // ── 포인트 교환소 ────────────────────────────────────────────
  'shop.title': { ko: '포인트 교환소', en: 'Points Shop' },
  'shop.signInTitle': { ko: '로그인이 필요해요', en: 'Sign-in required' },
  'shop.signInBody': {
    ko: '점수를 모으고 쓰려면 로그인해 주세요.',
    en: 'Please sign in to earn and spend points.',
  },
  'shop.cannotBuy': { ko: '아직 살 수 없어요', en: 'Not available yet' },
  'shop.cannotEquip': { ko: '바꾸지 못했어요', en: 'Could not change it' },
  'shop.balance': { ko: '쓸 수 있는 점수 {n}점', en: '{n} points to spend' },
  'shop.earnedSpent': {
    ko: '지금까지 {earned}점을 모아 {spent}점을 썼어요.',
    en: 'You have earned {earned} points and spent {spent}.',
  },
  'shop.rankNote': {
    ko: '여기서 쓴 점수는 순위에서 빠지지 않아요. 마음껏 쓰셔도 됩니다.',
    en: 'Points spent here do not come off your ranking. Spend them freely.',
  },
  'shop.guest': { ko: '둘러보는 중입니다. ', en: 'Just looking around. ' },
  'shop.guestSignIn': { ko: '로그인하면', en: 'Sign in' },
  'shop.guestRest': {
    ko: ' 모은 점수로 바꿀 수 있어요.',
    en: ' to trade the points you have earned.',
  },
  'shop.titles': { ko: '칭호', en: 'Titles' },
  'shop.titlesHint': { ko: '이름 앞에 붙어요', en: 'shown before your name' },
  'shop.badges': { ko: '배지', en: 'Badges' },
  'shop.badgesHint': { ko: '이름 뒤에 붙어요', en: 'shown after your name' },
  'shop.note': {
    ko: '사면 바로 달립니다(이미 달고 있는 것이 없을 때). 칭호와 배지는 하나씩 달 수 있고 언제든 바꿀 수 있어요. 달고 있는 것은 통독 홈의 내 포인트와 순위표에 함께 나옵니다.',
    en: 'What you buy is worn right away, if you are not wearing one already. You can wear one title and one badge, and change them any time. What you wear appears next to your points and on the leaderboard.',
  },
  'shop.equipped': { ko: '달고 있음', en: 'Wearing' },
  'shop.equip': { ko: '달기', en: 'Wear' },
  'shop.cost': { ko: '{n}점', en: '{n} pts' },

  // ── 말씀카드 ─────────────────────────────────────────────────
  'wc.locked': {
    ko: '🔒 오늘 성경퀴즈에서 {score}점 이상을 맞으면 말씀카드를 만들 수 있어요.',
    en: '🔒 Score {score} or higher on today’s quiz to make a Word Card.',
  },
  'wc.todayScore': { ko: '오늘 점수: {n}점', en: 'Today’s score: {n}' },
  'wc.notTakenYet': {
    ko: '오늘은 아직 퀴즈를 풀지 않으셨어요.',
    en: 'You have not taken today’s quiz yet.',
  },
  'wc.goToQuiz': { ko: '성경퀴즈 풀러가기', en: 'Go to the Bible Quiz' },
  'wc.backToHelper': { ko: '◀ 성경통독도우미', en: '◀ Bible Reading Helper' },
  'wc.title': { ko: '말씀카드 만들기', en: 'Make a Word Card' },
  'wc.background': { ko: '배경', en: 'Background' },
  'wc.myPhoto': { ko: '내 사진', en: 'My photo' },
  'wc.fontSize': {
    ko: '글자 크기 · 카드 위 텍스트를 드래그해서 위치를 옮길 수 있어요',
    en: 'Text size · drag the text on the card to move it',
  },
  'wc.resetPosition': { ko: '위치 초기화', en: 'Reset position' },
  'wc.textColor': { ko: '글자 색', en: 'Text colour' },
  'wc.needPhotoPermission': {
    ko: '사진 접근 권한이 필요합니다.',
    en: 'Permission to access photos is required.',
  },
  'wc.fileName': { ko: '말씀카드.png', en: 'word-card.png' },
  'wc.shareTitle': { ko: '말씀카드', en: 'Word Card' },
  'wc.shareDialogTitle': { ko: '말씀카드 공유하기', en: 'Share your Word Card' },
  'wc.savedTitle': { ko: '이미지 저장 완료', en: 'Image saved' },
  'wc.savedBody': {
    ko: '말씀카드 이미지가 다운로드되었어요.',
    en: 'The Word Card image has been downloaded.',
  },
  'wc.shareUnavailableTitle': { ko: '공유 불가', en: 'Sharing unavailable' },
  'wc.shareUnavailable': {
    ko: '이 기기에서는 공유 기능을 사용할 수 없습니다.',
    en: 'Sharing is not available on this device.',
  },
  'wc.shareFailedTitle': { ko: '공유 실패', en: 'Sharing failed' },
  'wc.shareFailed': {
    ko: '잠시 후 다시 시도해주세요.',
    en: 'Please try again in a moment.',
  },
  // 배경 넉 장의 이름. 그림 자체는 그대로고 부르는 말만 바뀐다.
  'wc.tpl.teaching': { ko: '가르치심', en: 'Teaching' },
  'wc.tpl.comfort': { ko: '위로', en: 'Comfort' },
  'wc.tpl.walking': { ko: '동행', en: 'Walking together' },
  'wc.tpl.through': { ko: '지나온 길', en: 'The road behind' },
  // 카드에 찍히는 표시는 교회 이름이라 그대로 두고, 켜고 끄는 단추 말만 옮긴다.
  'wc.watermarkToggle': { ko: '{name} 표시', en: 'Show the church mark' },
  'wc.verseLabel': { ko: '은혜받은 구절', en: 'The verse that moved you' },
  'wc.versePlaceholder': {
    ko: '오늘 은혜받은 말씀을 적어주세요',
    en: 'Write the words that moved you today',
  },
  'wc.referencePlaceholder': { ko: '예: 창 1:1', en: 'e.g. Gen 1:1' },
  'wc.done': { ko: '말씀카드가 완성되었어요!', en: 'Your Word Card is ready!' },
  'wc.saveOrShare': { ko: '이미지 저장/공유하기', en: 'Save or share the image' },
  'wc.share': { ko: '공유하기', en: 'Share' },
  'wc.editAgain': { ko: '다시 편집하기', en: 'Edit again' },

  // ── R2M ──────────────────────────────────────────────────────
  // 과정 이름·설명은 여기 없다. 관리자가 지어 DB(r2m_courses)에 넣는 말이라
  // 영어 자리(title_en / description_en)를 표에 따로 두었다.
  'r2m.courses.empty': {
    ko: '아직 등록된 훈련과정이 없어요.',
    en: 'No training courses have been added yet.',
  },
  'r2m.courses.weeks': { ko: '{n}주 과정', en: '{n}-week course' },
  'r2m.course.notFound': { ko: '과정을 찾을 수 없어요.', en: 'That course could not be found.' },
  'r2m.course.enrolled': {
    ko: '이미 등록됨 · R2M 홈에서 진행하기',
    en: 'Already enrolled · continue from the R2M home',
  },
  'r2m.course.enrolling': { ko: '등록 중...', en: 'Enrolling…' },
  'r2m.course.enroll': { ko: '이 과정 등록하기', en: 'Enrol in this course' },
  'r2m.course.curriculum': { ko: '주차별 커리큘럼', en: 'Week-by-week curriculum' },
  'r2m.course.week': { ko: '{n}주 · {title}', en: 'Week {n} · {title}' },
  'r2m.course.noWeeks': {
    ko: '아직 등록된 주차 커리큘럼이 없어요.',
    en: 'No weekly curriculum has been added yet.',
  },

  'r2m.home.noCourseTitle': {
    ko: '아직 등록된 훈련과정이 없어요',
    en: 'You are not enrolled in a course yet',
  },
  'r2m.home.noCourseBody': {
    ko: '말씀을 읽고, 묵상하고, 기도하고, 순종하며 함께 성장하는 R2M 훈련과정에 참여해보세요.',
    en: 'Join an R2M course and grow together — reading, meditating, praying and obeying the word.',
  },
  'r2m.home.browse': { ko: '훈련과정 둘러보기', en: 'Browse the courses' },
  'r2m.home.weekProgress': {
    ko: '{week} / {total}주차 · 이번 주 진행률 {done}/7',
    en: 'Week {week} of {total} · this week {done}/7',
  },
  'r2m.home.missions': { ko: '이번 주 미션', en: 'This week’s missions' },
  'r2m.home.todayTraining': { ko: '오늘의 훈련', en: 'Today’s training' },
  'r2m.home.done': { ko: '완료', en: 'Done' },
  'r2m.home.go': { ko: '하러 가기 ›', en: 'Go ›' },

  'r2m.progress.title': { ko: '성장기록', en: 'Growth Record' },
  'r2m.progress.subtitle': {
    ko: '점수나 등급이 아니라, 지금까지 쌓아온 발걸음을 기록합니다.',
    en: 'Not a score or a grade — a record of the steps you have taken so far.',
  },
  'r2m.item.qt': { ko: 'QT', en: 'Quiet Time' },
  'r2m.item.reading': { ko: '성경읽기', en: 'Bible Reading' },
  'r2m.item.meditation': { ko: '묵상', en: 'Meditation' },
  'r2m.item.prayer': { ko: '기도', en: 'Prayer' },
  'r2m.item.memorization': { ko: '말씀암송', en: 'Memorising' },
  'r2m.item.obedience': { ko: '순종', en: 'Obedience' },
  'r2m.item.gratitude': { ko: '감사', en: 'Gratitude' },
  // 짧은 이름 — 리더관리의 좁은 칸에 쓴다.
  'r2m.short.reading': { ko: '읽기', en: 'Read' },
  'r2m.short.meditation': { ko: '묵상', en: 'Meditate' },
  'r2m.short.prayer': { ko: '기도', en: 'Pray' },
  'r2m.short.memorization': { ko: '암송', en: 'Memorise' },
  'r2m.short.obedience': { ko: '순종', en: 'Obey' },
  'r2m.short.gratitude': { ko: '감사', en: 'Thanks' },
  // 세는 말. 숫자는 큰 글씨로 따로 있고 여기엔 단위만 붙는다.
  'r2m.unit.days': { ko: '일', en: 'days' },
  'r2m.unit.times': { ko: '회', en: 'times' },
  'r2m.unit.count': { ko: '개', en: 'entries' },

  'r2m.gratitude.title': { ko: '감사노트', en: 'Gratitude Notes' },
  'r2m.gratitude.subtitle': {
    ko: '오늘 감사한 일 세 가지를 적어보세요.',
    en: 'Write down three things you are thankful for today.',
  },
  'r2m.gratitude.placeholder': { ko: '감사한 일 {n}', en: 'Thankful for… {n}' },
  'r2m.gratitude.saved': { ko: '저장됨', en: 'Saved' },
  'r2m.gratitude.save': { ko: '저장', en: 'Save' },
  'r2m.gratitude.past': { ko: '지난 감사노트', en: 'Earlier notes' },
  'r2m.gratitude.empty': { ko: '아직 기록이 없어요.', en: 'Nothing written down yet.' },

  'r2m.needLogin': {
    ko: '마이페이지에서 로그인해주세요.',
    en: 'Please sign in from My Page.',
  },
  'r2m.leaders.onlyLeaders': {
    ko: '리더로 지정된 분만 볼 수 있어요.',
    en: 'Only those appointed as leaders can see this.',
  },
  'r2m.leaders.title': { ko: '리더관리', en: 'Leaders' },
  'r2m.leaders.noteAdmin': {
    ko: '전체 훈련생의 오늘 완료 여부입니다. 묵상/기도 내용은 어떤 관리자도 볼 수 없습니다.',
    en: 'Today’s completion for every trainee. No administrator can see what was written for meditation or prayer.',
  },
  'r2m.leaders.noteLeader': {
    ko: '나에게 배정된 멤버의 오늘 완료 여부입니다. 묵상/기도 내용은 리더도 볼 수 없습니다.',
    en: 'Today’s completion for the members assigned to you. Leaders cannot see what was written for meditation or prayer either.',
  },
  'r2m.leaders.assignLink': {
    ko: '리더 지정 · 멤버 배정 ›',
    en: 'Assign leaders and members ›',
  },
  'r2m.leaders.noCourse': { ko: '훈련과정 미등록', en: 'Not enrolled in a course' },
  'r2m.leaders.inactive': {
    ko: '⚠️ 최근 활동 없음 — 관심이 필요해요',
    en: '⚠️ No recent activity — worth checking in',
  },
  'r2m.leaders.emptyAdmin': {
    ko: '아직 훈련과정에 등록했거나 리더에게 배정된 회원이 없어요. 「리더 지정 · 멤버 배정」에서 배정해 주세요.',
    en: 'No one has enrolled in a course or been assigned to a leader yet. Use “Assign leaders and members” to set that up.',
  },
  'r2m.leaders.emptyLeader': {
    ko: '아직 나에게 배정된 멤버가 없어요. 관리자에게 배정을 요청해 주세요.',
    en: 'No members have been assigned to you yet. Ask an administrator to assign some.',
  },

  'r2m.assign.onlyAdmin': {
    ko: '관리자만 접근할 수 있어요.',
    en: 'Only administrators can open this.',
  },
  'r2m.assign.title': { ko: '리더 지정 · 멤버 배정', en: 'Assign Leaders and Members' },
  'r2m.assign.note': {
    ko: '회원에게 리더 자격을 주면 그분도 리더관리 화면을 볼 수 있어요. 배정된 멤버의 훈련 완료 여부만 보이고, 다른 리더의 멤버는 보이지 않습니다.',
    en: 'Giving someone leader status lets them open the Leaders screen. They see only whether their own assigned members finished, and never another leader’s members.',
  },
  'r2m.assign.counts': {
    ko: '리더 {leaders}명 · 소속된 멤버 {assigned}명 · 전체 회원 {total}명',
    en: '{leaders} leaders · {assigned} members assigned · {total} members in all',
  },
  'r2m.assign.searchPlaceholder': { ko: '이름으로 찾기', en: 'Search by name' },
  'r2m.assign.isLeader': { ko: ' · 리더', en: ' · leader' },
  'r2m.assign.removeLeader': { ko: '리더 자격 빼기', en: 'Remove leader status' },
  'r2m.assign.makeLeader': { ko: '리더로 지정', en: 'Make a leader' },
  'r2m.assign.leaderOf': { ko: '소속 리더: {name}', en: 'Leader: {name}' },
  'r2m.assign.noLeader': { ko: '없음', en: 'none' },
  'r2m.assign.unassign': { ko: '소속 없음', en: 'No leader' },
  'r2m.assign.needLeaderFirst': {
    ko: '먼저 누군가를 리더로 지정해 주세요.',
    en: 'Make someone a leader first.',
  },
  'r2m.assign.noMatch': { ko: '찾는 회원이 없어요.', en: 'No one matches that search.' },

  // ── 언어 ─────────────────────────────────────────────────────
  'lang.title': { ko: '언어', en: 'Language' },
  'lang.ko': { ko: '한국어', en: 'Korean' },
  'lang.en': { ko: 'English', en: 'English' },
  'lang.note': {
    ko: '영어로 두면 성경 기본 역본도 ESV가 됩니다. 역본은 성경읽기에서 따로 고를 수 있어요.',
    en: 'In English, the default Bible version is ESV. You can still pick any version while reading.',
  },
} as const satisfies Record<string, LangEntry>;

export type StringKey = keyof typeof STRINGS;
