import { TYPE_META, TYPE_ORDER } from './curriculum';
import { getQuestion } from './questionBank';
import type {
  Attempt,
  Confidence,
  DiagnosticResult,
  Domain,
  ErrorCauseId,
  Mastery,
  NewAttempt,
  Question,
  QuestionTypeId,
  ReviewReason,
} from './types';

/**
 * 진단 엔진 — 기록에서 「무엇을 모르는가」를 뽑아낸다.
 *
 * 여기 있는 함수는 전부 순수 함수다. 저장소도 화면도 모르고, 넣은 값만 보고
 * 답한다. 규칙을 눈으로 검산할 수 있어야 교사가 AI 추정을 고칠 수 있다
 * (기획서 §8.2 「추천 이유를 표시하고 교사가 수정할 수 있게 한다」).
 */

/** 권장시간을 이만큼 넘기면 「느리다」로 본다. */
export const SLOW_RATIO = 1.5;

/**
 * 오답 원인 추정 (기획서 §6.2).
 *
 * 1순위는 **학생이 실제로 고른 선택지**다. 문항마다 선택지별 오답 이유와
 * 그것이 어떤 결손인지를 적어 두었으므로, 추측하지 않고 그대로 읽으면 된다.
 * 선택지에 표시가 없을 때만 신호(시간·확신도·근거 표시)로 뒤로 물러선다.
 */
export function inferCause(question: Question, attempt: NewAttempt): ErrorCauseId | null {
  if (attempt.correct) {
    // 맞혔어도 권장시간을 크게 넘겼으면 속도가 원인이다(§8.2).
    return attempt.seconds > question.expectedSeconds * SLOW_RATIO ? 'time' : null;
  }

  const chosen = question.choices.find((c) => c.id === attempt.chosen);
  if (chosen?.cause) return chosen.cause;

  // 근거 문장을 엉뚱한 데 짚었으면 글의 논리를 놓친 것이다.
  if (attempt.evidenceIndex !== null && attempt.evidenceIndex !== question.evidenceIndex) return 'logic';

  // 확신했는데 틀렸다면 아는 줄 알았던 것 — 유형 전략의 문제로 본다.
  if (attempt.confidence === 'sure') return 'strategy';

  // 시간에 쫓겨 찍었다.
  if (attempt.confidence === 'guess' && attempt.seconds < question.expectedSeconds * 0.5) return 'time';

  return 'strategy';
}

/** 복습노트 자동 저장 사유 (기획서 §6.1). null이면 담지 않는다. */
export function reviewReasonFor(question: Question, attempt: NewAttempt): ReviewReason | null {
  if (!attempt.correct) return 'wrong';
  if (attempt.confidence === 'guess') return 'luckyGuess';
  if (attempt.seconds > question.expectedSeconds * SLOW_RATIO) return 'slow';
  if (attempt.changes >= 2) return 'flipflop';
  return null;
}

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  sure: '확실함',
  unsure: '헷갈림',
  guess: '찍음',
};

/**
 * 유형별 숙련도.
 *
 * 최근 기록에 무게를 준다. 3개월 전 오답이 지금의 취약점으로 남아 있으면
 * 이미 고친 것을 계속 다시 시키게 된다(§8.2 「과도한 반복을 피한다」).
 * 가장 최근 시도의 가중치가 1, 하나 거슬러 갈수록 0.85배씩 준다.
 */
export function masteryOf(type: QuestionTypeId, attempts: Attempt[]): Mastery {
  const mine = attempts.filter((a) => a.type === type).sort((a, b) => b.createdAt - a.createdAt);
  if (mine.length === 0) {
    return { type, attempts: 0, correct: 0, accuracy: 0, paceRatio: 1, score: 0 };
  }

  let weight = 1;
  let weighted = 0;
  let weightSum = 0;
  let paceSum = 0;
  let correct = 0;

  for (const a of mine) {
    weighted += (a.correct ? 1 : 0) * weight;
    weightSum += weight;
    weight *= 0.85;
    if (a.correct) correct += 1;
    const expected = getQuestion(a.questionId)?.expectedSeconds ?? 90;
    paceSum += a.seconds / expected;
  }

  const accuracy = weighted / weightSum;
  const paceRatio = paceSum / mine.length;

  // 속도는 감점으로만 반영한다. 빨리 찍어 맞힌 것을 숙련으로 세면 안 된다.
  const pacePenalty = Math.max(0, Math.min(20, (paceRatio - 1) * 20));
  const score = Math.round(Math.max(0, accuracy * 100 - pacePenalty));

  return { type, attempts: mine.length, correct, accuracy, paceRatio, score };
}

export function allMastery(attempts: Attempt[]): Mastery[] {
  return TYPE_ORDER.map((type) => masteryOf(type, attempts));
}

export function domainScores(mastery: Mastery[]): Record<Domain, number> {
  const buckets: Record<Domain, number[]> = {
    practical: [],
    gist: [],
    lexicogrammar: [],
    inference: [],
    structure: [],
    integration: [],
  };
  for (const m of mastery) {
    if (m.attempts === 0) continue;
    buckets[TYPE_META[m.type].domain].push(m.score);
  }
  const out = {} as Record<Domain, number>;
  for (const key of Object.keys(buckets) as Domain[]) {
    const list = buckets[key];
    out[key] = list.length === 0 ? 0 : Math.round(list.reduce((s, n) => s + n, 0) / list.length);
  }
  return out;
}

