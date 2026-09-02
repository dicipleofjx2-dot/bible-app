import type { Domain, ErrorCauseId, QuestionTypeId, ReviewReason, ReviewStage } from './types';

/**
 * 유형 지도 — 유형마다 "무엇을 묻는가 / 어떤 순서로 푸는가 / 어디서 미끄러지는가".
 *
 * 유형학습실 6단계 중 1·2단계(출제 의도, 풀이 순서)가 전부 여기서 나온다
 * (기획서 §5.3). 화면에 문구를 흩뿌리지 않고 한곳에 모아 둔 이유는, 같은
 * 설명이 복습 카드·오답 해설·리포트에서 다시 쓰이기 때문이다.
 */

export type TypeMeta = {
  id: QuestionTypeId;
  label: string;
  domain: Domain;
  emoji: string;
  /** 출제 의도 — 이 유형이 재려는 능력. */
  intent: string;
  /** 대표 발문. */
  prompt: string;
  /** 풀이 순서. 번호 매겨 그대로 보여 준다. */
  steps: string[];
  /** 자주 걸리는 함정. */
  traps: string[];
};

export const DOMAIN_LABELS: Record<Domain, string> = {
  practical: '실용·사실',
  gist: '대의 파악',
  lexicogrammar: '어휘·어법',
  inference: '추론',
  structure: '글의 구조',
  integration: '요약·통합',
};

