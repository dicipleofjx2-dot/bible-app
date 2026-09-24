import type { DailyPlan } from './plan.ts';
import { chooseKind, makeQuestion, type Question } from './questions.ts';
import type { Cards, FailReason, Grade, QKind, Word } from './types.ts';

/**
 * 하루 세션의 흐름(§3). 순수 상태 기계다 — 화면은 `current()` 를 그리고
 * 사용자의 응답을 `onProbe`/`onTaught`/`onAnswer` 로 넘기기만 한다.
 *
 *   warm    기억 깨우기   — 오늘 복습 예정 카드를 먼저 떠올린다
 *   learn   새 단어 익히기 — 「알아요?」 → 알면 회상 문제로 확인, 모르면 카드
 *   recall  집중 회상     — 방금 익힌 단어를 뜻 고르기 없이 직접 떠올린다
 *   relearn 약점 재학습   — 오늘 틀린 카드만 다시 보고, **다른 방향**으로 재시험
 *   apply   활용·마무리   — 예문 빈칸
 *
 * 상태는 JSON 으로 저장할 수 있는 값만 담는다. 아이가 중간에 쉬었다가 이어서
 * 하도록(§3 맺음말) 화면이 그대로 저장해 둔다.
 */

export type Phase = 'warm' | 'learn' | 'recall' | 'relearn' | 'apply' | 'done';
export type Purpose = 'review' | 'check' | 'recall' | 'retry' | 'apply';

export type Step =
  | { t: 'probe'; id: string }
  | { t: 'teach'; id: string; again: boolean }
  | { t: 'ask'; id: string; purpose: Purpose; q: Question };

export interface LogItem {
  id: string;
  kind: QKind;
  purpose: Purpose;
  ok: boolean;
  reason?: FailReason;
}

export interface SessionState {
  day: string;
  grade: Grade;
  weekend: boolean;
  phase: Phase;
  queue: Step[];
  reviewIds: string[];
  newIds: string[];
  /** 처음부터 안다고 확인된 새 단어 — 설명과 집중 회상을 건너뛴다. */
  known: string[];
  /** 오늘 틀린 횟수. */
  failed: Record<string, number>;
  /** 재학습 재시험 횟수(무한히 돌지 않게). */
  retries: Record<string, number>;
  /** 이 카드를 마지막으로 어느 방향으로 물었나 — 재시험은 다른 방향으로. */
  lastKind: Record<string, QKind>;
  log: LogItem[];
  stepsDone: number;
  seed: number;
}

export const PHASE_LABEL: Record<Phase, string> = {
  warm: '기억 깨우기',
  learn: '새 단어 익히기',
  recall: '집중 회상',
  relearn: '약점 재학습',
  apply: '활용·마무리',
  done: '끝',
};

const MAX_RETRY = 2;
const APPLY_MAX = 5;

type Ctx = { words: Record<string, Word>; pool: Word[]; cards: Cards };

