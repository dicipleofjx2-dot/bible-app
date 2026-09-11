import type { QuizQuestion } from './quizTypes';

/**
 * 채점.
 *
 * ⚠️ 왜 따로 떼어 놓는가 — 채점이 **두 군데**에 있었다. 퀴즈 화면은 문제를
 * 넘길 때마다 맞은 개수를 세어 두었고(`correctCount`), 정답 화면은 저장해 둔
 * 답을 문항 번호에 맞춰 다시 채점했다. 같은 일을 두 가지 방법으로 하면
 * 반드시 어긋난다 — 실제로 만점이 105점으로 나왔다(맞은 개수 21 ÷ 문항 20).
 *
 * 이제 두 화면이 이 함수 하나를 쓴다. 세어 둔 값이 아니라 **남긴 답**을 채점
 * 하므로, 같은 문제를 두 번 세는 일이 생기지 않는다.
 */

export function normalizeAnswer(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

/** 답을 안 냈으면 틀린 것으로 본다. 빈 자리는 JSON 을 거치면 undefined 가
 * null 로 바뀌므로 둘 다 본다 — null 을 그냥 두면 Number(null)=0 이라 1번을
 * 고른 것으로 채점된다. */
export function isAnswerCorrect(q: QuizQuestion, userAnswer: number | string | null | undefined): boolean {
  if (userAnswer == null || userAnswer === '') return false;
  if (q.type === 'choice') return Number(userAnswer) === q.correctIndex;
  return q.acceptedAnswers.some((a) => normalizeAnswer(a) === normalizeAnswer(String(userAnswer)));
}

/** 맞은 문항 수. 답은 **문항 번호 자리**에 들어 있어야 한다(밀리면 안 된다). */
export function countCorrect(
  questions: QuizQuestion[],
  answers: (number | string | null | undefined)[]
): number {
  return questions.reduce((n, q, i) => n + (isAnswerCorrect(q, answers[i]) ? 1 : 0), 0);
}

/**
 * 100점 만점 점수.
 *
 * 맞은 수가 문항 수를 넘을 수 없으므로 100점을 넘지 않는다 — 이 함수를 거치는
 * 한 「105점 만점」은 다시 나올 수 없다.
 */
export function scoreOf(questions: QuizQuestion[], answers: (number | string | null | undefined)[]): number {
  if (questions.length === 0) return 0;
  return Math.round((countCorrect(questions, answers) / questions.length) * 100);
}
