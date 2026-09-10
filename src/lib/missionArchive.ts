/**
 * 사명기록관 — 셈과 글짓기.
 *
 * 화면과 서버를 섞지 않고 여기 순수 함수로 모은다. 질문 라이브러리, 꼬리질문,
 * 진행률, 원고 조립이 전부 여기 있어서 화면을 못 띄우는 환경에서도 노드로 돌려
 * 검사할 수 있다(중보기도 나무의 `lib/prayerTree.ts` 와 같은 방식).
 *
 * ── 꼬리질문에 모델을 부르지 않는 이유 ──────────────────────────────
 * 이 앱에는 언어모델 열쇠가 없고, 있더라도 사역자의 생애 기록을 통째로 밖으로
 * 보내는 일은 선교지 보안(기획서 §14)과 정면으로 부딪힌다. 그래서 꼬리질문은
 * **규칙**으로 만든다 — 기획서 §7 의 「몇 년도인가 · 어디인가 · 누구였는가 ·
 * 그 뒤로 무엇이 달라졌는가 · 근거가 있는가」가 그대로 규칙이 된다. 모델보다
 * 덜 똑똑하지만, 빠뜨리지 않고 묻는다는 점에서는 더 낫다.
 */

export type MissionRole = 'pastor' | 'missionary' | 'both' | 'other';

/** 기획서 §6 — 기록의 여섯 축. 출생·성장 순서가 아니라 부르심의 순서다. */
export type MissionAxis = 'calling' | 'preparation' | 'sending' | 'fruit' | 'suffering' | 'legacy';

export const AXES: { id: MissionAxis; label: string; hint: string }[] = [
  { id: 'calling', label: '소명', hint: '복음을 만난 자리와 부르심' },
  { id: 'preparation', label: '준비', hint: '훈련, 스승, 첫 사역' },
  { id: 'sending', label: '파송과 개척', hint: '떠남, 첫 예배, 시행착오' },
  { id: 'fruit', label: '복음의 열매', hint: '회심, 제자, 지역의 변화' },
  { id: 'suffering', label: '고난과 회복', hint: '박해, 갈등, 가족의 희생' },
  { id: 'legacy', label: '계승과 유산', hint: '이양, 말씀, 다음 세대' },
];

export function axisLabel(axis: MissionAxis): string {
  return AXES.find((a) => a.id === axis)?.label ?? axis;
}

/** 기획서 §13 — 무엇으로 확인된 이야기인지. 원고를 쓸 때 이 값이 근거가 된다. */
export type FactStatus = 'self' | 'witness' | 'document' | 'need_year' | 'conflict' | 'review' | 'private';

export const FACT_STATUS: { id: FactStatus; label: string; short: string }[] = [
  { id: 'self', label: '본인 인터뷰로 확인', short: '본인' },
  { id: 'witness', label: '가족·동역자 증언으로 확인', short: '증언' },
  { id: 'document', label: '사진·문서·영상으로 확인', short: '자료' },
  { id: 'need_year', label: '연도 또는 장소 확인 필요', short: '확인필요' },
  { id: 'conflict', label: '서로 다른 증언이 있음', short: '엇갈림' },
  { id: 'review', label: '공개 전 교회·선교단체 확인 필요', short: '검토' },
  { id: 'private', label: '민감정보 또는 비공개', short: '비공개' },
];

export function factLabel(status: FactStatus): string {
  return FACT_STATUS.find((f) => f.id === status)?.label ?? status;
}

export function factShort(status: FactStatus): string {
  return FACT_STATUS.find((f) => f.id === status)?.short ?? status;
}

/** 기획서 §14 — 어디까지 내보낼 것인가. 표를 남에게 여는 값이 아니라, 원고에서 무엇을 뺄지 정하는 값이다. */
export type Visibility = 'public' | 'church' | 'family' | 'writer' | 'private';

export const VISIBILITY: { id: Visibility; label: string; rank: number }[] = [
  { id: 'public', label: '공개', rank: 0 },
  { id: 'church', label: '교회 내부', rank: 1 },
  { id: 'family', label: '가족 전용', rank: 2 },
  { id: 'writer', label: '작가 전용', rank: 3 },
  { id: 'private', label: '비공개', rank: 4 },
];

export function visibilityLabel(v: Visibility): string {
  return VISIBILITY.find((x) => x.id === v)?.label ?? v;
}

function rankOf(v: Visibility): number {
  return VISIBILITY.find((x) => x.id === v)?.rank ?? 9;
}

/**
 * 내보낼 원고가 담을 수 있는 가장 넓은 범위.
 *
 * 「공개용 원고」를 뽑으면 공개로 표시된 답만 들어간다. 보관용 완전 원고
 * (writer)를 뽑으면 비공개(private)만 빠진다 — 비공개는 어떤 원고에도 넣지
 * 않는다. 원고를 두 벌로 나누라는 §14 의 요구가 이 한 줄이다.
 */
export function allowedInExport(answerVisibility: Visibility, exportLevel: Visibility): boolean {
  if (answerVisibility === 'private') return false;
  return rankOf(answerVisibility) <= rankOf(exportLevel);
}

// ── 질문 라이브러리 (기획서 §6, §7) ───────────────────────────────────

export type Question = {
  key: string;
  axis: MissionAxis;
  /** 누구에게 묻는 질문인가. 'all' 은 목회자·선교사 모두. */
  who: 'all' | 'pastor' | 'missionary';
  text: string;
};

