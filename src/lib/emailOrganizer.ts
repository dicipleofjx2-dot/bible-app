/**
 * 이메일 정리ON — 분류·중요도·요약 엔진.
 *
 * 화면과 저장소를 섞지 않고 **순수 함수만** 여기 둔다. 메일 분류는 잘못되면
 * 사람이 중요한 편지를 잃는 쪽이라, 화면을 못 띄우는 환경에서도 입력과 결과를
 * 하나씩 대조할 수 있어야 한다(사명기록관 `missionArchive.ts` 와 같은 판단).
 *
 * 이 파일이 지키는 기획서의 원칙
 *  - §3.1 안전 우선: 어떤 함수도 「영구 삭제」를 내놓지 않는다. 최대치가
 *    **삭제 후보**이고, 보호 분류(사역·재정·가족)와 보호 단어(계약·세금·보험·
 *    병원)에 걸리면 후보에서 아예 빠진다.
 *  - §3.3 사용자 확인: 체험 기간(기본 14일) 동안 `canExecute()` 가 거짓이다.
 *    제안은 그대로 하되 실행 단추를 잠근다.
 *  - §8.2 분류 이유 표시: 모든 판정이 `reasons` 를 함께 돌려준다. 이유를 못
 *    대는 판정은 사용자가 고칠 수도 없다.
 *
 * 언어모델을 부르지 않는다. 메일 본문을 통째로 밖에 보내는 일이 §13(보안
 * 요구사항)과 정면으로 부딪히고, 체험 단계에서는 열쇠도 없다. 대신 기획서
 * §5·§6 의 판단 근거를 규칙으로 옮겼다 — 모델보다 덜 똑똑하지만 값이 항상
 * 같고, 왜 그렇게 골랐는지 사람이 읽을 수 있다.
 */

export type MailProvider = 'gmail' | 'hanmail';

export type MailCategory =
  | 'ministry'
  | 'finance'
  | 'family'
  | 'schedule'
  | 'reply'
  | 'document'
  | 'notice'
  | 'ads'
  | 'routine'
  | 'suspicious';

export type Importance = 'urgent' | 'important' | 'normal' | 'cleanup';

export type DemoMail = {
  id: string;
  accountId: string;
  provider: MailProvider;
  fromName: string;
  fromAddress: string;
  subject: string;
  body: string;
  /** ISO 8601. 표시는 항상 이 값에서 만든다 — 화면이 따로 시각을 만들지 않는다. */
  receivedAt: string;
  read: boolean;
  attachments: string[];
  threadId: string;
  /** 수신 거부 링크(§7.7). 있으면 구독 메일로 본다. */
  unsubscribeUrl?: string;
  /** 이 발신자와 주고받은 횟수 — 중요도의 첫 번째 근거(§6). */
  contactScore?: number;
  /** 최근에 이 발신자의 메일을 열어 본 횟수. 구독 정리 제안에 쓴다. */
  openedCount?: number;
};

export type CategoryMeta = {
  label: string;
  emoji: string;
  /** 기획서 §5 표의 「기본 처리」. 화면에서 그대로 보여 준다. */
  handling: string;
  /** 자동 삭제 금지 분류(§3.1). */
  guarded: boolean;
};

export const CATEGORY_META: Record<MailCategory, CategoryMeta> = {
  ministry: { label: '사역', emoji: '⛪', handling: '중요도 분석 후 보관', guarded: true },
  finance: { label: '재정', emoji: '🧾', handling: '자동 삭제 금지', guarded: true },
  family: { label: '가족·학교', emoji: '🏫', handling: '자동 삭제 금지', guarded: true },
  schedule: { label: '일정·약속', emoji: '📅', handling: '일정 추출 및 알림', guarded: true },
  reply: { label: '답장 필요', emoji: '✍️', handling: '할 일로 등록', guarded: true },
  document: { label: '문서·자료', emoji: '📎', handling: '자료함에 보관', guarded: true },
  notice: { label: '공지', emoji: '📢', handling: '중요도별 보관', guarded: false },
  ads: { label: '광고·쇼핑', emoji: '🛍️', handling: '삭제 후보', guarded: false },
  routine: { label: '반복 알림', emoji: '🔁', handling: '기간 후 삭제 후보', guarded: false },
  suspicious: { label: '의심 메일', emoji: '⚠️', handling: '열기 전 경고', guarded: false },
};

