/**
 * 수능영어 코치ON — 자료 구조.
 *
 * 기획서 §3(유형 체계), §4.2(문항 데이터), §6.2(오답 원인), §14(데이터 모델)를
 * 그대로 타입으로 옮긴 것이다. 화면·엔진·저장소가 전부 이 파일만 보고 말한다.
 *
 * 원칙 하나: **문항 번호로 분류하지 않는다.** 회차마다 번호가 달라지므로
 * 언제나 `QuestionTypeId`(학습 유형)로만 다룬다(기획서 §3 머리말).
 */

/** 읽기 영역 학습 유형. 번호가 아니라 이것이 분류의 단위다. */
export type QuestionTypeId =
  | 'purpose' // 목적
  | 'mood' // 심경·분위기
  | 'detail' // 내용 일치
  | 'claim' // 주장
  | 'mainIdea' // 요지
  | 'topic' // 주제
  | 'title' // 제목
  | 'vocab' // 문맥상 어휘
  | 'grammar' // 어법
  | 'implied' // 함축 의미
  | 'blank' // 빈칸 추론
  | 'irrelevant' // 무관한 문장
  | 'order' // 순서 배열
  | 'insertion' // 문장 삽입
  | 'summary'; // 요약문

/** 기획서 §3.2의 영역 구분. 진단 레이더의 축이 된다. */
export type Domain = 'practical' | 'gist' | 'lexicogrammar' | 'inference' | 'structure' | 'integration';

/** 사고 난이도 1~5. 5가 수능 고난도. */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

/** 어휘 난이도 (기획서 §3.3). */
export type VocabLevel = 'middle' | 'high1' | 'high2' | 'csatBase' | 'csatHard';

/** 오답 원인 (기획서 §6.2). AI 추정과 학생 자기진단이 같은 값을 쓴다. */
export type ErrorCauseId = 'vocab' | 'syntax' | 'logic' | 'strategy' | 'time' | 'careless';

/** 제출 직전 스스로 매기는 확신도 (기획서 §5.4). */
export type Confidence = 'sure' | 'unsure' | 'guess';

/** 시험 모드는 해설을 잠그고 타이머를 강제한다 (기획서 §5.4). */
export type QuizMode = 'study' | 'exam' | 'diagnostic' | 'review';

/** 저작권 상태 (기획서 §4.2 / §4.4).
 *
 * MVP에 실리는 문항은 전부 `original` — 기출의 평가 요소와 형식만 참고하고
 * 문장과 선택지를 새로 썼다. 기출 원문은 이용 허가가 확인되기 전에는
 * 앱에 담지 않고 출처 링크와 분류 정보만 준다(§4.4). */
export type LicenseStatus = 'original' | 'licensed' | 'link-only';

export type QuestionSource = {
  status: LicenseStatus;
  /** 화면에 그대로 보여 줄 출처 문구. */
  label: string;
  /** 링크만 제공하는 문항일 때의 원문 주소. */
  url?: string;
  /** 검수 이력 — 누가 언제 봤는가. 미검수면 비워 둔다. */
  reviewedBy?: string;
  reviewedAt?: string;
};

export type Choice = {
  /** 1~5. 화면의 ①~⑤와 같다. */
  id: number;
  text: string;
  /** 선택지별 오답 이유 (기획서 §4.2). 정답 선택지는 비운다. */
  whyWrong?: string;
  /** 이 선택지를 고른 학생이 무엇에서 걸린 것인지 (기획서 §6.2).
   *  오답 원인 추정의 1순위 근거다. */
  cause?: ErrorCauseId;
};

export type KeyVocab = {
  word: string;
  meaning: string;
  /** 다의어·혼동어 주의점 (기획서 §7.1). */
  note?: string;
};

export type KeySyntax = {
  sentence: string;
  /** 끊어 읽기 단위 (기획서 §7.3). 순서대로 이으면 원문이 된다. */
  chunks: string[];
  translation: string;
  /** 무엇이 어려운 구조인가 — 삽입·도치·장거리 수식 등. */
  point: string;
};