export const QUESTIONS: Question[] = [
  // 6.1 소명
  { key: 'calling.gospel', axis: 'calling', who: 'all', text: '예수님을 인격적으로 만난 때는 언제였습니까?' },
  { key: 'calling.moment', axis: 'calling', who: 'all', text: '목회자 또는 선교사가 되어야겠다고 처음 생각한 계기는 무엇이었습니까?' },
  { key: 'calling.word', axis: 'calling', who: 'all', text: '그 부르심을 확신하게 한 말씀이나 사건이 있었습니까?' },
  { key: 'calling.family', axis: 'calling', who: 'all', text: '배우자와 가족은 그 결정을 어떻게 받아들였습니까?' },
  { key: 'calling.struggle', axis: 'calling', who: 'all', text: '순종하기 가장 어려웠던 부분은 무엇이었습니까?' },

  // 6.2 준비
  { key: 'prep.school', axis: 'preparation', who: 'all', text: '신학교와 훈련 과정은 어떠했습니까?' },
  { key: 'prep.mentor', axis: 'preparation', who: 'all', text: '가장 큰 영향을 준 목회자·선교사·스승은 누구였습니까?' },
  { key: 'prep.firstSermon', axis: 'preparation', who: 'all', text: '첫 설교는 언제, 어디에서, 어떤 마음으로 하셨습니까?' },
  { key: 'prep.philosophy', axis: 'preparation', who: 'all', text: '지금의 사역 철학은 어떤 과정을 거쳐 만들어졌습니까?' },
  { key: 'prep.cost', axis: 'preparation', who: 'all', text: '준비하는 동안 경제적·가정적으로 무엇을 감당하셨습니까?' },

  // 6.3 파송과 개척
  { key: 'send.church', axis: 'sending', who: 'all', text: '파송 교회 또는 선교단체는 어디였고, 어떻게 이어졌습니까?' },
  { key: 'send.firstField', axis: 'sending', who: 'pastor', text: '처음 맡은 교회는 어떤 형편이었습니까?' },
  { key: 'send.firstService', axis: 'sending', who: 'pastor', text: '첫 예배에 몇 명이 참석했고, 무엇을 설교하셨습니까?' },
  { key: 'send.lack', axis: 'sending', who: 'pastor', text: '교회를 개척할 때 가장 부족했던 것은 무엇이었습니까?' },
  { key: 'send.sameLand', axis: 'sending', who: 'missionary', text: '처음 품었던 나라와 실제 파송지는 같았습니까?' },
  { key: 'send.firstDay', axis: 'sending', who: 'missionary', text: '선교지에 도착한 첫날 무엇을 보고 어떤 생각을 하셨습니까?' },
  { key: 'send.language', axis: 'sending', who: 'missionary', text: '언어와 문화 때문에 겪은 가장 큰 어려움은 무엇이었습니까?' },
  { key: 'send.mistakes', axis: 'sending', who: 'all', text: '사역 초기의 실패와 시행착오는 무엇이었습니까?' },

  // 6.4 복음의 열매
  { key: 'fruit.firstConvert', axis: 'fruit', who: 'all', text: '처음으로 복음을 받아들인 사람은 누구였습니까?' },
  { key: 'fruit.changedMe', axis: 'fruit', who: 'all', text: '한 성도의 변화가 사역 방향을 바꾼 일이 있었습니까?' },
  { key: 'fruit.disciples', axis: 'fruit', who: 'all', text: '제자를 세우고 현지 지도자를 키운 과정은 어떠했습니까?' },
  { key: 'fruit.community', axis: 'fruit', who: 'all', text: '교회와 지역사회에 어떤 변화가 있었습니까?' },
  { key: 'fruit.partners', axis: 'fruit', who: 'all', text: '가장 기억에 남는 성도와 동역자는 누구입니까?' },

  // 6.5 고난과 회복
  { key: 'suffer.crisis', axis: 'suffering', who: 'all', text: '박해·질병·사고·재정 위기 가운데 가장 힘들었던 때는 언제였습니까?' },
  { key: 'suffer.conflict', axis: 'suffering', who: 'all', text: '사역 인생에서 가장 아팠던 갈등은 무엇이었습니까?' },
  { key: 'suffer.burnout', axis: 'suffering', who: 'all', text: '사역을 멈추고 싶었던 순간이 있었습니까?' },
  { key: 'suffer.family', axis: 'suffering', who: 'all', text: '가족이 감당한 희생은 무엇이었습니까?' },
  { key: 'suffer.expel', axis: 'suffering', who: 'missionary', text: '생명의 위협이나 추방의 위기를 경험한 적이 있습니까?' },
  { key: 'suffer.leading', axis: 'suffering', who: 'all', text: '그 위기 속에서 하나님의 인도하심을 어떻게 경험하셨습니까?' },
  { key: 'suffer.after', axis: 'suffering', who: 'all', text: '그 실패 이후 사역의 방향은 어떻게 달라졌습니까?' },

  // 6.6 계승과 유산
  { key: 'legacy.handover', axis: 'legacy', who: 'all', text: '후임자나 현지 지도자에게 사역을 이양할 때 가장 중요하게 여긴 것은 무엇입니까?' },
  { key: 'legacy.principle', axis: 'legacy', who: 'all', text: '다음 세대에게 전하고 싶은 목회·선교 원칙은 무엇입니까?' },
  { key: 'legacy.word', axis: 'legacy', who: 'all', text: '평생 붙들었던 성경 말씀은 무엇입니까?' },
  { key: 'legacy.sermon', axis: 'legacy', who: 'all', text: '남기고 싶은 대표 설교와 신학적 통찰은 무엇입니까?' },
  { key: 'legacy.restart', axis: 'legacy', who: 'all', text: '지금 다시 사역을 시작한다면 무엇을 다르게 하시겠습니까?' },
  { key: 'legacy.letter', axis: 'legacy', who: 'all', text: '자녀와 성도, 후배 사역자에게 어떤 편지를 남기고 싶으십니까?' },
];

/** 이 사역자에게 물을 질문만 고른다. 목회자에게 선교지 언어를 묻지 않는다. */
export function questionsFor(role: MissionRole): Question[] {
  if (role === 'both' || role === 'other') return QUESTIONS;
  return QUESTIONS.filter((q) => q.who === 'all' || q.who === role);
}

export function questionByKey(key: string): Question | null {
  return QUESTIONS.find((q) => q.key === key) ?? null;
}

// ── 진행률 ───────────────────────────────────────────────────────────

/** 답으로 치는 최소 길이. 「네」 한 마디는 아직 이야기가 아니다. */
const MIN_ANSWER_LENGTH = 15;

export function isAnswered(body: string | null | undefined): boolean {
  return (body ?? '').trim().length >= MIN_ANSWER_LENGTH;
}