/** 화면의 분류함 차례. 보호 분류를 앞에 둔다. */
export const CATEGORY_ORDER: MailCategory[] = [
  'ministry',
  'finance',
  'family',
  'schedule',
  'reply',
  'document',
  'notice',
  'ads',
  'routine',
  'suspicious',
];

export const IMPORTANCE_META: Record<Importance, { label: string; emoji: string; hint: string }> = {
  urgent: { label: '긴급', emoji: '🔴', hint: '오늘 확인하거나 답장해야 합니다' },
  important: { label: '중요', emoji: '🟠', hint: '반드시 확인하고 보관하세요' },
  normal: { label: '일반', emoji: '🔵', hint: '시간 날 때 확인하세요' },
  cleanup: { label: '정리 후보', emoji: '⚪', hint: '광고이거나 반복되는 알림입니다' },
};

export type OrganizerSettings = {
  /** 주소 또는 도메인. 여기 걸리면 무슨 일이 있어도 삭제 후보가 되지 않는다. */
  protectedSenders: string[];
  /** 본문·제목에 이 낱말이 있으면 삭제 후보에서 뺀다. */
  protectedWords: string[];
  /** 반복 알림이 삭제 후보가 되기까지의 날수(§10 「30일 후」). */
  routineDeleteDays: number;
  /** 광고가 삭제 후보가 되기까지의 날수. 0이면 받는 즉시 후보. */
  adsDeleteDays: number;
  /** 체험 기간 시작 시각(ISO). §3.3 — 처음 2주는 제안만 한다. */
  trialStartedAt: string;
  /** 체험 기간을 사용자가 직접 끝냈는지. */
  trialEnded: boolean;
};

export const TRIAL_DAYS = 14;

export const DEFAULT_SETTINGS: OrganizerSettings = {
  // 기획서 §10 의 예시를 기본값으로 넣어 두었다. 처음 켠 사람이 아무것도
  // 설정하지 않아도 재정·가족 메일이 보호되도록.
  protectedSenders: ['nts.go.kr', 'hometax.go.kr'],
  protectedWords: ['계약', '세금', '보험', '병원', '진료', '등기', '납부'],
  routineDeleteDays: 30,
  adsDeleteDays: 0,
  trialStartedAt: '',
  trialEnded: false,
};

export type Classification = {
  category: MailCategory;
  importance: Importance;
  needsReply: boolean;
  deleteCandidate: boolean;
  /** 왜 그렇게 분류했는지. 화면(§8.2)이 그대로 읽는다. */
  reasons: string[];
  /** 0~1. 1등과 2등 분류의 점수 차이에서 나온다. */
  confidence: number;
  /** 삭제 후보에서 뺀 이유가 있으면 여기 적는다. */
  guardReason?: string;
};

type Rule = { words: string[]; weight: number };

const CATEGORY_RULES: Record<MailCategory, Rule[]> = {
  ministry: [
    {
      words: [
        '교회', '노회', '총회', '선교', '설교', '예배', '성도', '심방', '전도', '새가족',
        '목사', '전도사', '장로', '권사', '집사', '수련회', '부흥회', '선교사', '기도회',
      ],
      weight: 3,
    },
    { words: ['헌금', '주보', '제직회', '당회'], weight: 2 },
  ],
  finance: [
    {
      words: [
        '세금계산서', '영수증', '보험료', '은행', '카드', '납부', '결제', '청구', '국세청',
        '연말정산', '대출', '잔액', '이체', '입금', '출금', '보험', '세금',
      ],
      weight: 4,
    },
  ],
  family: [
    {
      words: [
        '학교', '학원', '학부모', '자녀', '담임', '급식', '가정통신문', '수업', '입학',
        '졸업', '학사', '방과후', '성적표',
      ],
      weight: 4,
    },
  ],
  schedule: [
    { words: ['회의', '일정', '예약', '모임', '상담', '참석', '행사', '세미나', '일시', '장소'], weight: 3 },
  ],
  reply: [
    { words: ['회신', '답장', '부탁드립니다', '확인 부탁', '알려주세요', '가능하신지', '문의', '여쭙'], weight: 3 },
  ],
  document: [
    { words: ['첨부', '보고서', '제안서', '계획서', '양식', '서식', '자료집', '원고'], weight: 3 },
  ],
  notice: [
    { words: ['공지', '안내드립니다', '정책', '약관', '변경', '점검', '업데이트 안내'], weight: 3 },
  ],
  ads: [
    {
      words: [
        '[광고]', '할인', '쿠폰', '특가', '세일', '이벤트', '프로모션', '무료배송', '혜택',
        '마감임박', '신상품', '최저가', '적립금', '기획전',
      ],
      weight: 4,
    },
  ],
  routine: [
    {
      words: [
        '로그인 알림', '배송', '발송 완료', '접수 완료', '자동 발송', '뉴스레터', '구독',
        '주간 리포트', '통계', '결과 요약',
      ],
      weight: 3,
    },
  ],
  suspicious: [
    {
      words: [
        '계정이 정지', '본인 확인이 필요', '지금 클릭', '당첨', '비밀번호를 입력',
        '긴급 조치', '송금', '해외 로그인 시도', '즉시 확인하지 않으면',
      ],
      weight: 6,
    },
  ],
};