export const TYPE_META: Record<QuestionTypeId, TypeMeta> = {
  purpose: {
    id: 'purpose',
    label: '글의 목적',
    domain: 'practical',
    emoji: '✉️',
    intent: '편지·공지·안내문에서 글쓴이가 이 글을 왜 썼는지 한 가지로 집어낸다.',
    prompt: '다음 글의 목적으로 가장 적절한 것은?',
    steps: [
      '누가 누구에게 쓴 글인지 첫 문장에서 확인한다.',
      '배경 설명은 건너뛰고 요청·통보가 나오는 문장을 찾는다.',
      '조동사(would like to, please, we ask)가 붙은 문장이 대개 목적이다.',
      '선택지의 동사(요청·안내·사과·항의·감사)를 그 문장과 맞춘다.',
    ],
    traps: [
      '앞부분의 배경 설명을 목적으로 착각한다.',
      '고마움을 표하는 인사말이 있다고 「감사」를 고른다.',
    ],
  },
  mood: {
    id: 'mood',
    label: '심경·분위기',
    domain: 'practical',
    emoji: '🎭',
    intent: '이야기 속 인물의 감정이 어디서 어디로 옮겨 가는지 읽는다.',
    prompt: '다음 글에 드러난 “I”의 심경 변화로 가장 적절한 것은?',
    steps: [
      '앞부분과 뒷부분을 갈라 놓고 각각의 감정어를 모은다.',
      '몸의 반응(심장, 손, 숨)과 날씨·풍경 묘사도 감정 단서로 센다.',
      '전환점(but, then, suddenly, at last)을 찍는다.',
      '앞→뒤 두 감정이 모두 맞는 선택지만 남긴다.',
    ],
    traps: [
      '뒷부분 감정만 보고 고른다 — 변화형은 앞도 맞아야 한다.',
      '비슷해 보이는 감정어(불안 vs 지루함)를 뭉뚱그린다.',
    ],
  },
  detail: {
    id: 'detail',
    label: '내용 일치',
    domain: 'practical',
    emoji: '🔍',
    intent: '지문에 실제로 적힌 사실과 선택지를 하나씩 대조한다.',
    prompt: '다음 글의 내용과 일치하지 않는 것은?',
    steps: [
      '발문이 「일치」인지 「일치하지 않는」인지 먼저 표시한다.',
      '선택지를 하나 읽고 그 근거를 지문에서 찾아 밑줄을 긋는다.',
      '숫자·연도·부정어·비교급이 바뀌지 않았는지 본다.',
      '근거를 못 찾은 선택지는 「없는 말」이므로 남겨 둔다.',
    ],
    traps: [
      '발문의 not을 놓친다.',
      '지문에 안 나온 말인데 그럴듯해서 맞다고 넘긴다.',
    ],
  },
  claim: {
    id: 'claim',
    label: '필자의 주장',
    domain: 'gist',
    emoji: '📢',
    intent: '글쓴이가 독자에게 하라고 요구하는 행동을 집는다.',
    prompt: '다음 글에서 필자가 주장하는 바로 가장 적절한 것은?',
    steps: [
      '명령문과 should·must·need to가 붙은 문장을 표시한다.',
      '역접(however, rather, instead) 뒤를 중심으로 본다.',
      '마지막 두 문장을 다시 읽는다 — 주장은 대개 거기서 굳는다.',
      '선택지가 「사실 진술」이면 버리고 「행동 요구」만 남긴다.',
    ],
    traps: [
      '요지(사실 정리)와 주장(행동 요구)을 구분하지 않는다.',
      '예시에 나온 소재를 주제로 착각한다.',
    ],
  },
  mainIdea: {
    id: 'mainIdea',
    label: '글의 요지',
    domain: 'gist',
    emoji: '🧵',
    intent: '글 전체를 한 문장으로 눌러 담는다.',
    prompt: '다음 글의 요지로 가장 적절한 것은?',
    steps: [
      '반복되는 낱말과 그 짝을 표시한다.',
      '예시 문단은 통째로 괄호에 넣고 건너뛴다.',
      '일반화 문장(In short, Thus, This means)을 찾는다.',
      '선택지 중 지문의 범위를 넘지도 좁히지도 않은 것을 고른다.',
    ],
    traps: [
      '지문에 있는 낱말이 들어갔다는 이유로 고른다.',
      '한 문단에만 해당하는 말을 전체 요지로 고른다.',
    ],
  },
  topic: {
    id: 'topic',
    label: '글의 주제',
    domain: 'gist',
    emoji: '🎯',
    intent: '무엇에 대한 글인지를 명사구로 잡는다.',
    prompt: '다음 글의 주제로 가장 적절한 것은?',
    steps: [
      '핵심어 두 개(무엇 + 어떤 점)를 정한다.',
      '선택지를 「무엇」과 「어떤 점」으로 쪼개 둘 다 맞는지 본다.',
      '너무 넓은 것과 너무 좁은 것을 먼저 지운다.',
    ],
    traps: [
      '핵심어 하나만 맞는 선택지에 끌린다.',
      '지문이 부정한 통념을 주제로 고른다.',
    ],
  },
  title: {
    id: 'title',
    label: '글의 제목',
    domain: 'gist',
    emoji: '🏷️',
    intent: '요지를 함축하면서도 글 전체를 덮는 제목을 고른다.',
    prompt: '다음 글의 제목으로 가장 적절한 것은?',
    steps: [
      '먼저 요지를 자기 말로 한 문장 만든다.',
      '그 문장을 덮는 제목만 남긴다.',
      '비유적 제목은 그것이 가리키는 것이 지문에 있는지 확인한다.',
    ],
    traps: [
      '세부 내용을 제목으로 고른다 — 가장 흔한 실수다.',
      '자극적이지만 지문 범위를 벗어난 제목에 끌린다.',
    ],
  },
  vocab: {
    id: 'vocab',
    label: '문맥상 어휘',
    domain: 'lexicogrammar',
    emoji: '🔤',
    intent: '낱말의 사전 뜻이 아니라 그 자리에 맞는 뜻인지 판단한다.',
    prompt: '다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?',
    steps: [
      '글의 방향(긍정/부정, 늘어남/줄어듦)을 먼저 한 화살표로 잡는다.',
      '밑줄마다 그 자리에 들어갈 뜻을 스스로 채워 본다.',
      '내가 채운 것과 반대면 그것이 답이다.',
    ],
    traps: [
      '어려운 낱말을 답으로 고른다 — 난이도와 오답은 상관이 없다.',
      '문장 하나만 보고 판단한다.',
    ],
  },
  grammar: {
    id: 'grammar',
    label: '어법',
    domain: 'lexicogrammar',
    emoji: '⚙️',
    intent: '문장의 뼈대를 보고 형태가 맞는지 가린다.',
    prompt: '다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?',
    steps: [
      '밑줄이 동사면 주어를 찾아 수와 태를 맞춘다.',
      '밑줄이 관계사면 뒤 문장이 완전한지 본다.',
      '밑줄이 -ing/-ed면 꾸미는 대상이 하는지 당하는지 본다.',
      '병렬이면 and 앞뒤의 모양을 맞춘다.',
    ],
    traps: [
      '주어와 동사 사이의 수식어에 딸린 명사에 수를 맞춘다.',
      '해석이 되면 맞다고 넘어간다.',
    ],
  },
  implied: {
    id: 'implied',
    label: '함축 의미',
    domain: 'inference',
    emoji: '💭',
    intent: '비유로 쓰인 구절이 이 글에서 무엇을 가리키는지 되짚는다.',
    prompt: '밑줄 친 부분이 다음 글에서 의미하는 바로 가장 적절한 것은?',
    steps: [
      '밑줄을 일단 덮고 글의 요지를 한 문장 만든다.',
      '밑줄 앞뒤 문장에서 그것을 풀어 쓴 자리를 찾는다.',
      '요지와 어긋나는 선택지를 지운다.',
    ],
    traps: [
      '밑줄의 낱말을 사전 뜻 그대로 옮긴 선택지를 고른다.',
      '글 전체가 아니라 밑줄 근처만 보고 고른다.',
    ],
  },
  blank: {
    id: 'blank',
    label: '빈칸 추론',
    domain: 'inference',
    emoji: '🕳️',
    intent: '글의 논리를 따라가 비어 있는 자리를 되살린다.',
    prompt: '다음 빈칸에 들어갈 말로 가장 적절한 것은?',
    steps: [
      '빈칸이 든 문장이 주제문인지 예시인지 먼저 가린다.',
      '빈칸 앞뒤의 연결어로 관계(대조·인과·부연)를 정한다.',
      '지문 안에서 같은 말을 다르게 쓴 자리(재진술)를 찾는다.',
      '고른 뒤 빈칸에 넣어 읽고 뒷문장과 충돌하지 않는지 본다.',
    ],
    traps: [
      '지문의 낱말이 그대로 든 선택지를 고른다.',
      '맞는 말이지만 이 글이 하지 않은 말을 고른다.',
    ],
  },
  irrelevant: {
    id: 'irrelevant',
    label: '무관한 문장',
    domain: 'structure',
    emoji: '🚧',
    intent: '한 문단이 하나의 화제로 이어지는지 검사한다.',
    prompt: '다음 글에서 전체 흐름과 관계 없는 문장은?',
    steps: [
      '첫 문장에서 화제를 못박는다.',
      '문장마다 그 화제에 대해 무엇을 더했는지 한 마디로 적는다.',
      '같은 낱말을 쓰지만 화제가 옮겨 간 문장을 찾는다.',
      '그 문장을 빼고 읽어 앞뒤가 붙는지 확인한다.',
    ],
    traps: [
      '어려운 문장을 무관하다고 고른다.',
      '같은 낱말이 있으면 관계있다고 넘긴다.',
    ],
  },
  order: {
    id: 'order',
    label: '순서 배열',
    domain: 'structure',
    emoji: '🔀',
    intent: '지시어와 연결어로 글의 사슬을 다시 잇는다.',
    prompt: '주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?',
    steps: [
      '주어진 글의 마지막 문장에서 다음에 올 것을 예상한다.',
      '(A)(B)(C)의 첫머리에서 지시어(this, such, these)와 연결어를 표시한다.',
      '지시어가 가리킬 대상이 이미 나온 단락만 뒤에 올 수 있다.',
      '정한 순서로 처음부터 이어 읽어 검산한다.',
    ],
    traps: [
      '첫 단락만 정하고 나머지를 찍는다.',
      '내용이 어울린다는 느낌만으로 잇는다.',
    ],
  },
  insertion: {
    id: 'insertion',
    label: '문장 삽입',
    domain: 'structure',
    emoji: '📌',
    intent: '끊긴 자리를 찾아 문장을 도로 끼운다.',
    prompt: '글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?',
    steps: [
      '주어진 문장의 지시어·연결어를 표시해 앞에 있어야 할 것을 정한다.',
      '번호 앞뒤가 논리적으로 끊긴 곳을 찾는다.',
      '넣어 보고 지시어가 가리킬 대상이 앞에 있는지 확인한다.',
    ],
    traps: [
      '같은 낱말이 있는 자리에 그냥 넣는다.',
      '넣은 뒤 뒷문장과의 연결을 확인하지 않는다.',
    ],
  },
  summary: {
    id: 'summary',
    label: '요약문 완성',
    domain: 'integration',
    emoji: '🧩',
    intent: '글 전체를 한 문장으로 압축하고 두 자리를 채운다.',
    prompt: '다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?',
    steps: [
      '요약문을 먼저 읽어 글의 뼈대를 짐작한다.',
      '(A)와 (B)가 지문의 어느 부분을 가리키는지 나눠 표시한다.',
      '한 자리씩 확정해 선택지를 줄인다 — 둘을 동시에 보지 않는다.',
    ],
    traps: [
      '(A)만 맞는 선택지에서 멈춘다.',
      '지문의 낱말을 그대로 옮긴 것을 정답으로 여긴다.',
    ],
  },
};