export type AxisProgress = { axis: MissionAxis; label: string; done: number; total: number };

export function axisProgress(role: MissionRole, answers: { question_key: string; body: string }[]): AxisProgress[] {
  const done = new Set(answers.filter((a) => isAnswered(a.body)).map((a) => a.question_key));
  return AXES.map((axis) => {
    const list = questionsFor(role).filter((q) => q.axis === axis.id);
    return {
      axis: axis.id,
      label: axis.label,
      done: list.filter((q) => done.has(q.key)).length,
      total: list.length,
    };
  });
}

/**
 * 오늘 이어서 할 질문.
 *
 * 순서대로 첫 빈 질문을 준다 — 축을 건너뛰며 물으면 이야기가 조각난다.
 * 기획서 §17 의 「매일 한 가지 질문」이 이 함수다.
 */
export function nextQuestion(role: MissionRole, answers: { question_key: string; body: string }[]): Question | null {
  const done = new Set(answers.filter((a) => isAnswered(a.body)).map((a) => a.question_key));
  return questionsFor(role).find((q) => !done.has(q.key)) ?? null;
}

// ── 꼬리질문 (기획서 §7) ─────────────────────────────────────────────

export type FollowUp = { key: string; text: string };

const YEAR_PATTERN = /(19|20)\d{2}\s*년?/;
/** 사람을 가리키는 말. 이름 없이 「한 성도가」로 지나가면 원고에서 그 사람이 사라진다. */
const PERSON_WORDS = ['성도', '집사', '권사', '장로', '목사', '선교사', '전도사', '제자', '동역자', '아내', '남편', '자녀', '아들', '딸', '어머니', '아버지', '스승', '교수'];
const MIRACLE_WORDS = ['기적', '치유', '고침', '나았', '살아나', '응답', '환상', '꿈', '음성'];
const TURN_WORDS = ['그만', '포기', '문을 닫', '떠나', '실패', '갈등', '싸움', '중단', '무너'];
const PLACE_HINT = /[가-힣A-Za-z]{2,}(시|군|구|도|국|주|현|마을|지역|교회|신학교|선교회)/;

/**
 * 답을 읽고 더 물어야 할 것을 고른다.
 *
 * 기획서 §7 의 예시(「교회 문을 닫으려던 때 한 성도가 찾아왔습니다」)에 그대로
 * 걸리도록 만들었다 — 연도·장소·인물·그 뒤의 변화·근거를 차례로 묻는다.
 * 이미 채워 둔 칸(year/place/people/evidence)은 다시 묻지 않는다.
 */
export function followUps(
  body: string,
  filled: { year?: number | null; place?: string; people?: string; evidence?: string } = {},
): FollowUp[] {
  const text = (body ?? '').trim();
  if (text.length < 5) return [];

  const out: FollowUp[] = [];

  if (!filled.year && !YEAR_PATTERN.test(text)) {
    out.push({ key: 'year', text: '그때가 몇 년도였습니까?' });
  }
  if (!(filled.place ?? '').trim() && !PLACE_HINT.test(text)) {
    out.push({ key: 'place', text: '그 일은 어느 지역, 어느 교회에서 있었습니까?' });
  }
  if (!(filled.people ?? '').trim() && PERSON_WORDS.some((w) => text.includes(w))) {
    out.push({ key: 'people', text: '그 사람은 누구였습니까? 이름을 남겨도 괜찮은 분입니까?' });
  }
  if (TURN_WORDS.some((w) => text.includes(w))) {
    out.push({ key: 'turn', text: '그날 이후 무엇이 달라졌습니까? 지금의 사역철학에 어떤 영향을 주었습니까?' });
  }
  if (MIRACLE_WORDS.some((w) => text.includes(w))) {
    // §13 — 기적과 응답은 「누가 보았는가」를 함께 적어야 기록으로 남는다.
    out.push({ key: 'witness', text: '그 일을 함께 본 사람이나 당시에 남긴 기록이 있습니까?' });
  }
  if (text.length < 120) {
    out.push({ key: 'detail', text: '그때 보고 들은 것을 조금만 더 자세히 말씀해 주시겠습니까?' });
  }
  if (!(filled.evidence ?? '').trim()) {
    out.push({ key: 'evidence', text: '관련 사진, 주보, 편지, 일기 또는 증언해 줄 분이 있습니까?' });
  }

  // 한 번에 다 들이밀면 답을 못 한다. 넷까지만 보여 준다.
  return out.slice(0, 4);
}

// ── 원고 (기획서 §12) ────────────────────────────────────────────────

export type ChapterPreset = { ord: number; title: string; keys: string[] };

/** 기획서 §12 의 권장 목차. 어느 질문의 답이 어느 장으로 가는지 여기서 정한다. */
export const CHAPTER_PRESET: ChapterPreset[] = [
  { ord: 0, title: '프롤로그: 왜 이 사명을 기록하는가', keys: [] },
  { ord: 1, title: '믿음이 시작된 집', keys: ['calling.gospel'] },
  { ord: 2, title: '나를 찾아오신 하나님', keys: ['calling.moment', 'calling.word'] },
  { ord: 3, title: '피할 수 없었던 부르심', keys: ['calling.struggle', 'calling.family'] },
  { ord: 4, title: '훈련과 기다림의 시간', keys: ['prep.school', 'prep.mentor', 'prep.cost'] },
  { ord: 5, title: '첫 교회, 첫 설교, 첫 성도', keys: ['prep.firstSermon', 'send.firstField', 'send.firstService'] },
  { ord: 6, title: '낯선 땅을 향한 순종', keys: ['send.church', 'send.sameLand', 'send.firstDay'] },
  { ord: 7, title: '아무것도 보이지 않던 개척의 날들', keys: ['send.lack', 'send.language', 'send.mistakes'] },
  { ord: 8, title: '한 영혼에게서 시작된 변화', keys: ['fruit.firstConvert', 'fruit.changedMe'] },
  { ord: 9, title: '사역을 멈추고 싶었던 순간', keys: ['suffer.crisis', 'suffer.burnout'] },
  { ord: 10, title: '가족이 함께 감당한 선교', keys: ['suffer.family', 'suffer.expel'] },
  { ord: 11, title: '동역자와 제자를 세우다', keys: ['fruit.disciples', 'fruit.partners'] },
  { ord: 12, title: '교회와 지역이 변화되다', keys: ['fruit.community'] },
  { ord: 13, title: '실패를 통해 다시 배운 복음', keys: ['suffer.conflict', 'suffer.leading', 'suffer.after'] },
  { ord: 14, title: '다음 세대에게 사명을 넘기다', keys: ['legacy.handover', 'legacy.principle', 'legacy.letter'] },
  { ord: 15, title: '끝까지 붙들고 싶은 말씀', keys: ['legacy.word', 'legacy.sermon', 'legacy.restart'] },
  { ord: 16, title: '사역 철학과 남기는 조언', keys: ['prep.philosophy'] },
];