const DOMAIN_HINTS: { match: string[]; category: MailCategory; reason: string }[] = [
  { match: ['nts.go.kr', 'hometax'], category: 'finance', reason: '국세청 도메인' },
  {
    match: ['bank', 'card', 'shinhan', 'kbstar', 'hana', 'nonghyup', 'insure', 'life.co.kr'],
    category: 'finance',
    reason: '금융·보험 도메인',
  },
  { match: ['sch.kr', 'ac.kr', 'hakwon', 'school'], category: 'family', reason: '학교·학원 도메인' },
  { match: ['church', 'presbytery', 'mission', 'gmw.kr'], category: 'ministry', reason: '교회·선교 도메인' },
];

const DEADLINE_WORDS = ['까지', '마감', '기한', '마지막', '오늘', '내일', '금일'];
const REQUEST_WORDS = [
  '부탁드립니다', '회신', '답장', '확인해', '알려주세요', '가능하신지', '보내주세요',
  '제출', '신청', '참석 여부', '검토해', '문의',
];

function normalize(text: string): string {
  return text.toLowerCase();
}

function countHits(haystack: string, words: string[]): string[] {
  return words.filter((w) => haystack.includes(normalize(w)));
}

function daysBetween(from: string, now: Date): number {
  const t = Date.parse(from);
  if (Number.isNaN(t)) return 0;
  return Math.floor((now.getTime() - t) / 86_400_000);
}

/** 발신자가 보호 목록에 걸리는가. 주소 전체와 도메인 어느 쪽으로 적어도 잡힌다. */
export function isProtectedSender(address: string, settings: OrganizerSettings): boolean {
  const a = normalize(address);
  return settings.protectedSenders.some((s) => {
    const needle = normalize(s.trim());
    return needle.length > 0 && a.includes(needle);
  });
}

/**
 * 메일 하나를 분류하고 중요도를 매긴다.
 *
 * 점수가 같으면 `CATEGORY_ORDER` 의 앞쪽(보호 분류)이 이긴다. 갈릴 때 광고 쪽으로
 * 기울면 사역 메일이 삭제 후보에 섞이는데, 그 잘못은 되돌리기 어렵다.
 */
