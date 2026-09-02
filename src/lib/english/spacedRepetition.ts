import { REVIEW_SCHEDULE } from './curriculum';
import type { ReviewItem, ReviewStage } from './types';

/**
 * 간격 반복 (기획서 §6.4).
 *
 * 규칙은 두 줄이다.
 *  - 성공하면 한 단계 올린다 → 다음 간격이 길어진다.
 *  - 실패하면 **0단계로 되돌린다** → 오늘 다시 푼다.
 *
 * 실패했을 때 한 단계만 내리지 않고 처음으로 보내는 이유: 7일 후 문제를
 * 틀렸다는 것은 3일 후 확인이 이미 헛돌았다는 뜻이다. 한 칸씩 물러나면
 * 같은 자리를 오래 맴돈다(§6.4 「쉬운 설명과 보완 문제로 되돌린다」).
 */

const DAY = 24 * 60 * 60 * 1000;

export const MAX_STAGE: ReviewStage = 5;

/** 그날 안에 다시 풀게 하려면 몇 시간 뒤로 잡을 것인가. 0단계는 30분 뒤. */
const SAME_DAY_DELAY = 30 * 60 * 1000;

export function dueAtFor(stage: ReviewStage, from = Date.now()): number {
  const days = REVIEW_SCHEDULE[stage].afterDays;
  return days === 0 ? from + SAME_DAY_DELAY : from + days * DAY;
}

export function nextStage(stage: ReviewStage, success: boolean): ReviewStage {
  if (!success) return 0;
  return Math.min(MAX_STAGE, stage + 1) as ReviewStage;
}

/** 한 번 복습한 결과를 반영한 새 항목. 원본은 건드리지 않는다. */
export function applyReview(item: ReviewItem, success: boolean, now = Date.now()): ReviewItem {
  const stage = nextStage(item.stage, success);
  const successCount = item.successCount + (success ? 1 : 0);
  const failCount = item.failCount + (success ? 0 : 1);

  // 완전정복은 마지막 단계(30일)를 성공으로 통과했을 때만 매긴다(§6.5).
  const mastered = success && item.stage === MAX_STAGE;

  return {
    ...item,
    stage,
    successCount,
    failCount,
    dueAt: mastered ? Number.MAX_SAFE_INTEGER : dueAtFor(stage, now),
    masteredAt: mastered ? now : null,
    updatedAt: now,
  };
}

export function isDue(item: ReviewItem, now = Date.now()): boolean {
  return item.masteredAt === null && item.dueAt <= now;
}

/** 오늘 복습할 것들. 늦게 밀린 것부터 앞에 온다. */
export function dueItems(items: ReviewItem[], now = Date.now()): ReviewItem[] {
  return items.filter((i) => isDue(i, now)).sort((a, b) => a.dueAt - b.dueAt);
}

/** 「3일 후」처럼 사람이 읽을 수 있는 남은 시간. */
export function dueLabel(item: ReviewItem, now = Date.now()): string {
  if (item.masteredAt !== null) return '완전정복';
  const diff = item.dueAt - now;
  if (diff <= 0) return '지금';
  const days = Math.round(diff / DAY);
  if (days >= 1) return `${days}일 후`;
  const hours = Math.round(diff / (60 * 60 * 1000));
  if (hours >= 1) return `${hours}시간 후`;
  return `${Math.max(1, Math.round(diff / 60000))}분 후`;
}

/** 이번 복습이 무엇을 요구하는가 — 원문제 재풀이인지 변형 문제인지(§6.4). */
export type ReviewMode = 'original' | 'vocabCheck' | 'variant' | 'freshSameType' | 'mixed' | 'final';

export function reviewModeFor(stage: ReviewStage): ReviewMode {
  switch (stage) {
    case 0:
      return 'original';
    case 1:
      return 'vocabCheck';
    case 2:
      return 'variant';
    case 3:
      return 'freshSameType';
    case 4:
      return 'mixed';
    case 5:
      return 'final';
  }
}

export function newReviewItem(
  questionId: string,
  reason: ReviewItem['reason'],
  now = Date.now(),
): ReviewItem {
  return {
    questionId,
    stage: 0,
    dueAt: dueAtFor(0, now),
    successCount: 0,
    failCount: 0,
    masteredAt: null,
    starred: reason === 'starred',
    note: null,
    reason,
    createdAt: now,
    updatedAt: now,
  };
}
