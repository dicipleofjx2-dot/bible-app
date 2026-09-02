import { TYPE_ORDER } from './curriculum';
import { GIST_QUESTIONS } from './bank-gist';
import { LEXIS_QUESTIONS } from './bank-lexis';
import { PRACTICAL_QUESTIONS } from './bank-practical';
import { STRUCTURE_QUESTIONS } from './bank-structure';
import type { Difficulty, Question, QuestionTypeId } from './types';

/**
 * 문제은행.
 *
 * 지금은 앱에 함께 실리는 정적 배열이다. 나중에 서버 문제은행으로 옮겨도
 * 화면은 이 파일의 함수만 부르면 되도록 조회 경로를 여기로 모았다.
 */

export const QUESTIONS: Question[] = [
  ...PRACTICAL_QUESTIONS,
  ...GIST_QUESTIONS,
  ...LEXIS_QUESTIONS,
  ...STRUCTURE_QUESTIONS,
];

const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

export function getQuestion(id: string): Question | undefined {
  return BY_ID.get(id);
}

export function questionsOfType(type: QuestionTypeId): Question[] {
  return QUESTIONS.filter((q) => q.type === type).sort((a, b) => a.difficulty - b.difficulty);
}

export function countByType(): Record<QuestionTypeId, number> {
  const out = {} as Record<QuestionTypeId, number>;
  for (const type of TYPE_ORDER) out[type] = 0;
  for (const q of QUESTIONS) out[q.type] += 1;
  return out;
}

export type BankFilter = {
  types?: QuestionTypeId[];
  minDifficulty?: Difficulty;
  maxDifficulty?: Difficulty;
  /** 아직 한 번도 안 푼 것만. 화면이 푼 문항 id를 넘긴다. */
  excludeIds?: Set<string>;
};

export function filterQuestions(filter: BankFilter): Question[] {
  return QUESTIONS.filter((q) => {
    if (filter.types && filter.types.length > 0 && !filter.types.includes(q.type)) return false;
    if (filter.minDifficulty && q.difficulty < filter.minDifficulty) return false;
    if (filter.maxDifficulty && q.difficulty > filter.maxDifficulty) return false;
    if (filter.excludeIds?.has(q.id)) return false;
    return true;
  });
}

/**
 * 진단평가 세트.
 *
 * 기획서 §5.1은 「균형 있게 측정」을 요구한다. 무작위로 뽑으면 어떤 회차는
 * 추론만 다섯 문항이 나와 레이더가 뒤틀리므로, **유형마다 한 문항씩** 돌아가며
 * 뽑는다. `setIndex`가 다르면 같은 유형에서 다른 문항이 나온다(2세트 확보).
 */
export function buildDiagnosticSet(setIndex = 0): Question[] {
  const picked: Question[] = [];
  for (const type of TYPE_ORDER) {
    const pool = questionsOfType(type);
    if (pool.length === 0) continue;
    picked.push(pool[setIndex % pool.length]);
  }
  return picked;
}

/** 진단평가가 몇 세트까지 서로 다른 문항으로 구성되는가. */
export const DIAGNOSTIC_SET_COUNT = Math.min(
  ...TYPE_ORDER.map((t) => questionsOfType(t).length).filter((n) => n > 0),
);

/** 같은 개념의 변형 문제 (기획서 §6.4의 3일 후 복습). 없으면 같은 유형의 다른 문항. */
export function variantFor(questionId: string): Question | undefined {
  const q = getQuestion(questionId);
  if (!q) return undefined;
  const direct = QUESTIONS.find((other) => other.id !== q.id && (other.variantOf === q.id || other.id === q.variantOf));
  if (direct) return direct;
  return QUESTIONS.find((other) => other.id !== q.id && other.type === q.type);
}

/** 같은 유형의 새로운 문제 (7일 후 복습). 이미 푼 것은 피한다. */
export function freshOfType(type: QuestionTypeId, seenIds: Set<string>): Question | undefined {
  const pool = questionsOfType(type);
  return pool.find((q) => !seenIds.has(q.id)) ?? pool[0];
}