export type AnswerLike = {
  question_key: string;
  question: string;
  body: string;
  year: number | null;
  place: string;
  people: string;
  evidence: string;
  fact_status: FactStatus;
  visibility: Visibility;
};

export type TimelineLike = {
  year: number;
  month: number | null;
  place: string;
  org: string;
  role: string;
  event: string;
  people: string;
  evidence: string;
};

export type SubjectLike = {
  name: string;
  role: MissionRole;
  denomination: string;
  church: string;
  fields: string;
  summary: string;
  security_mode: boolean;
  /** 고인의 기록인가. 다큐 대본의 말투가 여기서 갈린다. */
  is_deceased?: boolean;
};

/**
 * 보안 지역의 지명·인명을 가린다.
 *
 * **구조화된 칸(장소·인물)만 가릴 수 있다.** 본문 속 지명까지 기계가 지우려
 * 들면 반드시 놓치거나 엉뚱한 말을 지운다 — 사람이 다치는 쪽이라 흉내내지
 * 않는다. 대신 원고 맨 앞에 「본문은 사람이 직접 확인할 것」을 적는다.
 */
function maskIfSecure(value: string, secure: boolean): string {
  const text = (value ?? '').trim();
  if (!secure || !text) return text;
  return '○○';
}

function chapterBody(chapter: ChapterPreset, answers: AnswerLike[], secure: boolean): string {
  const lines: string[] = [];
  for (const key of chapter.keys) {
    const answer = answers.find((a) => a.question_key === key);
    if (!answer || !isAnswered(answer.body)) continue;

    lines.push(`> ${answer.question}`);
    lines.push('');
    lines.push(answer.body.trim());

    // 근거는 원고 안에 붙여 둔다. 나중에 빼기는 쉬워도, 없던 근거를 되찾기는
    // 어렵다(§21.9 — 원문과 편집문을 견줄 수 있게 한다).
    const marks: string[] = [];
    if (answer.year) marks.push(`${answer.year}년`);
    const place = maskIfSecure(answer.place, secure);
    if (place) marks.push(place);
    const people = maskIfSecure(answer.people, secure);
    if (people) marks.push(people);
    marks.push(factShort(answer.fact_status));
    if (answer.evidence) marks.push(`근거: ${answer.evidence}`);
    lines.push('');
    lines.push(`*(${marks.join(' · ')})*`);
    lines.push('');
  }
  return lines.join('\n').trim();
}

/**
 * 초고를 엮는다.
 *
 * **말하지 않은 것을 지어내지 않는다(§21.5).** 여기서 하는 일은 답을 장별로
 * 모으고, 근거를 함께 적고, 연표를 부록으로 붙이는 것뿐이다. 1인칭 자서전이나
 * 3인칭 평전으로 문체를 바꾸는 일은 사람(또는 나중에 붙일 모델)의 몫이다 —
 * 규칙으로 한국어 문체를 바꾸면 사역자의 목소리가 망가진다.
 */