export function classifyMail(
  mail: DemoMail,
  settings: OrganizerSettings = DEFAULT_SETTINGS,
  now: Date = new Date(),
): Classification {
  const haystack = normalize(`${mail.subject}\n${mail.body}\n${mail.fromName}`);
  const address = normalize(mail.fromAddress);
  const reasons: string[] = [];

  const scores = new Map<MailCategory, number>();
  const add = (c: MailCategory, n: number) => scores.set(c, (scores.get(c) ?? 0) + n);

  for (const category of CATEGORY_ORDER) {
    for (const rule of CATEGORY_RULES[category]) {
      const hits = countHits(haystack, rule.words);
      if (hits.length > 0) {
        add(category, rule.weight * hits.length);
        reasons.push(`${CATEGORY_META[category].label}: 「${hits.slice(0, 3).join('·')}」`);
      }
    }
  }

  for (const hint of DOMAIN_HINTS) {
    if (hint.match.some((m) => address.includes(m))) {
      add(hint.category, 5);
      reasons.push(`${hint.reason}에서 왔습니다`);
    }
  }

  // 답장을 받지 않는 주소. 「수령 확인 부탁드립니다」 같은 문구가 들어 있어도
  // 이런 주소로는 사람이 답장할 수 없다 — 답장 필요로 두면 오늘의 정리함이
  // 할 수 없는 일로 채워진다.
  const noReply = /(^|[._-])(noreply|no-reply|donotreply|do-not-reply)([._@-]|$)/.test(address);
  if (noReply) {
    add('routine', 3);
    reasons.push('답장을 받지 않는 주소입니다');
  }

  if (mail.unsubscribeUrl) {
    add('ads', 2);
    reasons.push('수신 거부 링크가 있습니다');
  }
  if (mail.attachments.length > 0) {
    add('document', 2);
    reasons.push(`첨부파일 ${mail.attachments.length}개`);
  }

  let category: MailCategory = 'notice';
  let best = 0;
  let second = 0;
  for (const c of CATEGORY_ORDER) {
    const score = scores.get(c) ?? 0;
    if (score > best) {
      second = best;
      best = score;
      category = c;
    } else if (score > second) {
      second = score;
    }
  }
  if (best === 0) reasons.push('뚜렷한 단서가 없어 공지로 두었습니다');

  // 의심 메일은 점수 싸움에서 빼내 따로 이긴다. 피싱은 다른 분류와 겹쳐
  // 오는 것이 보통이라(「은행 보안 안내」), 점수로만 두면 재정에 묻힌다.
  if ((scores.get('suspicious') ?? 0) > 0) {
    category = 'suspicious';
    reasons.unshift('피싱에서 흔히 쓰는 표현이 있습니다. 링크를 누르기 전에 확인하세요');
  }

  const confidence = best === 0 ? 0.2 : Math.min(1, (best - second) / best + 0.35);

  const requestHits = countHits(haystack, REQUEST_WORDS);
  const hasQuestion = mail.body.includes('?') || mail.body.includes('까요');
  const needsReply =
    !noReply &&
    category !== 'ads' &&
    category !== 'routine' &&
    category !== 'suspicious' &&
    (requestHits.length > 0 || hasQuestion);
  if (needsReply) {
    reasons.push(
      requestHits.length > 0 ? `요청하는 말이 있습니다(${requestHits[0]})` : '질문이 들어 있습니다',
    );
  }

  const importance = judgeImportance(mail, category, needsReply, haystack, settings, reasons, now);

  const age = daysBetween(mail.receivedAt, now);
  let deleteCandidate = false;
  let guardReason: string | undefined;
  if (category === 'ads') deleteCandidate = age >= settings.adsDeleteDays;
  if (category === 'routine') deleteCandidate = age >= settings.routineDeleteDays;
  if (deleteCandidate) {
    const guard = guardOf(mail, category, importance, needsReply, haystack, settings);
    if (guard) {
      deleteCandidate = false;
      guardReason = guard;
      reasons.push(`삭제 후보에서 제외: ${guard}`);
    } else {
      reasons.push(
        category === 'ads'
          ? '광고로 보여 삭제 후보에 두었습니다'
          : `${age}일 지난 반복 알림이라 삭제 후보에 두었습니다`,
      );
    }
  }

  return {
    category,
    importance,
    needsReply,
    deleteCandidate,
    reasons,
    confidence: Math.round(confidence * 100) / 100,
    guardReason,
  };
}

/** 삭제 후보에서 빼야 할 이유가 있으면 그 이유를, 없으면 undefined. */
function guardOf(
  mail: DemoMail,
  category: MailCategory,
  importance: Importance,
  needsReply: boolean,
  haystack: string,
  settings: OrganizerSettings,
): string | undefined {
  if (CATEGORY_META[category].guarded) return `${CATEGORY_META[category].label} 분류는 자동 삭제 금지입니다`;
  if (isProtectedSender(mail.fromAddress, settings)) return '보호 발신자입니다';
  const word = countHits(haystack, settings.protectedWords)[0];
  if (word) return `보호 단어 「${word}」가 들어 있습니다`;
  if (needsReply) return '답장이 필요해 보입니다';
  if (importance === 'urgent' || importance === 'important') return '중요도가 높습니다';
  if (mail.attachments.length > 0) return '첨부파일이 있습니다';
  return undefined;
}