export function causeCounts(attempts: Attempt[]): { cause: ErrorCauseId; count: number }[] {
  const counts = new Map<ErrorCauseId, number>();
  for (const a of attempts) {
    // 학생이 직접 고른 원인이 있으면 그것을 센다. 자기진단이 AI 추정을 이긴다.
    const cause = a.selfCause ?? a.aiCause;
    if (!cause) continue;
    counts.set(cause, (counts.get(cause) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([cause, count]) => ({ cause, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 예상 등급 구간.
 *
 * **단정하지 않는다**(기획서 §8.3). 표본이 적을수록 구간을 넓게 잡아,
 * 열 문항 풀고 「1등급」이라고 말하는 일이 없게 한다.
 */
export function gradeBand(correct: number, total: number): { low: number; high: number } {
  if (total === 0) return { low: 9, high: 1 };
  const rate = correct / total;
  // 원점수 비율 → 중심 등급. 수능 영어 절대평가(90/80/70…)를 기준으로 삼는다.
  const center = rate >= 0.9 ? 1 : rate >= 0.8 ? 2 : rate >= 0.7 ? 3 : rate >= 0.6 ? 4 : rate >= 0.5 ? 5 : rate >= 0.4 ? 6 : 7;
  // 표본이 적으면 ±1등급, 30문항 이상이면 ±0.5등급 폭.
  const spread = total >= 30 ? 0 : 1;
  return { low: Math.min(9, center + spread), high: Math.max(1, center - spread) };
}

/** 4주 학습 처방 (기획서 §5.1). 약한 유형과 원인 분포를 함께 본다. */
export function prescribe(mastery: Mastery[], causes: { cause: ErrorCauseId; count: number }[]): string[] {
  const attempted = mastery.filter((m) => m.attempts > 0);
  const weakest = [...attempted].sort((a, b) => a.score - b.score).slice(0, 3);
  const lines: string[] = [];

  weakest.forEach((m, i) => {
    lines.push(`${i + 1}주차 — ${TYPE_META[m.type].label}: ${TYPE_META[m.type].steps[0]}`);
  });

  const top = causes[0];
  if (top) {
    const CAUSE_WORK: Record<ErrorCauseId, string> = {
      vocab: '매일 문맥 단어카드 15개',
      syntax: '매일 끊어 읽기 문장 5개',
      logic: '연결어·문단 구조 훈련 하루 1지문',
      strategy: '유형학습실 1~2단계 복습 후 대표 기출 1문항',
      time: '제한시간 모드로 하루 3문항',
      careless: '발문 확인 체크 훈련 하루 5문항',
    };
    lines.push(`4주차 — 가장 잦은 원인(${top.cause})에 맞춘 반복: ${CAUSE_WORK[top.cause]}`);
  } else {
    lines.push('4주차 — 지금까지 푼 유형을 섞은 누적 테스트');
  }

  const untouched = mastery.filter((m) => m.attempts === 0);
  if (untouched.length > 0) {
    lines.push(`아직 안 풀어 본 유형 ${untouched.length}개가 남아 있다 — 진단이 그만큼 덜 정확하다.`);
  }

  return lines;
}

export function summarizeDiagnostic(attempts: Attempt[]): DiagnosticResult {
  const mastery = allMastery(attempts);
  const correct = attempts.filter((a) => a.correct).length;
  const causes = causeCounts(attempts);
  return {
    takenAt: Date.now(),
    total: attempts.length,
    correct,
    byDomain: domainScores(mastery),
    byType: mastery,
    gradeBand: gradeBand(correct, attempts.length),
    topCauses: causes.slice(0, 3),
    prescription: prescribe(mastery, causes),
  };
}

/**
 * 다음에 무엇을 풀 것인가 (기획서 §8.2).
 *
 * 추천에는 **반드시 이유를 붙인다**. 이유 없는 추천은 교사가 고칠 수 없고,
 * 학생도 왜 이걸 또 푸는지 모른 채 따라오게 된다.
 */
export type Recommendation = {
  type: QuestionTypeId;
  reason: string;
  /** 이 추천이 겨냥한 난이도. 너무 어려운 것을 밀어 넣지 않는다. */
  difficulty: 1 | 2 | 3 | 4 | 5;
};

export function recommend(mastery: Mastery[], limit = 3): Recommendation[] {
  const out: Recommendation[] = [];

  // 1) 정답률은 괜찮은데 느린 유형 — 속도 훈련이 먼저다.
  for (const m of mastery) {
    if (m.attempts >= 2 && m.accuracy >= 0.7 && m.paceRatio > SLOW_RATIO) {
      out.push({
        type: m.type,
        reason: `정답률은 ${Math.round(m.accuracy * 100)}%로 높지만 권장시간의 ${m.paceRatio.toFixed(1)}배가 걸린다 — 속도 훈련`,
        difficulty: 3,
      });
    }
  }

  // 2) 한 번도 안 푼 유형 — 진단의 빈칸을 먼저 메운다.
  for (const m of mastery) {
    if (m.attempts === 0) {
      out.push({ type: m.type, reason: '아직 한 번도 풀지 않은 유형이다', difficulty: 2 });
    }
  }

  // 3) 약한 유형 — 다만 정답률이 아주 낮으면 쉬운 것부터(§8.2).
  const weak = mastery
    .filter((m) => m.attempts > 0 && m.score < 70)
    .sort((a, b) => a.score - b.score);
  for (const m of weak) {
    const tooHard = m.accuracy < 0.3;
    out.push({
      type: m.type,
      reason: tooHard
        ? `정답률이 ${Math.round(m.accuracy * 100)}%로 낮다 — 쉬운 문항부터 다시 쌓는다`
        : `숙련도 ${m.score}점으로 아직 낮다`,
      difficulty: tooHard ? 1 : 3,
    });
  }

  // 4) 잘하는 유형의 반복은 뒤로 민다.
  const seen = new Set<QuestionTypeId>();
  return out.filter((r) => (seen.has(r.type) ? false : (seen.add(r.type), true))).slice(0, limit);
}