export type Question = {
  id: string;
  type: QuestionTypeId;
  difficulty: Difficulty;
  vocabLevel: VocabLevel;
  /** 권장 풀이시간(초). 이 시간을 넘겨 맞히면 속도 훈련 대상이 된다(§6.1). */
  expectedSeconds: number;
  source: QuestionSource;
  /** 발문. */
  instruction: string;
  /** 지문을 문장 단위로 쪼갠 것. 문장별 표시·근거 밑줄이 여기에 걸린다(§5.4). */
  passage: string[];
  choices: Choice[];
  /** 정답 선택지 id. */
  answer: number;
  /** 정답 근거 문장의 `passage` 인덱스 (기획서 §4.2). */
  evidenceIndex: number;
  /** 글의 한 줄 구조 — 단계별 해설 2단계 (§5.5). */
  structureLine: string;
  /** 1단계 힌트. 답을 말하지 않는다. */
  hint: string;
  /** 완전 해설. */
  explanation: string;
  /** 다음에 쓸 풀이 규칙 (복습 카드 §6.3). */
  rule: string;
  keyVocab: KeyVocab[];
  keySyntax: KeySyntax[];
  /** 같은 개념을 묻는 변형 문제 id (§6.4의 3일 후 복습에 쓴다). */
  variantOf?: string;
};

/** 한 문항을 푼 기록 (기획서 §14 Attempt). */
export type Attempt = {
  id: number;
  questionId: string;
  type: QuestionTypeId;
  mode: QuizMode;
  chosen: number;
  correct: boolean;
  seconds: number;
  confidence: Confidence;
  /** 답을 몇 번 바꿨는가 (§5.4). */
  changes: number;
  /** 학생이 근거라고 지목한 문장 인덱스. 안 골랐으면 null. */
  evidenceIndex: number | null;
  /** AI가 추정한 원인. 정답이면 null. */
  aiCause: ErrorCauseId | null;
  /** 학생 자기진단. 아직 안 골랐으면 null (§6.2). */
  selfCause: ErrorCauseId | null;
  /** 제출 직후 적은 "왜 이 답을 골랐나" (§5.4). */
  reason: string | null;
  createdAt: number;
};

/** 새 기록을 넣을 때 쓰는 모양 — id와 createdAt은 저장소가 매긴다. */
export type NewAttempt = Omit<Attempt, 'id' | 'createdAt'>;

/** 간격 반복 단계 (기획서 §6.4). 0=오늘 재풀이 … 5=30일 확인 평가. */
export type ReviewStage = 0 | 1 | 2 | 3 | 4 | 5;

export type ReviewItem = {
  questionId: string;
  stage: ReviewStage;
  /** 다음 복습 예정 시각(epoch ms). */
  dueAt: number;
  successCount: number;
  failCount: number;
  /** 완전정복 판정 시각. null이면 아직. */
  masteredAt: number | null;
  /** 학생이 직접 별표한 문항 (§6.1). */
  starred: boolean;
  /** 학생 메모 (§6.3). */
  note: string | null;
  /** 복습노트에 들어온 이유 — 목록에서 그대로 보여 준다. */
  reason: ReviewReason;
  createdAt: number;
  updatedAt: number;
};

/** 복습노트 자동 저장 사유 (기획서 §6.1). */
export type ReviewReason = 'wrong' | 'luckyGuess' | 'slow' | 'flipflop' | 'starred';

/** 유형·개념별 숙련도. 기록에서 계산해서 만든다(따로 저장하지 않는다). */
export type Mastery = {
  type: QuestionTypeId;
  attempts: number;
  correct: number;
  /** 0~1. 최근 기록에 가중치를 준 정답률. */
  accuracy: number;
  /** 권장시간 대비 평균 배속. 1보다 크면 느리다. */
  paceRatio: number;
  /** 0~100. 정답률과 속도를 함께 반영한 값. */
  score: number;
};

export type DiagnosticResult = {
  takenAt: number;
  total: number;
  correct: number;
  /** 영역별 0~100. 레이더 축 (§5.1). */
  byDomain: Record<Domain, number>;
  byType: Mastery[];
  /** 등급은 단정하지 않고 구간으로 말한다 (§8.3). */
  gradeBand: { low: number; high: number };
  /** 원인 분포 상위. */
  topCauses: { cause: ErrorCauseId; count: number }[];
  /** 4주 처방 (§5.1). */
  prescription: string[];
};