function judgeImportance(
  mail: DemoMail,
  category: MailCategory,
  needsReply: boolean,
  haystack: string,
  settings: OrganizerSettings,
  reasons: string[],
  now: Date,
): Importance {
  if (category === 'ads' || category === 'routine') return 'cleanup';

  let score = 0;
  const contact = mail.contactScore ?? 0;
  if (contact >= 10) {
    score += 3;
    reasons.push('자주 주고받는 발신자입니다');
  } else if (contact >= 3) {
    score += 1;
  }
  if (isProtectedSender(mail.fromAddress, settings)) {
    score += 3;
    reasons.push('보호 발신자로 등록되어 있습니다');
  }
  if (CATEGORY_META[category].guarded) score += 2;
  if (needsReply) score += 2;
  if (mail.attachments.length > 0) score += 1;
  if (extractAmounts(mail.body).length > 0) {
    score += 1;
    reasons.push('금액이 적혀 있습니다');
  }

  const deadlineHits = countHits(haystack, DEADLINE_WORDS);
  const soon = deadlineHits.length > 0;
  if (soon) {
    score += 2;
    reasons.push(`기한을 말하고 있습니다(${deadlineHits[0]})`);
  }

  const age = daysBetween(mail.receivedAt, now);
  if (category === 'suspicious') return 'normal';
  if (soon && needsReply && age <= 3) return 'urgent';
  if (score >= 6) return 'important';
  if (score >= 3) return 'important';
  return 'normal';
}

/* ------------------------------------------------------------------ */
/* 요약과 추출 (§7.4, §7.6)                                            */
/* ------------------------------------------------------------------ */

export type MailFacts = {
  dates: string[];
  amounts: string[];
  places: string[];
  people: string[];
  tasks: string[];
};

function sentences(body: string): string[] {
  return body
    .replace(/([.!?])\s+/g, '$1\n')
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function extractDates(body: string): string[] {
  const out = new Set<string>();
  const patterns = [
    /\d{4}[-.]\s?\d{1,2}[-.]\s?\d{1,2}/g,
    /\d{1,2}월\s?\d{1,2}일(\s?\([월화수목금토일]\))?/g,
    /(오전|오후)\s?\d{1,2}시(\s?\d{1,2}분)?/g,
  ];
  for (const p of patterns) for (const m of body.match(p) ?? []) out.add(m.trim());
  return [...out];
}

export function extractAmounts(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.match(/[\d,]+\s?(억|만)?\s?원/g) ?? []) out.add(m.trim());
  return [...out];
}

export function extractPeople(body: string): string[] {
  const out = new Set<string>();
  const titles = '목사|전도사|장로|권사|집사|선교사|선생님|팀장|과장|대리|원장|교수';
  for (const m of body.match(new RegExp(`[가-힣]{2,4}\\s?(${titles})`, 'g')) ?? []) out.add(m.trim());
  return [...out];
}

export function extractPlaces(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.match(/장소\s?[:：]\s?([^\n]+)/g) ?? []) out.add(m.replace(/장소\s?[:：]\s?/, '').trim());
  for (const m of body.match(/[가-힣A-Za-z0-9]{2,12}(교회|센터|회관|호텔|병원|학교|본부)(에서)?/g) ?? [])
    out.add(m.replace(/에서$/, '').trim());
  return [...out];
}

/**
 * 3줄 요약(§7.4).
 *
 * 없는 말을 지어내지 않는다 — **본문에 실제로 있는 문장 중 세 개를 고르는**
 * 것이 전부다. 요약이 원문과 다르면 요약을 믿고 답장한 사람이 틀린 말을 하게
 * 된다. 고르는 잣대는 요청·기한·날짜·금액이 든 문장.
 */
export function summarizeMail(mail: DemoMail): { lines: string[]; facts: MailFacts } {
  const all = sentences(mail.body);
  const scored = all.map((s, index) => {
    let score = 0;
    if (countHits(normalize(s), REQUEST_WORDS).length > 0) score += 3;
    if (countHits(normalize(s), DEADLINE_WORDS).length > 0) score += 2;
    if (extractDates(s).length > 0) score += 2;
    if (extractAmounts(s).length > 0) score += 2;
    if (index === 0) score += 1; // 첫 문장은 대개 용건이다
    return { s, score, index };
  });
  const lines = scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .sort((a, b) => a.index - b.index)
    .map((x) => x.s);

  const tasks = all.filter((s) => countHits(normalize(s), REQUEST_WORDS).length > 0).slice(0, 3);

  return {
    lines: lines.length > 0 ? lines : all.slice(0, 3),
    facts: {
      dates: extractDates(mail.body),
      amounts: extractAmounts(mail.body),
      places: extractPlaces(mail.body),
      people: extractPeople(mail.body),
      tasks,
    },
  };
}