export const TYPE_ORDER: QuestionTypeId[] = [
  'purpose',
  'mood',
  'detail',
  'claim',
  'mainIdea',
  'topic',
  'title',
  'vocab',
  'grammar',
  'implied',
  'blank',
  'irrelevant',
  'order',
  'insertion',
  'summary',
];

/** 기획서 §6.2의 오답 원인 표. 진단 문구와 후속 학습이 함께 붙어 있다. */
export const ERROR_CAUSES: Record<
  ErrorCauseId,
  { label: string; emoji: string; diagnosis: string; nextStep: string }
> = {
  vocab: {
    label: '어휘 부족',
    emoji: '🔤',
    diagnosis: '핵심어의 뜻을 몰라 문장을 반대로 읽었다.',
    nextStep: '문맥 단어카드와 유의어 문제를 먼저 푼다.',
  },
  syntax: {
    label: '구문 오해',
    emoji: '🧱',
    diagnosis: '주어·동사를 잘못 잡았거나 수식 범위를 놓쳤다.',
    nextStep: '끊어 읽기 훈련으로 같은 구조의 문장을 반복한다.',
  },
  logic: {
    label: '논리 단서 누락',
    emoji: '🔗',
    diagnosis: '대조·인과·예시의 관계를 못 봤다.',
    nextStep: '연결어와 문단 구조 훈련을 붙인다.',
  },
  strategy: {
    label: '유형 전략 부족',
    emoji: '🎯',
    diagnosis: '이 유형에서 무엇을 봐야 하는지가 서 있지 않다.',
    nextStep: '유형학습실 1~2단계를 다시 보고 선택지 판별을 연습한다.',
  },
  time: {
    label: '시간 관리',
    emoji: '⏱️',
    diagnosis: '맞히긴 했지만 권장시간을 크게 넘겼다.',
    nextStep: '같은 유형을 제한시간 모드로 다시 푼다.',
  },
  careless: {
    label: '실수·주의력',
    emoji: '⚠️',
    diagnosis: '발문이나 부정어를 잘못 읽었다.',
    nextStep: '발문 확인 체크 훈련을 붙인다.',
  },
};