/**
 * 문항 자체 검사.
 *
 * 콘텐츠가 늘어나면 사람이 눈으로 못 잡는다. 정답 유일성·근거 범위·선택지
 * 개수처럼 기계가 잡을 수 있는 것은 여기서 잡는다(기획서 §13의 검수 항목).
 * 개발 중에는 개발자 화면에서, 나중에는 콘텐츠 관리자에서 부른다.
 */
export function validateBank(questions: Question[] = QUESTIONS): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const q of questions) {
    if (seen.has(q.id)) problems.push(`${q.id}: 중복된 id`);
    seen.add(q.id);

    if (q.choices.length !== 5) problems.push(`${q.id}: 선택지가 ${q.choices.length}개 (5개여야 함)`);

    const ids = q.choices.map((c) => c.id);
    if (new Set(ids).size !== ids.length) problems.push(`${q.id}: 선택지 번호가 겹침`);
    if (!ids.includes(q.answer)) problems.push(`${q.id}: 정답 ${q.answer}번이 선택지에 없음`);

    const wrongWithoutReason = q.choices.filter((c) => c.id !== q.answer && !c.whyWrong);
    if (wrongWithoutReason.length > 0) {
      problems.push(`${q.id}: 오답 이유 없는 선택지 ${wrongWithoutReason.map((c) => c.id).join(',')}`);
    }

    const answerChoice = q.choices.find((c) => c.id === q.answer);
    if (answerChoice?.whyWrong) problems.push(`${q.id}: 정답 선택지에 오답 이유가 붙어 있음`);

    if (q.evidenceIndex < 0 || q.evidenceIndex >= q.passage.length) {
      problems.push(`${q.id}: 근거 문장 인덱스 ${q.evidenceIndex}가 지문 범위를 벗어남`);
    }
    if (q.passage.length === 0) problems.push(`${q.id}: 지문이 비어 있음`);
    if (!q.explanation.trim()) problems.push(`${q.id}: 해설이 비어 있음`);
    if (q.keyVocab.length === 0) problems.push(`${q.id}: 핵심 어휘가 없음`);
    if (q.keySyntax.length === 0) problems.push(`${q.id}: 핵심 구문이 없음`);
    if (q.variantOf && !questions.some((other) => other.id === q.variantOf)) {
      problems.push(`${q.id}: variantOf가 가리키는 ${q.variantOf}가 없음`);
    }
    if (q.source.status === 'link-only' && !q.source.url) {
      problems.push(`${q.id}: 링크만 제공하는 문항인데 원문 주소가 없음`);
    }
  }

  for (const type of TYPE_ORDER) {
    if (!questions.some((q) => q.type === type)) problems.push(`유형 ${type}: 문항이 하나도 없음`);
  }

  return problems;
}

/**
 * 실전 미니 모의고사 세트 (기획서 §18 「실전 미니 모의고사 5세트」).
 *
 * 무작위로 자르면 한 세트가 추론 다섯 문항이 되기도 한다. 유형 순서대로
 * 한 문항씩 돌아가며 뽑아 세트마다 영역이 고르게 섞이도록 했다.
 */
export function buildMockSets(setSize = 6): Question[][] {
  const queues = TYPE_ORDER.map((type) => [...questionsOfType(type)]);
  const flat: Question[] = [];
  let remaining = QUESTIONS.length;
  while (remaining > 0) {
    let movedAny = false;
    for (const queue of queues) {
      const next = queue.shift();
      if (next) {
        flat.push(next);
        remaining -= 1;
        movedAny = true;
      }
    }
    if (!movedAny) break;
  }

  const sets: Question[][] = [];
  for (let i = 0; i < flat.length; i += setSize) {
    const chunk = flat.slice(i, i + setSize);
    if (chunk.length === setSize) sets.push(chunk);
  }
  return sets;
}
