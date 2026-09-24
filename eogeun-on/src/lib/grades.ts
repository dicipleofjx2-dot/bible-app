import type { AnswerMode, Grade, QKind } from './types.ts';

/**
 * 학년별 운영값(§2). 새 단어 수는 **범위**이지 목표가 아니다 — 복습이 많으면
 * `plan.ts` 가 줄인다.
 *
 * `modes` 는 문항 방향마다 직접 입력인지 보기 고르기인지다. 중학생은 직접
 * 회상·철자 비중을 높이고(§4.2), 초3~4 는 보기로 받는다 — 철자를 막 익히는
 * 나이에 입력을 강요하면 뜻을 알아도 틀린다.
 */
export interface GradeInfo {
  label: string;
  newMin: number;
  newMax: number;
  /** 1차 출시 콘텐츠가 있는가(§8). */
  ready: boolean;
  modes: Record<QKind, AnswerMode>;
  /** 문항 방향을 고를 때의 비중. */
  weights: Record<QKind, number>;
}

const choiceAll: Record<QKind, AnswerMode> = { en2ko: 'choice', ko2en: 'choice', listen: 'choice', cloze: 'choice' };

export const GRADES: Record<Grade, GradeInfo> = {
  k: { label: '유치부', newMin: 2, newMax: 4, ready: false, modes: choiceAll, weights: { en2ko: 1, ko2en: 0, listen: 3, cloze: 0 } },
  e12: { label: '초1~2', newMin: 3, newMax: 5, ready: false, modes: choiceAll, weights: { en2ko: 2, ko2en: 1, listen: 3, cloze: 0 } },
  e34: {
    label: '초3~4',
    newMin: 5,
    newMax: 7,
    ready: true,
    modes: choiceAll,
    weights: { en2ko: 3, ko2en: 2, listen: 3, cloze: 1 },
  },
  e56: {
    label: '초5~6',
    newMin: 6,
    newMax: 9,
    ready: true,
    modes: { en2ko: 'choice', ko2en: 'type', listen: 'choice', cloze: 'choice' },
    weights: { en2ko: 3, ko2en: 3, listen: 2, cloze: 2 },
  },
  m13: {
    label: '중1~3',
    newMin: 8,
    newMax: 12,
    ready: true,
    modes: { en2ko: 'choice', ko2en: 'type', listen: 'type', cloze: 'type' },
    weights: { en2ko: 2, ko2en: 4, listen: 2, cloze: 3 },
  },
  h13: { label: '고1~3', newMin: 8, newMax: 15, ready: false, modes: { en2ko: 'choice', ko2en: 'type', listen: 'type', cloze: 'type' }, weights: { en2ko: 2, ko2en: 4, listen: 1, cloze: 4 } },
};

export const GRADE_ORDER: Grade[] = ['k', 'e12', 'e34', 'e56', 'm13', 'h13'];
