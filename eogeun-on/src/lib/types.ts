/**
 * 어근영단어ON 의 자료 모양.
 *
 * 이 파일과 `srs.ts`·`session.ts`·`questions.ts`·`report.ts` 는 React 도
 * React Native 도 부르지 않는다. 노드로 바로 돌려 검사하기 위해서다
 * (`npm test` → `scripts/check-engine.ts`). 서로 부를 때 `.ts` 를 붙이는 것도
 * 그래서다.
 */

/** 학년 단계. 1차 출시는 e34·e56·m13 세 단계만 콘텐츠가 있다(기획서 §8). */
export type Grade = 'k' | 'e12' | 'e34' | 'e56' | 'm13' | 'h13';

export type Pos = 'n' | 'v' | 'adj' | 'adv' | 'phr';

export type MorphKind = 'prefix' | 'suffix' | 'base' | 'root';

export interface Morph {
  part: string;
  meaning: string;
  kind: MorphKind;
}

export interface Word {
  /** 표제어 그대로. 같은 철자가 둘이면 뒤에 `#2` 를 붙인다. */
  id: string;
  en: string;
  /** 대표 의미가 맨 앞. `; ` 로 나눈다. */
  ko: string;
  pos: Pos;
  grade: Grade;
  /** 같은 학년 안의 난도 1~3. */
  level: 1 | 2 | 3;
  /** 예문. 빈칸이 될 자리를 `[ ]` 로 감싼다 — 활용형일 수 있다(`[played]`). */
  example: string;
  exampleKo: string;
  /** 분해가 도움이 되고 뜻 연결이 분명할 때만 둔다(§4.3). */
  morph?: Morph[];
  /** 먼저 떠올리게 할 바탕 단어의 id(`rewrite` → `write`). */
  base?: string;
  /** 철자 변화·다의어·예외처럼 어근만 믿으면 틀리는 곳. */
  caution?: string;
  /** 영어 답으로 함께 받는 철자(color/colour). */
  accept?: string[];
}

/** §4.1 의 다섯 상태. */
export type Stage = 'new' | 'learning' | 'review' | 'stable' | 'long';

/**
 * 문항 방향(§4.2 「문항 방향 교차」).
 * - en2ko  : 영어를 보고 뜻 — 먼저 떠올린 뒤에야 보기가 열린다
 * - ko2en  : 뜻을 보고 영어
 * - listen : 소리를 듣고 단어
 * - cloze  : 예문 빈칸
 */
export type QKind = 'en2ko' | 'ko2en' | 'listen' | 'cloze';
export type AnswerMode = 'type' | 'choice';

/** 틀린 까닭(§4.1 「복습 오답」). */
export type FailReason = 'meaning' | 'spelling' | 'sound' | 'usage';

export interface Attempt {
  /** YYYY-MM-DD (기기 날짜). */
  day: string;
  kind: QKind;
  ok: boolean;
  hinted: boolean;
  ms: number;
  /** 그날 그 카드의 첫 시도인가. 예약은 이것만 보고 정한다. */
  first: boolean;
  reason?: FailReason;
}

export interface CardState {
  id: string;
  stage: Stage;
  /** 다음에 맞히면 쓸 간격 칸(`LADDER` 의 번호). */
  step: number;
  /** 다음 복습일 YYYY-MM-DD. */
  due: string;
  /** 연속으로 (도움 없이) 맞힌 횟수. */
  streak: number;
  lapses: number;
  firstSeen: string;
  lastOk?: string;
  lastFail?: FailReason;
  lastKind?: QKind;
  /** 최근 시도 몇 개만 남긴다(보고서용). */
  history: Attempt[];
}

export type Cards = Record<string, CardState>;

export interface Profile {
  grade: Grade;
  /** 새 단어를 꺼내기 시작할 난도. 진단이 정한다. */
  startLevel: 1 | 2 | 3;
  /** 주말 점검이 조정하는 새 단어 가감(−2~+2). */
  newAdjust: number;
  diagnosedAt: string;
  /** 주말 조정을 한 주에 한 번만 하려고 적어 두는 그 주의 토요일. */
  lastAdjustWeek?: string;
}

export interface DayLog {
  day: string;
  seconds: number;
  newCount: number;
  reviewCount: number;
  /** 오늘 세션을 끝까지 마쳤는가. */
  completed?: boolean;
}