export function buildManuscript(
  subject: SubjectLike,
  answers: AnswerLike[],
  timeline: TimelineLike[],
  exportLevel: Visibility = 'writer',
  extras: { testimonies?: TestimonyLike[]; assets?: AssetLike[] } = {},
): string {
  const usable = answers.filter((a) => allowedInExport(a.visibility, exportLevel));
  const out: string[] = [];

  out.push(`# ${subject.name} 사역 기록`);
  out.push('');
  const head = [subject.denomination, subject.church, subject.fields].filter(Boolean).join(' · ');
  if (head) out.push(head);
  if (subject.summary) {
    out.push('');
    out.push(subject.summary.trim());
  }
  out.push('');
  out.push(`*내보낸 범위: ${visibilityLabel(exportLevel)}까지 · 비공개 항목은 어떤 원고에도 들어가지 않습니다.*`);
  if (subject.security_mode) {
    out.push('');
    out.push('> **보안 지역 기록입니다.** 장소와 인물 칸은 ○○ 로 가렸습니다. 본문 속 지명·실명은 기계가 지우지 않았으니 출판 전에 사람이 직접 확인해 주세요.');
  }
  out.push('');
  out.push('---');
  out.push('');

  for (const chapter of CHAPTER_PRESET) {
    const body = chapterBody(chapter, usable, subject.security_mode);
    if (chapter.ord === 0 || !body) {
      if (chapter.ord !== 0) continue; // 답이 없는 장은 빈 제목만 남기지 않는다
    }
    out.push(`## ${chapter.ord === 0 ? '' : `${chapter.ord}. `}${chapter.title}`);
    out.push('');
    out.push(body || '(아직 기록되지 않았습니다.)');
    out.push('');
  }

  if (timeline.length > 0) {
    out.push('---');
    out.push('');
    out.push('## 부록: 사역 연표');
    out.push('');
    out.push('| 연도 | 장소 | 교회·기관 | 역할 | 주요 사건 | 관련 인물 | 근거 자료 |');
    out.push('|---|---|---|---|---|---|---|');
    for (const row of [...timeline].sort((a, b) => a.year - b.year || (a.month ?? 0) - (b.month ?? 0))) {
      const when = row.month ? `${row.year}.${String(row.month).padStart(2, '0')}` : `${row.year}`;
      const cells = [
        when,
        maskIfSecure(row.place, subject.security_mode),
        row.org,
        row.role,
        row.event,
        maskIfSecure(row.people, subject.security_mode),
        row.evidence,
      ].map((c) => (c || '').replace(/\|/g, '/'));
      out.push(`| ${cells.join(' | ')} |`);
    }
    out.push('');
  }

  // ── 부록: 동역자의 증언 (§10) ──────────────────────────────────────
  // **서로 다른 기억을 임의로 합치지 않는다.** 누가 무엇을 말했는지 그대로
  // 나란히 적는다. 합쳐 놓으면 나중에 어느 쪽이 무슨 말을 했는지 되찾을 수 없다.
  const testimonies = (extras.testimonies ?? []).filter((t) => allowedInExport(t.visibility, exportLevel));
  if (testimonies.length > 0) {
    out.push('---');
    out.push('');
    out.push('## 부록: 가족과 동역자의 증언');
    out.push('');
    const byQuestion = new Map<string, TestimonyLike[]>();
    for (const item of testimonies) {
      const key = item.question || '(질문 없이 보내 주신 이야기)';
      const list = byQuestion.get(key);
      if (list) list.push(item);
      else byQuestion.set(key, [item]);
    }
    for (const [question, list] of byQuestion) {
      out.push(`### ${question}`);
      out.push('');
      for (const item of list) {
        const who = [maskIfSecure(item.witness_name, subject.security_mode), item.relation]
          .filter(Boolean)
          .join(' · ');
        out.push(`**${who || '이름을 밝히지 않은 증언'}**`);
        out.push('');
        out.push(item.body.trim());
        out.push('');
      }
      if (list.length > 1) {
        out.push('*(같은 일에 관한 증언이 여럿입니다. 한쪽으로 합치지 않고 그대로 실었습니다.)*');
        out.push('');
      }
    }
  }

  // ── 부록: 사역 자료 (§9) ──────────────────────────────────────────
  const assets = (extras.assets ?? []).filter((a) => allowedInExport(a.visibility, exportLevel));
  if (assets.length > 0) {
    out.push('---');
    out.push('');
    out.push('## 부록: 사역 자료 목록');
    out.push('');
    for (const asset of assets) {
      const when = asset.year ? `${asset.year}${asset.month ? `.${String(asset.month).padStart(2, '0')}` : ''}` : '연도 미상';
      const where = maskIfSecure(asset.place, subject.security_mode);
      out.push(`- [${assetKindLabel(asset.kind)}] ${asset.title || '(제목 없음)'} — ${[when, where].filter(Boolean).join(' · ')}`);
    }
    out.push('');
  }

  return out.join('\n');
}

// ── 2단계: 사역 자료실 · 공동 증언 · 발자취 · 인쇄본 ─────────────────

export type AssetKind = 'sermon' | 'photo' | 'letter' | 'bulletin' | 'document' | 'audio' | 'video' | 'other';

export const ASSET_KINDS: { id: AssetKind; label: string }[] = [
  { id: 'sermon', label: '설교' },
  { id: 'photo', label: '사진' },
  { id: 'letter', label: '선교 편지' },
  { id: 'bulletin', label: '주보' },
  { id: 'document', label: '문서' },
  { id: 'audio', label: '음성' },
  { id: 'video', label: '영상' },
  { id: 'other', label: '그 밖의 자료' },
];