function rng(s: SessionState): () => number {
  // 상태에 시드를 담아 두고 한 번 쓸 때마다 밀어 둔다 — 이어 하기에서도 같은 흐름.
  return () => {
    s.seed = (s.seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return s.seed / 2_147_483_648;
  };
}

function ask(s: SessionState, ctx: Ctx, id: string, purpose: Purpose, exclude: QKind[] = []): Step {
  const w = ctx.words[id];
  const last = s.lastKind[id] ?? ctx.cards[id]?.lastKind;
  const r = rng(s);
  const kind = purpose === 'apply' ? 'cloze' : chooseKind(s.grade, last, w, r, exclude);
  s.lastKind[id] = kind;
  return { t: 'ask', id, purpose, q: makeQuestion(w, kind, s.grade, ctx.pool, r) };
}

function shuffleIds(s: SessionState, ids: string[]): string[] {
  const r = rng(s);
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function build(s: SessionState, ctx: Ctx, phase: Phase): Step[] {
  switch (phase) {
    case 'warm':
      return s.reviewIds.map((id) => ask(s, ctx, id, 'review'));
    case 'learn':
      return s.newIds.map((id) => ({ t: 'probe', id }));
    case 'recall':
      // 뜻 고르기가 아니라 직접 떠올리기(§3). 섞어서 바로 앞에 본 순서를 못 따라가게.
      return shuffleIds(s, s.newIds.filter((id) => !s.known.includes(id))).map((id) => ask(s, ctx, id, 'recall', ['en2ko']));
    case 'relearn': {
      const ids = Object.keys(s.failed);
      // 설명을 먼저 몰아 보고, 재시험은 섞어서 — 방금 본 카드를 바로 묻지 않는다.
      return [
        ...ids.map((id): Step => ({ t: 'teach', id, again: true })),
        ...shuffleIds(s, ids).map((id) => ask(s, ctx, id, 'retry', s.lastKind[id] ? [s.lastKind[id]] : [])),
      ];
    }
    case 'apply': {
      const today = [...Object.keys(s.failed), ...s.newIds, ...s.reviewIds];
      const ids = [...new Set(today)].filter((id) => ctx.words[id]?.example.includes('[')).slice(0, APPLY_MAX);
      return ids.map((id) => ask(s, ctx, id, 'apply'));
    }
    case 'done':
      return [];
  }
}

const ORDER: Phase[] = ['warm', 'learn', 'recall', 'relearn', 'apply', 'done'];

/** 큐가 비면 다음 단계로. 빈 단계는 건너뛴다. */
function settle(s: SessionState, ctx: Ctx): SessionState {
  while (s.queue.length === 0 && s.phase !== 'done') {
    s.phase = ORDER[ORDER.indexOf(s.phase) + 1];
    s.queue = build(s, ctx, s.phase);
  }
  return s;
}

function clone(s: SessionState): SessionState {
  return JSON.parse(JSON.stringify(s)) as SessionState;
}

export function makeCtx(words: Word[], cards: Cards): Ctx {
  return { words: Object.fromEntries(words.map((w) => [w.id, w])), pool: words, cards };
}

export function startSession(plan: DailyPlan, grade: Grade, ctx: Ctx, seed = Date.now() % 2_147_483_648): SessionState {
  const s: SessionState = {
    day: plan.day,
    grade,
    weekend: plan.weekend,
    phase: 'warm',
    queue: [],
    reviewIds: plan.reviewIds.filter((id) => ctx.words[id]),
    newIds: plan.newIds.filter((id) => ctx.words[id]),
    known: [],
    failed: {},
    retries: {},
    lastKind: {},
    log: [],
    stepsDone: 0,
    seed: seed || 1,
  };
  s.queue = build(s, ctx, 'warm');
  return settle(s, ctx);
}

export function current(s: SessionState): Step | undefined {
  return s.queue[0];
}

/** 새 단어 「알아요?」 응답. 안다고 하면 **설명보다 먼저** 회상 문제로 확인한다(§4.1). */
export function onProbe(prev: SessionState, ctx: Ctx, knows: boolean): SessionState {
  const s = clone(prev);
  const step = s.queue.shift();
  if (step?.t !== 'probe') return prev;
  s.stepsDone++;
  s.queue.unshift(knows ? ask(s, ctx, step.id, 'check', ['cloze']) : { t: 'teach', id: step.id, again: false });
  return settle(s, ctx);
}

export function onTaught(prev: SessionState, ctx: Ctx): SessionState {
  const s = clone(prev);
  if (s.queue[0]?.t !== 'teach') return prev;
  s.queue.shift();
  s.stepsDone++;
  return settle(s, ctx);
}

export function onAnswer(prev: SessionState, ctx: Ctx, ok: boolean, reason?: FailReason): SessionState {
  const s = clone(prev);
  const step = s.queue.shift();
  if (step?.t !== 'ask') return prev;
  s.stepsDone++;
  const { id, purpose, q } = step;
  s.log.push({ id, kind: q.kind, purpose, ok, reason });

  if (purpose === 'check') {
    if (ok) s.known.push(id);
    else {
      // 안다고 했는데 틀렸다 — 그 자리에서 설명을 보고, 집중 회상에서 다시 만난다.
      s.failed[id] = (s.failed[id] ?? 0) + 1;
      s.queue.unshift({ t: 'teach', id, again: false });
    }
    return settle(s, ctx);
  }

  if (!ok) {
    s.failed[id] = (s.failed[id] ?? 0) + 1;
    if (purpose === 'retry') {
      s.retries[id] = (s.retries[id] ?? 0) + 1;
      // 몇 장 뒤에 다시 — 이미 두 번 돌았으면 오늘은 놓아 주고 내일 본다.
      if (s.retries[id] < MAX_RETRY) {
        const at = Math.min(s.queue.length, 3);
        s.queue.splice(at, 0, { t: 'teach', id, again: true }, ask(s, ctx, id, 'retry', [q.kind]));
      }
    }
  }
  return settle(s, ctx);
}

export interface Summary {
  total: number;
  correct: number;
  /** 오늘의 약점 — 틀린 카드와 까닭. */
  weak: { id: string; reasons: FailReason[] }[];
  learned: number;
  reviewed: number;
}

export function summarize(s: SessionState): Summary {
  const weak = Object.keys(s.failed).map((id) => ({
    id,
    reasons: [...new Set(s.log.filter((l) => l.id === id && !l.ok && l.reason).map((l) => l.reason as FailReason))],
  }));
  const graded = s.log.filter((l) => l.purpose !== 'apply');
  return {
    total: graded.length,
    correct: graded.filter((l) => l.ok).length,
    weak,
    learned: s.newIds.length,
    reviewed: s.reviewIds.length,
  };
}