/** 복습노트에 들어온 사유 문구 (기획서 §6.1). */
export const REVIEW_REASONS: Record<ReviewReason, string> = {
  wrong: '틀린 문제',
  luckyGuess: '찍어서 맞힌 문제',
  slow: '권장시간을 넘긴 문제',
  flipflop: '답을 여러 번 바꾼 문제',
  starred: '내가 표시한 문제',
};

/** 간격 반복 일정 (기획서 §6.4). */
export const REVIEW_SCHEDULE: Record<ReviewStage, { afterDays: number; label: string; how: string }> = {
  0: { afterDays: 0, label: '당일', how: '해설을 닫고 원문제를 다시 푼다.' },
  1: { afterDays: 1, label: '1일 후', how: '핵심 어휘와 구문을 확인한다.' },
  2: { afterDays: 3, label: '3일 후', how: '선택지나 소재를 바꾼 변형 문제를 푼다.' },
  3: { afterDays: 7, label: '7일 후', how: '같은 유형의 새로운 문제를 푼다.' },
  4: { afterDays: 14, label: '14일 후', how: '여러 유형을 섞은 누적 테스트를 본다.' },
  5: { afterDays: 30, label: '30일 후', how: '완전정복 확인 평가를 본다.' },
};

/** 완전정복 기준 (기획서 §6.5). 화면에 체크리스트로 그린다. */
export const MASTERY_CRITERIA = [
  '해설의 핵심을 이해했다.',
  '원문제를 근거와 함께 다시 맞혔다.',
  '같은 개념의 변형 문제를 맞혔다.',
  '일정 기간 후 새로운 문제도 맞혔다.',
  '정답 근거와 오답 이유를 내 말로 설명했다.',
];
