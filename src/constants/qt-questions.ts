import type { QtAnswers } from '@/db/userData';

export const EMPTY_QT_ANSWERS: QtAnswers = { observation: ['', ''], interpretation: ['', ''], application: ['', ''] };

// 어떤 본문에도 통하는 범용 질문 — 날짜별 커스텀은 나중에.
export const QUESTION_GROUPS: { key: keyof QtAnswers; title: string; questions: string[] }[] = [
  {
    key: 'observation',
    title: '🔍 관찰질문',
    questions: ['이 본문에서 누가, 무엇을, 어떻게 했습니까?', '반복되는 단어나 눈에 띄는 표현이 있습니까?'],
  },
  {
    key: 'interpretation',
    title: '💡 해석질문',
    questions: [
      '이 본문을 통해 하나님은 어떤 분이심을 보여주십니까?',
      '이 말씀이 원래 독자들에게 어떤 의미였을까요?',
    ],
  },
  {
    key: 'application',
    title: '🌱 적용질문',
    questions: ['이 말씀이 오늘 나의 삶과 어떻게 연결됩니까?', '순종하기 위해 오늘 할 수 있는 구체적인 한 가지는 무엇입니까?'],
  },
];

export function parseQtAnswers(raw: string | null | undefined): QtAnswers {
  if (!raw) return { ...EMPTY_QT_ANSWERS };
  try {
    const parsed = JSON.parse(raw);
    return {
      observation: parsed.observation ?? ['', ''],
      interpretation: parsed.interpretation ?? ['', ''],
      application: parsed.application ?? ['', ''],
    };
  } catch {
    return { ...EMPTY_QT_ANSWERS };
  }
}