/** 오간 회신을 하나로(§7.4 마지막 줄). 합치지 않고 차례대로 적는다. */
export function summarizeThread(mails: DemoMail[]): string[] {
  return [...mails]
    .sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt))
    .map((m) => `${m.fromName}: ${summarizeMail(m).lines[0] ?? m.subject}`);
}

/* ------------------------------------------------------------------ */
/* 답장 도우미 (§7.5)                                                  */
/* ------------------------------------------------------------------ */

export type ReplyTone = 'polite' | 'brief' | 'pastoral' | 'official';

export const REPLY_TONES: { id: ReplyTone; label: string }[] = [
  { id: 'polite', label: '공손한 답장' },
  { id: 'brief', label: '간단한 확인' },
  { id: 'pastoral', label: '목회자다운 따뜻한 답장' },
  { id: 'official', label: '공식 기관 답장' },
];

/**
 * 답장 **초안**을 만든다. 여기서 나온 글은 사용자가 고치고 확인하기 전에는
 * 절대 나가지 않는다(§7.5 마지막 줄) — 화면에도 발송 단추를 따로 두고,
 * 이 함수는 문자열만 돌려준다.
 */
export function draftReply(mail: DemoMail, tone: ReplyTone): string {
  const { facts } = summarizeMail(mail);
  const name = mail.fromName;
  const when = facts.dates[0];
  const task = facts.tasks[0];
  const point = task ? `말씀하신 「${task}」 건은` : '보내 주신 내용은';

  switch (tone) {
    case 'brief':
      return `${name}님, 확인했습니다.\n${point} 그대로 진행하겠습니다.${when ? `\n(${when} 일정 기억하겠습니다.)` : ''}\n감사합니다.`;
    case 'pastoral':
      return `${name}님, 평안하신지요.\n보내 주신 편지 잘 받았습니다. ${point} 기도하며 살펴보겠습니다.${when ? `\n${when}은 제 일정에 적어 두었습니다.` : ''}\n주님의 은혜가 함께하시기를 빕니다.`;
    case 'official':
      return `${name}님께.\n보내 주신 공문을 확인하였습니다. ${point} 내부 검토 후 회신드리겠습니다.${when ? `\n요청하신 기한(${when})을 준수하겠습니다.` : ''}\n감사합니다.`;
    default:
      return `${name}님, 안녕하세요.\n메일 잘 받았습니다. ${point} 확인 후 다시 말씀드리겠습니다.${when ? `\n${when} 일정은 확인했습니다.` : ''}\n늘 감사드립니다.`;
  }
}

/* ------------------------------------------------------------------ */
/* 오늘의 정리함·삭제 후보·구독 정리                                    */
/* ------------------------------------------------------------------ */

export type ClassifiedMail = DemoMail & { classification: Classification };

export function classifyAll(
  mails: DemoMail[],
  settings: OrganizerSettings = DEFAULT_SETTINGS,
  now: Date = new Date(),
): ClassifiedMail[] {
  return mails.map((m) => ({ ...m, classification: classifyMail(m, settings, now) }));
}

export type TodayDigest<T extends ClassifiedMail = ClassifiedMail> = {
  reply: T[];
  schedule: { mail: T; when: string }[];
  keep: T[];
  cleanup: T[];
};

/** 오늘의 정리함(§7.2). 하나의 메일이 여러 카드에 겹쳐 들어가지 않게 한 번만 담는다. */
export function todayDigest<T extends ClassifiedMail>(mails: T[]): TodayDigest<T> {
  const taken = new Set<string>();
  const take = (list: T[]) =>
    list.filter((m) => {
      if (taken.has(m.id)) return false;
      taken.add(m.id);
      return true;
    });

  const reply = take(
    mails
      .filter((m) => m.classification.needsReply)
      .sort((a, b) => importanceRank(a) - importanceRank(b)),
  );
  const schedule = take(
    mails.filter((m) => m.classification.category === 'schedule' && extractDates(m.body).length > 0),
  ).map((mail) => ({ mail, when: extractDates(mail.body)[0] }));
  const keep = take(
    mails.filter(
      (m) => m.classification.importance === 'important' || m.classification.category === 'document',
    ),
  );
  const cleanup = take(mails.filter((m) => m.classification.deleteCandidate));
  return { reply, schedule, keep, cleanup };
}