export function assetKindLabel(kind: AssetKind): string {
  return ASSET_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

export type AssetLike = {
  kind: AssetKind;
  title: string;
  body: string;
  year: number | null;
  month: number | null;
  place: string;
  people: string;
  visibility: Visibility;
};

export type TestimonyLike = {
  witness_name: string;
  relation: string;
  question: string;
  body: string;
  visibility: Visibility;
};

/**
 * 설교와 편지에서 **반복해서 나온 말**을 뽑는다 (§9).
 *
 * 「핵심 메시지를 찾아낸다」고 하지 않는다 — 이것은 낱말을 세는 일이지 뜻을
 * 읽는 일이 아니다. 세어 놓고 「이 말이 자주 나옵니다, 여기가 목회철학입니까?」
 * 하고 사람에게 되묻는 것이 정직하다.
 *
 * 한국어는 조사가 붙어 같은 낱말이 다른 낱말처럼 세어진다(은혜가/은혜를/은혜는).
 * 형태소 분석기를 싣지 않고 **자주 쓰이는 조사만 꼬리에서 떼어** 어림한다.
 */
const JOSA = ['으로서', '에서는', '에서', '으로', '에게', '까지', '부터', '이라', '라고', '하고', '이나', '으로써', '와의', '과의', '의', '을', '를', '이', '가', '은', '는', '도', '만', '과', '와', '로', '에'];
const STOPWORDS = new Set([
  '그리고', '그러나', '하지만', '그래서', '우리', '저는', '제가', '그것', '이것', 'there', '있는', '있다', '없는', '없다', '합니다', '했습니다', '입니다', '이런', '저런', '그런', '때문', '통해', '위해', '대해', '모든', '다시', '정말', '많이', '조금', '항상', '지금', '오늘', '내일', '어제', '사람', '생각', '말씀드리',
]);

function normalizeWord(raw: string): string {
  let word = raw;
  for (const josa of JOSA) {
    if (word.length > josa.length + 1 && word.endsWith(josa)) {
      word = word.slice(0, -josa.length);
      break;
    }
  }
  return word;
}

export function repeatedWords(texts: string[], limit = 12): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const raw of (text ?? '').split(/[^가-힣A-Za-z]+/)) {
      if (raw.length < 2) continue;
      const word = normalizeWord(raw);
      if (word.length < 2 || STOPWORDS.has(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

export type PlaceGroup = {
  place: string;
  firstYear: number | null;
  lastYear: number | null;
  events: string[];
  assets: number;
};

/**
 * 발자취를 장소별로 묶는다 (§8 선교 지도).
 *
 * 지도를 앱 안에 그리지 않는다 — 이 리포는 성경지도에서도 같은 판단을 했다
 * (네이티브 지도 의존성을 들이지 않고 밖으로 연다). 여기서는 장소마다 언제
 * 무슨 일이 있었는지를 모아 두고, 지도는 눌러서 밖에서 연다.
 */
export function groupPlaces(
  timeline: TimelineLike[],
  answers: AnswerLike[],
  assets: AssetLike[] = [],
): PlaceGroup[] {
  const groups = new Map<string, PlaceGroup>();
  const touch = (placeRaw: string, year: number | null, event: string, isAsset: boolean) => {
    const place = (placeRaw ?? '').trim();
    if (!place) return;
    const found = groups.get(place) ?? { place, firstYear: null, lastYear: null, events: [], assets: 0 };
    if (year) {
      found.firstYear = found.firstYear === null ? year : Math.min(found.firstYear, year);
      found.lastYear = found.lastYear === null ? year : Math.max(found.lastYear, year);
    }
    if (isAsset) found.assets += 1;
    else if (event) found.events.push(event);
    groups.set(place, found);
  };

  for (const row of timeline) touch(row.place, row.year, row.event || row.org || row.role, false);
  for (const answer of answers) {
    if (!isAnswered(answer.body)) continue;
    touch(answer.place, answer.year, answer.body.trim().split(/[.!?\n]/)[0].slice(0, 60), false);
  }
  for (const asset of assets) touch(asset.place, asset.year, '', true);

  return [...groups.values()].sort((a, b) => (a.firstYear ?? 9999) - (b.firstYear ?? 9999));
}

/** 지도는 밖에서 연다. 장소 이름만으로 여는 일반 지도 검색 주소. */
export function placeMapUrl(place: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(place)}`;
}

/**
 * 인쇄·전자책용 HTML 한 장.
 *
 * EPUB 을 만들지 않은 이유: EPUB 은 zip 묶음이라 압축 라이브러리를 새로 실어야
 * 하는데, 브라우저에서 인쇄(→ PDF 저장)만으로도 종이책 원고와 전자책 원고가
 * 둘 다 나온다. 먼저 이것으로 쓰이는지 보고 필요하면 그때 EPUB 을 더한다.
 *
 * 우리가 만든 마크다운만 다룬다(제목·인용·기울임·표·구분선·문단). 일반적인
 * 마크다운 변환기가 아니다 — 들어올 글의 모양을 우리가 알고 있으므로 그만큼만
 * 다룬다.
 */
export function manuscriptToHtml(markdown: string, title: string): string {
  const escape = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (text: string) =>
    escape(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

  const lines = markdown.split('\n');
  const html: string[] = [];
  let paragraph: string[] = [];
  let table: string[][] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      html.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const flushTable = () => {
    if (table.length === 0) return;
    const [head, ...rows] = table;
    html.push('<table>');
    html.push(`<thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead>`);
    html.push('<tbody>');
    for (const row of rows) html.push(`<tr>${row.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`);
    html.push('</tbody></table>');
    table = [];
  };

  for (const line of lines) {
    const text = line.trimEnd();
    if (text.startsWith('|')) {
      const cells = text.slice(1, text.endsWith('|') ? -1 : undefined).split('|').map((c) => c.trim());
      // |---|---| 줄은 표의 뼈대일 뿐이라 버린다.
      if (cells.every((c) => /^-{2,}$/.test(c))) continue;
      flushParagraph();
      table.push(cells);
      continue;
    }
    flushTable();

    if (text === '') {
      flushParagraph();
    } else if (text === '---') {
      flushParagraph();
      html.push('<hr />');
    } else if (text.startsWith('### ')) {
      flushParagraph();
      html.push(`<h3>${inline(text.slice(4))}</h3>`);
    } else if (text.startsWith('## ')) {
      flushParagraph();
      // 장은 새 쪽에서 시작한다 — 종이책은 그래야 읽힌다.
      html.push(`<h2>${inline(text.slice(3))}</h2>`);
    } else if (text.startsWith('# ')) {
      flushParagraph();
      html.push(`<h1>${inline(text.slice(2))}</h1>`);
    } else if (text.startsWith('> ')) {
      flushParagraph();
      html.push(`<blockquote>${inline(text.slice(2))}</blockquote>`);
    } else if (text.startsWith('- ')) {
      flushParagraph();
      html.push(`<p class="item">${inline(text.slice(2))}</p>`);
    } else {
      paragraph.push(text);
    }
  }
  flushParagraph();
  flushTable();

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escape(title)}</title>
<style>
  @page { size: A5; margin: 18mm 15mm; }
  body { font-family: 'Noto Serif KR', serif; line-height: 1.9; color: #2b211c; max-width: 42em; margin: 0 auto; padding: 2rem 1.5rem; }
  h1 { font-size: 1.9rem; text-align: center; margin-bottom: 0.4rem; }
  h2 { font-size: 1.3rem; margin-top: 2.4rem; page-break-before: always; }
  h2:first-of-type { page-break-before: avoid; }
  h3 { font-size: 1.05rem; margin-top: 1.6rem; }
  blockquote { margin: 1.2rem 0; padding-left: 1rem; border-left: 3px solid #bc5c35; color: #6b574d; }
  em { color: #6b574d; font-size: 0.86em; }
  p { margin: 0.8rem 0; text-align: justify; }
  p.item { margin: 0.25rem 0 0.25rem 1rem; }
  table { border-collapse: collapse; width: 100%; font-size: 0.86rem; margin: 1rem 0; }
  th, td { border: 1px solid #e3d3c6; padding: 0.35rem 0.5rem; text-align: left; }
  hr { border: none; border-top: 1px solid #e3d3c6; margin: 2rem 0; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
${html.join('\n')}
</body>
</html>`;
}

/** 확인이 필요한 항목. 홈 화면의 「확인이 필요한 사건」(§16)이 이 목록이다. */
export function needsCheck<T extends Pick<AnswerLike, 'body' | 'fact_status'>>(answers: T[]): T[] {
  return answers.filter(
    (a) => isAnswered(a.body) && (a.fact_status === 'need_year' || a.fact_status === 'conflict' || a.fact_status === 'review'),
  );
}

/**
 * 답에서 연표 한 줄을 만들어 본다.
 *
 * 연도를 모르면 연표에 놓을 자리가 없으므로 null 이다 — 임의로 짐작해 넣으면
 * 그 짐작이 그대로 교회사가 된다.
 */
export function toTimelineDraft(answer: AnswerLike): Omit<TimelineLike, 'evidence'> & { evidence: string } | null {
  // 연도 칸이 비었으면 본문에서 찾아본다 — 「1995년에」라고 말해 놓고 칸은 비워
  // 두는 일이 잦다. 그래도 없으면 연표에 놓을 자리가 없다.
  const fromBody = Number((answer.body.match(YEAR_PATTERN)?.[0] ?? '').replace(/[^0-9]/g, ''));
  const year = answer.year ?? (Number.isFinite(fromBody) && fromBody > 0 ? fromBody : null);
  if (!year) return null;
  return {
    year,
    month: null,
    place: answer.place,
    org: '',
    role: '',
    event: answer.body.trim().split(/[.!?\n]/)[0].slice(0, 60),
    people: answer.people,
    evidence: answer.evidence,
  };
}

// ── 3단계: 다큐멘터리 대본 · 디지털 기념관 ───────────────────────────

/**
 * 「카메라 앞에 세울 만한 이야기」를 고른다 (기획서 §18 3단계 「하이라이트 추출」).
 *
 * 영상을 자르지 않는다 — 자를 영상이 이 앱에 없다. 대신 **어느 답이 장면이
 * 되는지**를 고른다. 고르는 잣대는 셋이다: 언제 있었는지 아는 이야기(연도),
 * 충분히 말한 이야기(길이), 그리고 흐름이 꺾인 이야기(전환·응답). 왜 골랐는지를
 * 함께 돌려주어 사람이 뒤집을 수 있게 한다.
 */
export type Highlight = { key: string; question: string; body: string; year: number | null; reason: string };

export function pickHighlights(answers: AnswerLike[], limit = 8): Highlight[] {
  const scored = answers
    .filter((a) => isAnswered(a.body) && a.visibility !== 'private')
    .map((a) => {
      const reasons: string[] = [];
      let score = 0;
      if (a.year) {
        score += 2;
        reasons.push('연도가 있다');
      }
      if (a.body.trim().length >= 200) {
        score += 2;
        reasons.push('길게 말씀하셨다');
      }
      if (TURN_WORDS.some((w) => a.body.includes(w))) {
        score += 3;
        reasons.push('흐름이 꺾인 대목');
      }
      if (MIRACLE_WORDS.some((w) => a.body.includes(w))) {
        score += 2;
        reasons.push('기도 응답·치유의 증언');
      }
      if (a.evidence.trim()) {
        score += 1;
        reasons.push('보여 줄 자료가 있다');
      }
      return { a, score, reasons };
    })
    .filter((item) => item.score >= 3)
    .sort((x, y) => y.score - x.score);

  return scored.slice(0, limit).map(({ a, reasons }) => ({
    key: a.question_key,
    question: a.question,
    body: a.body.trim(),
    year: a.year,
    reason: reasons.join(' · '),
  }));
}

/**
 * 내레이션 한 줄.
 *
 * **연표에 적힌 사실만으로 만든다.** 「그는 두려웠다」 같은 말을 붙이지 않는다 —
 * 아무도 그렇게 말한 적이 없기 때문이다(§21.5). 형용사가 필요하면 사람이 쓴다.
 */
function narrationFor(row: TimelineLike, secure: boolean): string {
  const when = row.month ? `${row.year}년 ${row.month}월` : `${row.year}년`;
  const where = maskIfSecure(row.place, secure);
  const parts = [when];
  if (where) parts.push(where);
  const org = row.org.trim();
  if (org) parts.push(org);
  const what = row.event.trim() || row.role.trim();
  return what ? `${parts.join(', ')} — ${what}.` : `${parts.join(', ')}.`;
}

/**
 * 다큐멘터리 대본 초고 (기획서 §11).
 *
 * 씬 하나에 넷을 나란히 둔다 — 화면(무엇을 비출지), 내레이션(연표에서 나온
 * 사실), 사역자 육성(인터뷰 원문 그대로), 증언(누가 말했는지 밝혀서). 넷을
 * 섞어 한 문단으로 녹이지 않는다: 촬영·편집하는 사람이 **어디까지가 본인 말이고
 * 어디부터가 우리가 붙인 말인지** 한눈에 봐야 하기 때문이다.
 */
export function buildDocumentaryScript(
  subject: SubjectLike,
  answers: AnswerLike[],
  timeline: TimelineLike[],
  testimonies: TestimonyLike[] = [],
  assets: AssetLike[] = [],
  exportLevel: Visibility = 'church',
): string {
  const usable = answers.filter((a) => allowedInExport(a.visibility, exportLevel));
  const usableTestimonies = testimonies.filter((t) => allowedInExport(t.visibility, exportLevel));
  const usableAssets = assets.filter((a) => allowedInExport(a.visibility, exportLevel));
  const highlights = pickHighlights(usable);
  const secure = subject.security_mode;

  const out: string[] = [];
  out.push(`# ${subject.name} — 다큐멘터리 대본 초고`);
  out.push('');
  out.push(
    `*내보낸 범위: ${visibilityLabel(exportLevel)}까지 · 내레이션은 연표에 적힌 사실만으로 지었습니다. 감정을 담은 문장은 사람이 쓰셔야 합니다.*`,
  );
  if (secure) {
    out.push('');
    out.push('> **보안 지역 기록입니다.** 지명과 인명을 가렸습니다. 얼굴이 나오는 장면은 촬영 전에 본인 동의를 받아 주세요.');
  }
  out.push('');
  out.push('---');
  out.push('');

  // 여는 장면 — 사역자가 누구인지 한 문장.
  out.push('## 씬 1. 여는 장면');
  out.push('');
  out.push(`**화면** — ${usableAssets.find((a) => a.kind === 'photo')?.title ?? '초기 사역 사진'} 위로 자막.`);
  out.push('');
  const intro = [subject.denomination, subject.church, subject.fields].filter(Boolean).join(' · ');
  out.push(
    `**내레이션** — ${subject.name}님이 ${subject.is_deceased ? '걸어가신 길입니다' : '걸어온 길입니다'}.${intro ? ` ${intro}.` : ''}`,
  );
  if (subject.summary.trim()) {
    out.push('');
    out.push(`**자막** — ${subject.summary.trim()}`);
  }
  out.push('');

  // 연표를 따라 흐르는 본 씬들. 하이라이트가 붙는 해에는 육성을 얹는다.
  const sorted = [...timeline].sort((a, b) => a.year - b.year || (a.month ?? 0) - (b.month ?? 0));
  let sceneNo = 2;
  for (const row of sorted) {
    out.push(`## 씬 ${sceneNo}. ${row.year}년${row.place ? ` · ${maskIfSecure(row.place, secure)}` : ''}`);
    out.push('');
    const photo = usableAssets.find((a) => a.year === row.year && a.kind === 'photo');
    out.push(`**화면** — ${photo ? `${photo.title || '사진'} (${photo.year}년)` : '해당 시기의 사진·영상 자료를 찾아 넣으세요.'}`);
    out.push('');
    out.push(`**내레이션** — ${narrationFor(row, secure)}`);

    const voice = highlights.find((h) => h.year === row.year);
    if (voice) {
      out.push('');
      out.push('**사역자 육성** (인터뷰 원문 그대로)');
      out.push('');
      out.push(`> ${voice.body.split('\n').join(' ')}`);
    }
    out.push('');
    sceneNo += 1;
  }

  // 육성만 있고 연도가 없는 이야기 — 연표에 못 붙였으니 따로 모은다.
  const floating = highlights.filter((h) => !h.year || !sorted.some((row) => row.year === h.year));
  if (floating.length > 0) {
    out.push(`## 씬 ${sceneNo}. 자리를 정해야 하는 이야기`);
    out.push('');
    out.push('**연출 메모** — 아래는 연표에 붙일 해를 아직 모르는 이야기입니다. 연도를 확인하면 위 흐름 안으로 옮기세요.');
    out.push('');
    for (const item of floating) {
      out.push(`- **${item.question}** — ${item.body.slice(0, 160)}${item.body.length > 160 ? '…' : ''}`);
      out.push(`  *(고른 이유: ${item.reason})*`);
    }
    out.push('');
    sceneNo += 1;
  }

  if (usableTestimonies.length > 0) {
    out.push(`## 씬 ${sceneNo}. 곁에서 본 사람들`);
    out.push('');
    out.push('**화면** — 증언해 주신 분들의 인터뷰. 한 사람씩, 이름과 관계를 자막으로.');
    out.push('');
    for (const item of usableTestimonies) {
      const who = [maskIfSecure(item.witness_name, secure), item.relation].filter(Boolean).join(' · ');
      out.push(`**자막** — ${who || '증언자'}`);
      out.push('');
      out.push(`> ${item.body.trim().split('\n').join(' ')}`);
      out.push('');
    }
    sceneNo += 1;
  }

  out.push(`## 씬 ${sceneNo}. 닫는 장면`);
  out.push('');
  const legacy = usable.find((a) => a.question_key === 'legacy.word' && isAnswered(a.body));
  const letter = usable.find((a) => a.question_key === 'legacy.letter' && isAnswered(a.body));
  out.push('**화면** — 지금의 사역지, 또는 후임자와 함께 선 모습.');
  out.push('');
  if (legacy) {
    out.push('**사역자 육성** (평생 붙든 말씀)');
    out.push('');
    out.push(`> ${legacy.body.trim().split('\n').join(' ')}`);
    out.push('');
  }
  if (letter) {
    out.push('**사역자 육성** (다음 세대에게)');
    out.push('');
    out.push(`> ${letter.body.trim().split('\n').join(' ')}`);
    out.push('');
  }
  if (!legacy && !letter) {
    out.push('**연출 메모** — 「평생 붙든 말씀」과 「다음 세대에게 보내는 편지」를 아직 안 여쭈었습니다. 인터뷰에서 그 둘을 받으면 닫는 장면이 채워집니다.');
    out.push('');
  }

  return out.join('\n');
}

// ── 기념관 ───────────────────────────────────────────────────────────

/** 주소에 쓸 이름. 한글 이름은 주소에 담기 어려우므로 영문·숫자만 받는다. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,48}[a-z0-9]$/.test(slug);
}

export function slugify(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  // 한글만 적으면 아무것도 남지 않는다. 그때는 빈 값을 돌려주고 화면이 되묻는다.
  return cleaned.length >= 4 ? cleaned.slice(0, 50) : '';
}

export type MemorialData = {
  name: string;
  title: string | null;
  intro: string | null;
  role: MissionRole;
  denomination: string;
  church: string;
  fields: string;
  summary: string;
  is_deceased: boolean;
  timeline: { year: number; month: number | null; place: string; org: string; role: string; event: string; people: string }[];
  stories: { question: string; body: string; year: number | null; place: string }[];
  testimonies: { witness_name: string; relation: string; question: string; body: string }[];
  photos: { path: string; caption: string }[];
};

/**
 * 기념관이 비어 보이는 이유를 짚어 준다.
 *
 * 「공개」로 표시한 것만 나가므로(0081), 처음 켠 사람은 십중팔구 텅 빈 기념관을
 * 본다. 그때 「왜 비었는가」를 말해 주지 않으면 고장으로 읽힌다.
 */
export function memorialReadiness(answers: AnswerLike[], testimonies: TestimonyLike[], photos: number): string[] {
  const notes: string[] = [];
  const publicAnswers = answers.filter((a) => a.visibility === 'public' && isAnswered(a.body)).length;
  if (publicAnswers === 0) {
    notes.push('공개로 표시한 이야기가 없습니다. 사실 검토실에서 내보낼 이야기를 「공개」로 바꿔 주세요.');
  }
  if (testimonies.length > 0 && testimonies.every((t) => t.visibility !== 'public')) {
    notes.push('받은 증언이 모두 비공개 범위입니다. 기념관에 싣고 싶은 증언은 「공개」로 바꿔 주세요.');
  }
  if (photos === 0) {
    notes.push('기념관에 건 사진이 없습니다. 자료실에서 사진을 고른 뒤 여기로 올려 주세요.');
  }
  return notes;
}
