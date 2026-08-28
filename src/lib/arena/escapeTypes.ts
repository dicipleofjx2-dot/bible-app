/** 성경 방탈출의 자물쇠·방 구조. → docs/arena/README.md
 *
 * 자물쇠는 순서대로 열린다. 하나를 못 열면 다음 자물쇠는 보이지도 않는다 —
 * 방탈출의 긴장은 「다음이 뭔지 모르는 것」에서 온다. */

/** 숫자 키패드. 자릿수를 미리 알려 주면(digits) 어림이 좁혀져 답답함이 준다. */
export type NumberLock = {
  type: 'number';
  /** 자물쇠 위에 적히는 짧은 말 — "며칠?" 같은 단위 힌트 */
  unit?: string;
  answer: number;
  digits: number;
};

/** 글자 입력. 표기가 갈리는 답(감람나무/올리브나무)은 accepted 에 다 적는다. */
export type WordLock = {
  type: 'word';
  /** 첫 글자를 미리 보여 준다. 없으면 생략 */
  firstLetter?: string;
  accepted: string[];
};

export type ChoiceLock = {
  type: 'choice';
  choices: string[];
  correctIndex: number;
};

/** 장면을 시간 순으로 세운다. items 는 **정답 순서대로** 적고, 화면에서 섞는다.
 * 통독도우미 퀴즈에서 배운 것 — 정답을 데이터에 섞어 두면 사람이 검토할 때
 * 맞는지 알 수가 없다. 데이터는 정답 순, 섞기는 화면에서. */
export type OrderLock = {
  type: 'order';
  items: string[];
};

export type LockSpec = NumberLock | WordLock | ChoiceLock | OrderLock;

export type Lock = {
  id: string;
  /** 이 자물쇠가 걸린 물건 — "방주의 문", "돌판이 놓인 궤" */
  fixture: string;
  /** 문제 */
  question: string;
  /** 힌트 한 개. 쓰면 30초가 깎인다. 정답을 그대로 말해 주지 않는다. */
  hint: string;
  /** 열린 뒤 보여 주는 한 줄 — 근거 장·절을 반드시 넣는다 */
  reveal: string;
  spec: LockSpec;
};

export type EscapeRoom = {
  id: string;
  /** 방 이름 */
  title: string;
  /** 어느 사건인가 — "창세기 6~8장" */
  passage: string;
  emoji: string;
  /** 난이도 1~3. 대회 라운드가 올라갈수록 높은 방을 쓴다. */
  level: 1 | 2 | 3;
  /** 방에 들어섰을 때 읽는 상황 설명. 2~3문장. */
  intro: string;
  /** 제한 시간(초) */
  seconds: number;
  /**
   * 자물쇠 **후보**. 매 판 여기서 셋을 뽑아 순서까지 섞어 낸다.
   *
   * 처음에는 방마다 자물쇠를 딱 셋만 두었는데, 대회를 시작하기도 전에 사람들이
   * 들어와 다 풀어 버려 **문제가 통째로 노출됐다.** 후보를 넉넉히 두면 미리
   * 풀어 본 사람도 어느 셋이 나올지 모르고, 두 판을 칠 때도 서로 다른 문제를
   * 만난다. 여섯 개면 셋을 뽑는 조합이 20가지, 순서까지 하면 120가지다.
   */
  lockPool: Lock[];
  /** 마지막 문 후보. 매 판 하나를 뽑는다. */
  finalPool: Lock[];
  /** 탈출했을 때 읽는 한 문장 */
  outro: string;
};

/** 한 판에 실제로 쓰이는 자물쇠 넷 */
export type DrawnLocks = { locks: [Lock, Lock, Lock]; final: Lock };

/** 힌트 한 번에 깎이는 시간(초) */
export const HINT_PENALTY_SEC = 30;
/** 틀렸을 때 깎이는 시간(초). 탈락시키지는 않는다 — 찍기만 막으면 된다. */
export const WRONG_PENALTY_SEC = 10;

/** 탈출 점수 = 남은 시간(초). 시간이 곧 점수라 1:1 대결에서 동점이 거의 없다.
 * 시간을 다 쓰면 0점이고 기록은 남는다(탈출 실패). */
export function escapeScore(secondsLeft: number): number {
  return Math.max(0, Math.round(secondsLeft));
}
