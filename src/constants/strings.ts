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