function importanceRank(m: ClassifiedMail): number {
  return ['urgent', 'important', 'normal', 'cleanup'].indexOf(m.classification.importance);
}

export type SenderGroup<T extends ClassifiedMail = ClassifiedMail> = {
  fromName: string;
  fromAddress: string;
  count: number;
  latestAt: string;
  reasons: string[];
  unsubscribeUrl?: string;
  /** 보호 분류가 섞여 있으면 경고를 띄운다(§8.3 마지막 줄). */
  warning?: string;
  mails: T[];
};

/** 삭제 후보를 발신자별로 묶는다(§8.3). */
export function groupDeleteCandidates<T extends ClassifiedMail>(mails: T[]): SenderGroup<T>[] {
  const map = new Map<string, SenderGroup<T>>();
  for (const m of mails.filter((x) => x.classification.deleteCandidate)) {
    const key = m.fromAddress.toLowerCase();
    const group: SenderGroup<T> = map.get(key) ?? {
      fromName: m.fromName,
      fromAddress: m.fromAddress,
      count: 0,
      latestAt: m.receivedAt,
      reasons: [],
      unsubscribeUrl: m.unsubscribeUrl,
      mails: [],
    };
    group.count += 1;
    group.mails.push(m);
    if (Date.parse(m.receivedAt) > Date.parse(group.latestAt)) group.latestAt = m.receivedAt;
    for (const r of m.classification.reasons) if (!group.reasons.includes(r)) group.reasons.push(r);
    group.unsubscribeUrl = group.unsubscribeUrl ?? m.unsubscribeUrl;
    map.set(key, group);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export type SubscriptionRow = {
  fromName: string;
  fromAddress: string;
  count: number;
  openedCount: number;
  unsubscribeUrl?: string;
  /** 해지를 권할 만한가. 권하기만 하고 실행은 사용자가 한다(§7.7). */
  suggestUnsubscribe: boolean;
};

/** 구독 정리(§7.7). 다섯 번 넘게 왔는데 한 번도 안 열었으면 해지를 권한다(§10). */
export function subscriptionReport(mails: ClassifiedMail[]): SubscriptionRow[] {
  const map = new Map<string, SubscriptionRow>();
  for (const m of mails) {
    const isSubscription = !!m.unsubscribeUrl || m.classification.category === 'ads';
    if (!isSubscription) continue;
    const key = m.fromAddress.toLowerCase();
    const row = map.get(key) ?? {
      fromName: m.fromName,
      fromAddress: m.fromAddress,
      count: 0,
      openedCount: 0,
      unsubscribeUrl: m.unsubscribeUrl,
      suggestUnsubscribe: false,
    };
    row.count += 1;
    row.openedCount += m.openedCount ?? (m.read ? 1 : 0);
    row.unsubscribeUrl = row.unsubscribeUrl ?? m.unsubscribeUrl;
    map.set(key, row);
  }
  const rows = [...map.values()];
  for (const row of rows) row.suggestUnsubscribe = row.count >= 5 && row.openedCount === 0;
  return rows.sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------ */
/* 체험 기간 (§3.3)                                                    */
/* ------------------------------------------------------------------ */

export function trialDaysLeft(settings: OrganizerSettings, now: Date = new Date()): number {
  if (settings.trialEnded || !settings.trialStartedAt) return 0;
  const passed = daysBetween(settings.trialStartedAt, now);
  return Math.max(0, TRIAL_DAYS - passed);
}

/**
 * 지금 실제로 메일을 옮겨도 되는가.
 *
 * 체험 기간에는 거짓이다 — AI 는 제안만 하고, 사용자가 승인·수정한 결과가
 * 쌓이는 동안 아무것도 건드리지 않는다.
 */
export function canExecute(settings: OrganizerSettings, now: Date = new Date()): boolean {
  return trialDaysLeft(settings, now) === 0;
}

/** 사람이 읽는 시각. 오늘·어제는 시간으로, 그 앞은 날짜로. */
export function formatReceivedAt(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const days = daysBetween(iso, now);
  const hh = `${d.getHours()}`.padStart(2, '0');
  const mm = `${d.getMinutes()}`.padStart(2, '0');
  if (days <= 0) return `${hh}:${mm}`;
  if (days === 1) return `어제 ${hh}:${mm}`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
