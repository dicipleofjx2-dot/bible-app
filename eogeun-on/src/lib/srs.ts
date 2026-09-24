import { addDays, diffDays, nextSaturday } from './day.ts';
import type { Attempt, CardState, FailReason, QKind, Stage } from './types.ts';

/**
 * 복습 예약(§4.1·§4.2).
 *
 * 기본 사다리: 당일 후반(세션 안에서) → 다음 날 → 3일 뒤 → 주말 점검 → 10일 → 한 달 → 두 달.
 * **「최고의 간격」이라 주장하지 않는다**(§4.2, §10 맺음말) — 초기 운영값이고,
 * 파일럿 결과로 이 표 하나만 고치면 된다.
 *
 * 규칙
 * - 예약은 **그날의 첫 시도**만 보고 정한다. 틀린 뒤 같은 세션에서 다시 맞혀도
 *   다음 날 다시 본다(§4.1 「같은 날 맞혔더라도 이튿날 재확인」).
 * - 맞혔어도 힌트를 봤거나 오래 걸렸으면 **칸을 올리지 않는다**. 자기평가 단추는
 *   아예 없다 — 상태는 정오·힌트·시간·마지막 성공일로만 정한다.
 * - 틀리면 첫 칸(다음 날)으로 돌아가고 까닭을 적어 둔다.
 */

export type Interval = number | 'weekend';

export const LADDER: readonly Interval[] = [1, 3, 'weekend', 10, 30, 60];

/** 이 시간보다 오래 걸린 정답은 「간신히」로 친다. */
export const SLOW_MS: Record<'type' | 'choice', number> = { type: 20_000, choice: 10_000 };

export type Quality = 'again' | 'hard' | 'good';

export function quality(ok: boolean, hinted: boolean, slow: boolean): Quality {
  if (!ok) return 'again';
  return hinted || slow ? 'hard' : 'good';
}

function intervalDue(day: string, step: number): string {
  const iv = LADDER[Math.min(step, LADDER.length - 1)];
  return iv === 'weekend' ? nextSaturday(day) : addDays(day, iv);
}

export function stageOf(step: number, streak: number): Stage {
  if (step <= 1) return 'learning';
  if (step <= 3) return 'review';
  if (step === 4 || streak < 4) return 'stable';
  return 'long';
}

const HISTORY_CAP = 30;

/** 처음 만난 카드. 오늘 세션 안에서 배웠고, 내일 다시 본다. */
export function newCard(id: string, day: string): CardState {
  return {
    id,
    stage: 'learning',
    step: 0,
    due: addDays(day, 1),
    streak: 0,
    lapses: 0,
    firstSeen: day,
    history: [],
  };
}

/** 진단에서 이미 안다고 확인된 카드 — 가르치지 않고 사흘 뒤 한 번 확인한다. */
export function knownCard(id: string, day: string): CardState {
  return { ...newCard(id, day), stage: 'review', step: 2, due: addDays(day, 3), streak: 1, lastOk: day };
}

export interface Outcome {
  kind: QKind;
  ok: boolean;
  hinted: boolean;
  ms: number;
  slow: boolean;
  reason?: FailReason;
}

/**
 * 시도 하나를 카드에 반영한다. `first` 가 아니면 기록만 남기고 예약은 그대로 둔다.
 */
export function applyAttempt(card: CardState, day: string, o: Outcome, first: boolean): CardState {
  const attempt: Attempt = { day, kind: o.kind, ok: o.ok, hinted: o.hinted, ms: o.ms, first, reason: o.reason };
  const history = [...card.history, attempt].slice(-HISTORY_CAP);
  if (!first) return { ...card, history, lastKind: o.kind };

  const q = quality(o.ok, o.hinted, o.slow);
  let { step, streak, lapses } = card;
  let due: string;
  let lastFail = card.lastFail;
  let lastOk = card.lastOk;

  if (q === 'again') {
    step = 0;
    streak = 0;
    lapses += 1;
    lastFail = o.reason ?? 'meaning';
    due = addDays(day, 1);
  } else if (q === 'hard') {
    // 칸을 올리지 않는다. 지금 칸의 간격을 반으로 줄여 한 번 더 확인한다.
    due = addDays(day, Math.max(1, Math.floor(diffDays(intervalDue(day, step), day) / 2)));
    lastOk = day;
  } else {
    due = intervalDue(day, step);
    step = Math.min(step + 1, LADDER.length - 1);
    streak += 1;
    lastOk = day;
  }

  return { ...card, step, streak, lapses, due, lastFail, lastOk, lastKind: o.kind, history, stage: stageOf(step, streak) };
}

/** 그날 이미 첫 시도를 했는가 — 세션을 나갔다 들어와도 두 번째는 예약을 못 바꾼다. */
export function triedToday(card: CardState | undefined, day: string): boolean {
  return !!card?.history.some((a) => a.day === day && a.first);
}

export const STAGE_LABEL: Record<Stage, string> = {
  new: '처음 봄',
  learning: '배우는 중',
  review: '복습 예정',
  stable: '안정적으로 기억',
  long: '장기 확인',
};

export const REASON_LABEL: Record<FailReason, string> = {
  meaning: '뜻 혼동',
  spelling: '철자',
  sound: '발음·듣기',
  usage: '문장 사용',
};
