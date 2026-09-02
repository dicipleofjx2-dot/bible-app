import type { Question } from './types';

/**
 * 실용·사실 + 대의 파악 문항 (목적/심경/일치/주장/요지).
 *
 * **전부 자체 제작이다.** 기출의 평가 요소와 형식만 참고하고 지문·선택지를
 * 새로 썼다(기획서 §4.4). 기출 원문은 이용 허가가 확인되기 전에는 앱에 담지
 * 않는다 — 담을 때는 `source.status`를 'licensed'로 바꾸고 검수 이력을 적는다.
 */

const ORIGINAL = { status: 'original', label: '자체 제작 수능형 문항', reviewedBy: '미검수' } as const;

export const PRACTICAL_QUESTIONS: Question[] = [
  {
    id: 'purpose-1',
    type: 'purpose',
    difficulty: 1,
    vocabLevel: 'high1',
    expectedSeconds: 60,
    source: ORIGINAL,
    instruction: '다음 글의 목적으로 가장 적절한 것은?',
    passage: [
      'Dear Ms. Robinson,',
      'Thank you for the wonderful science workshop you led for our sixth graders last month.',
      'The students still talk about the water filter they built with you.',
      'Our school is now planning a science week in October, and we would like to ask you to run the same workshop for three more classes.',
      'Each session would last about ninety minutes, and we can cover your travel costs.',
      'Please let me know by September 10 whether your schedule allows it.',
      'Sincerely, Daniel Park',
    ],
    choices: [
      { id: 1, text: '과학 워크숍 진행을 요청하려고', },
      { id: 2, text: '지난 워크숍에 대해 감사하려고', whyWrong: '고마움은 요청을 꺼내기 위한 인사말이다. 글의 목적이 아니다.', cause: 'strategy' },
      { id: 3, text: '과학 주간 행사 일정을 안내하려고', whyWrong: '10월 과학 주간은 요청의 배경으로만 나온다.', cause: 'strategy' },
      { id: 4, text: '워크숍 참가비 환불을 요구하려고', whyWrong: '비용은 학교가 부담하겠다고 했다. 정반대다.', cause: 'careless' },
      { id: 5, text: '학생들의 과학 성적 향상을 보고하려고', whyWrong: '성적 이야기는 지문에 없다.', cause: 'careless' },
    ],
    answer: 1,
    evidenceIndex: 3,
    structureLine: '감사 인사 → 배경(과학 주간) → 요청(세 반 더) → 조건과 회신 기한',
    hint: 'would like to ask you to 로 시작하는 문장을 찾아보세요.',
    explanation:
      '앞의 두 문장은 감사 인사이고, 목적은 네 번째 문장 we would like to ask you to run the same workshop 에서 드러난다. 뒤따르는 시간·비용·회신 기한은 모두 그 요청을 위한 조건이다. 편지글의 목적은 대개 인사말 다음, 요청 조동사가 붙은 문장에 있다.',
    rule: '편지글은 인사말을 건너뛰고 would like to / please / we ask 가 붙은 문장부터 찾는다.',
    keyVocab: [
      { word: 'run (a workshop)', meaning: '(워크숍을) 진행하다', note: '「달리다」가 아니다. run a program/a shop 처럼 「운영하다」로 자주 나온다.' },
      { word: 'cover (costs)', meaning: '(비용을) 부담하다' },
      { word: 'session', meaning: '(한 차례의) 수업·모임' },
    ],
    keySyntax: [
      {
        sentence:
          'Our school is now planning a science week in October, and we would like to ask you to run the same workshop for three more classes.',
        chunks: ['Our school is now planning a science week in October,', 'and we would like to ask you', 'to run the same workshop', 'for three more classes.'],
        translation: '저희 학교가 10월에 과학 주간을 계획하고 있어서, 같은 워크숍을 세 반에 더 진행해 주시기를 부탁드리고자 합니다.',
        point: 'ask + 목적어 + to부정사 — 「~에게 …해 달라고 부탁하다」. 목적어와 to부정사 사이를 끊어 읽는다.',
      },
    ],
  },
  {
    id: 'purpose-2',
    type: 'purpose',
    difficulty: 2,
    vocabLevel: 'high2',
    expectedSeconds: 70,
    source: ORIGINAL,
    variantOf: 'purpose-1',
    instruction: '다음 글의 목적으로 가장 적절한 것은?',
    passage: [
      'To all residents of Maple Court,',
      'As many of you know, the parking lot behind Building B has been repaved this summer.',
      'The work was finished two weeks ahead of schedule, and we are grateful for your patience.',
      'However, several cars have been parked in the two spaces reserved for delivery vehicles.',
      'When those spaces are blocked, delivery drivers stop on the narrow entrance road, and residents cannot get in or out.',
      'We therefore ask you to keep the two marked spaces clear at all times.',
      'The building office will place new signs this Friday.',
    ],
    choices: [
      { id: 1, text: '주차장 재포장 공사 완료를 알리려고', whyWrong: '공사 완료는 이미 지난 일로, 요청을 꺼내는 배경이다.', cause: 'strategy' },
      { id: 2, text: '배달 차량 전용 구역을 비워 둘 것을 당부하려고' },
      { id: 3, text: '주차 요금 인상을 공지하려고', whyWrong: '요금 이야기는 지문에 전혀 없다.', cause: 'careless' },
      { id: 4, text: '입주민의 협조에 감사하려고', whyWrong: '감사는 세 번째 문장의 인사말일 뿐이다.', cause: 'strategy' },
      { id: 5, text: '새 안내 표지판 디자인을 공모하려고', whyWrong: '표지판은 사무실이 설치한다고 했을 뿐 공모가 아니다.', cause: 'careless' },
    ],
    answer: 2,
    evidenceIndex: 5,
    structureLine: '배경(공사 완료) → 문제(전용 구역 점유) → 그 결과 → 당부 → 후속 조치',
    hint: 'However 뒤부터가 진짜 하고 싶은 말입니다.',
    explanation:
      '앞 세 문장은 배경과 인사, However 뒤에서 문제가 제시되고, We therefore ask you to keep the two marked spaces clear 가 목적이다. 공지문에서 However·therefore 는 목적 문장을 여는 신호로 자주 쓰인다.',
    rule: '공지문에서 However / therefore 뒤 문장을 먼저 읽는다.',
    keyVocab: [
      { word: 'repave', meaning: '다시 포장하다' },
      { word: 'reserved for', meaning: '~을 위해 지정된' },
      { word: 'ahead of schedule', meaning: '예정보다 앞서' },
    ],
    keySyntax: [
      {
        sentence:
          'When those spaces are blocked, delivery drivers stop on the narrow entrance road, and residents cannot get in or out.',
        chunks: ['When those spaces are blocked,', 'delivery drivers stop on the narrow entrance road,', 'and residents cannot get in or out.'],
        translation: '그 구역이 막히면 배달 기사들이 좁은 진입로에 세우게 되고, 주민들이 드나들 수 없게 됩니다.',
        point: 'When 부사절 + 주절 두 개의 병렬. 원인 하나에 결과 둘이 and 로 이어진다.',
      },
    ],
  },
  {
    id: 'mood-1',
    type: 'mood',
    difficulty: 2,
    vocabLevel: 'high1',
    expectedSeconds: 70,
    source: ORIGINAL,
    instruction: '다음 글에 드러난 “I”의 심경 변화로 가장 적절한 것은?',
    passage: [
      'The hall was already full when I stepped onto the stage, and my hands would not stop shaking.',
      'I had practiced the piece for months, but now every note seemed to have left my head.',
      'For a moment I stared at the keys, hearing only my own breathing.',
      'Then I remembered what my teacher had said: play the first bar, and the rest will come back.',
      'I pressed the first key, and the melody unfolded on its own.',
      'By the last chord the hall felt warm, and I found myself smiling before the applause even began.',
    ],
    choices: [
      { id: 1, text: 'nervous → relieved' },
      { id: 2, text: 'bored → excited', whyWrong: '앞부분은 지루함이 아니라 긴장이다.', cause: 'vocab' },
      { id: 3, text: 'angry → calm', whyWrong: '화를 낸 대목이 없다.', cause: 'careless' },
      { id: 4, text: 'confident → disappointed', whyWrong: '앞뒤가 정확히 뒤집혔다. 마지막에 웃고 있다.', cause: 'logic' },
      { id: 5, text: 'curious → indifferent', whyWrong: '호기심도 무관심도 드러나지 않는다.', cause: 'careless' },
    ],
    answer: 1,
    evidenceIndex: 5,
    structureLine: '무대 위 긴장(손 떨림·머릿속 백지) → 전환(선생님의 말) → 연주가 풀림 → 안도와 미소',
    hint: '앞부분의 몸의 반응과 마지막 문장의 표정을 나란히 놓아 보세요.',
    explanation:
      '앞부분은 hands would not stop shaking, every note seemed to have left my head 로 긴장을 몸으로 그린다. Then 이 전환점이고, 마지막 문장의 the hall felt warm, I found myself smiling 이 안도를 보여 준다. 심경 변화형은 앞과 뒤가 모두 맞는 선택지만 답이 된다.',
    rule: '심경은 감정을 말하는 낱말보다 몸의 반응과 풍경 묘사에서 먼저 찾는다.',
    keyVocab: [
      { word: 'bar', meaning: '(악보의) 마디', note: '「막대기·술집」이 아니다. 음악 문맥에서는 마디다.' },
      { word: 'unfold', meaning: '펼쳐지다, 저절로 이어지다' },
      { word: 'applause', meaning: '박수갈채' },
    ],
    keySyntax: [
      {
        sentence: 'By the last chord the hall felt warm, and I found myself smiling before the applause even began.',
        chunks: ['By the last chord', 'the hall felt warm,', 'and I found myself smiling', 'before the applause even began.'],
        translation: '마지막 화음에 이르자 홀이 따뜻하게 느껴졌고, 박수가 시작되기도 전에 나는 웃고 있는 나를 발견했다.',
        point: 'find + 목적어 + -ing — 「(무심코) ~하고 있는 것을 발견하다」. 감정 변화의 마무리에 잘 쓰인다.',
      },
    ],
  },
  {
    id: 'mood-2',
    type: 'mood',
    difficulty: 3,
    vocabLevel: 'csatBase',
    expectedSeconds: 75,
    source: ORIGINAL,
    variantOf: 'mood-1',
    instruction: '다음 글에 드러난 “I”의 심경 변화로 가장 적절한 것은?',
    passage: [
      'I had been looking forward to the hiking trip for weeks, and the morning sky was perfectly clear.',
      'We set off singing, our packs light on our backs.',
      'Two hours in, the clouds came down without warning, and the path disappeared under a gray fog.',
      'I could not see the person walking ten steps ahead of me, and my voice sounded small when I called out.',
      'We stood still, waiting, while the cold crept through my jacket.',
      'When the fog finally lifted, the ridge lay open below us, but I could not stop thinking about how quickly it had all changed.',
    ],
    choices: [
      { id: 1, text: 'cheerful → uneasy' },
      { id: 2, text: 'cheerful → delighted', whyWrong: '안개가 걷힌 뒤에도 마지막 문장은 기쁨이 아니라 불안의 여운이다.', cause: 'logic' },
      { id: 3, text: 'indifferent → frightened', whyWrong: '출발할 때는 무관심이 아니라 들떠 있었다.', cause: 'vocab' },
      { id: 4, text: 'nervous → confident', whyWrong: '앞뒤가 뒤집혔다.', cause: 'logic' },
      { id: 5, text: 'regretful → grateful', whyWrong: '후회도 감사도 드러나지 않는다.', cause: 'careless' },
    ],
    answer: 1,
    evidenceIndex: 5,
    structureLine: '들뜬 출발 → 갑작스러운 안개 → 고립감 → 걷힌 뒤에도 남는 불안',
    hint: '마지막 문장의 but 뒤를 보세요. 감정이 완전히 풀렸나요?',
    explanation:
      '앞부분은 looking forward to, set off singing 으로 들뜬 기분이다. 안개가 내리며 고립감이 생기고, 마지막 문장은 but I could not stop thinking about how quickly it had all changed 로 끝난다. 풍경은 열렸지만 감정은 아직 풀리지 않았으므로 uneasy 가 맞다. 마지막 문장의 역접을 놓치면 delighted 를 고르게 된다.',
    rule: '마지막 문장에 but 이 있으면 그 뒤가 최종 감정이다.',
    keyVocab: [
      { word: 'set off', meaning: '출발하다' },
      { word: 'creep', meaning: '스며들다, 슬금슬금 다가오다' },
      { word: 'ridge', meaning: '산등성이' },
    ],
    keySyntax: [
      {
        sentence:
          'When the fog finally lifted, the ridge lay open below us, but I could not stop thinking about how quickly it had all changed.',
        chunks: ['When the fog finally lifted,', 'the ridge lay open below us,', 'but I could not stop thinking about', 'how quickly it had all changed.'],
        translation: '안개가 마침내 걷혔을 때 산등성이가 우리 아래로 훤히 드러났지만, 나는 모든 것이 얼마나 빨리 변했는지를 생각하는 것을 멈출 수 없었다.',
        point: 'stop -ing(멈추다) + 의문사절 목적어. stop to부정사(~하려고 멈추다)와 구별한다.',
      },
    ],
  },
  {
    id: 'detail-1',
    type: 'detail',
    difficulty: 2,
    vocabLevel: 'high2',
    expectedSeconds: 65,
    source: ORIGINAL,
    instruction: 'Marta Ferrán에 관한 다음 글의 내용과 일치하지 않는 것은?',
    passage: [
      'Marta Ferrán was born in a fishing village on the Catalan coast in 1921.',
      'She left school at fourteen to work in her family shop, but she kept drawing the boats in the harbor every evening.',
      'In 1948 she moved to Paris, where she studied printmaking rather than painting.',
      'Her first solo exhibition opened in 1955 and sold only three works.',
      'She taught at a small art school for the next thirty years and never stopped making prints.',
      'The museum in her hometown opened a permanent room for her work in 1998, three years before her death.',
    ],
    choices: [
      { id: 1, text: '열네 살에 학교를 그만두고 가게에서 일했다.', whyWrong: '두 번째 문장과 일치한다.', cause: 'careless' },
      { id: 2, text: '파리에서 회화를 전공했다.' },
      { id: 3, text: '첫 개인전에서 세 점만 팔렸다.', whyWrong: '네 번째 문장과 일치한다.', cause: 'careless' },
      { id: 4, text: '삼십 년 동안 미술 학교에서 가르쳤다.', whyWrong: '다섯 번째 문장과 일치한다.', cause: 'careless' },
      { id: 5, text: '고향 미술관에 상설 전시실이 생긴 것은 그녀가 세상을 떠나기 전이다.', whyWrong: '마지막 문장의 three years before her death 와 일치한다.', cause: 'careless' },
    ],
    answer: 2,
    evidenceIndex: 2,
    structureLine: '출생 → 학업 중단과 취미 → 파리에서 판화 수학 → 첫 개인전 → 교직 → 상설 전시실',
    hint: 'studied printmaking rather than painting 을 다시 읽어 보세요.',
    explanation:
      '세 번째 문장은 studied printmaking rather than painting — 회화가 아니라 판화를 공부했다고 못박는다. rather than 은 앞을 택하고 뒤를 버리는 표현이므로, 뒤에 놓인 painting 을 전공으로 읽으면 정확히 반대가 된다. 일치 문제는 이런 비교·부정 표현에서 갈린다.',
    rule: 'A rather than B 는 「B가 아니라 A」다. 선택지가 B를 말하면 그것이 답이다.',
    keyVocab: [
      { word: 'printmaking', meaning: '판화' },
      { word: 'rather than', meaning: '~보다는, ~이 아니라' },
      { word: 'permanent', meaning: '상설의, 영구적인' },
    ],
    keySyntax: [
      {
        sentence: 'In 1948 she moved to Paris, where she studied printmaking rather than painting.',
        chunks: ['In 1948 she moved to Paris,', 'where she studied printmaking', 'rather than painting.'],
        translation: '1948년에 그녀는 파리로 옮겨 갔고, 그곳에서 회화가 아니라 판화를 공부했다.',
        point: '계속적 용법의 where — 앞의 Paris 를 받아 「그리고 그곳에서」로 이어 읽는다.',
      },
    ],
  },
  {
    id: 'detail-2',
    type: 'detail',
    difficulty: 2,
    vocabLevel: 'high2',
    expectedSeconds: 65,
    source: ORIGINAL,
    variantOf: 'detail-1',
    instruction: 'Riverbank Night Market에 관한 다음 안내문의 내용과 일치하는 것은?',
    passage: [
      'Riverbank Night Market runs every Friday and Saturday from May through September.',
      'Stalls open at 5 p.m. and close at 11 p.m.',
      'Admission is free, but the riverside parking lot charges 2,000 won per hour.',
      'Pets are welcome except in the food court.',
      'The market is cancelled only when a heavy rain warning is issued; light rain does not stop it.',
      'Reusable cups may be borrowed at the information desk with a 1,000 won deposit.',
    ],
    choices: [
      { id: 1, text: '주중에도 매일 열린다.', whyWrong: '금요일과 토요일에만 열린다.', cause: 'careless' },
      { id: 2, text: '입장료를 내야 한다.', whyWrong: 'Admission is free 라고 했다. 유료인 것은 주차장이다.', cause: 'careless' },
      { id: 3, text: '반려동물은 푸드코트에 들어갈 수 없다.' },
      { id: 4, text: '비가 조금만 와도 취소된다.', whyWrong: 'light rain does not stop it — 정반대다.', cause: 'logic' },
      { id: 5, text: '다회용 컵은 무료로 가져갈 수 있다.', whyWrong: '보증금 1,000원을 맡기고 빌리는 것이다.', cause: 'vocab' },
    ],
    answer: 3,
    evidenceIndex: 3,
    structureLine: '운영 기간 → 시간 → 요금 → 반려동물 → 우천 → 대여',
    hint: 'except 라는 낱말이 어디에 붙어 있는지 보세요.',
    explanation:
      'Pets are welcome except in the food court — 반려동물은 환영이되 푸드코트만 예외다. 안내문 일치 문제는 free/charge, except, only when 처럼 범위를 자르는 낱말에서 정답이 갈린다. 발문이 「일치하는 것」임을 먼저 표시해 두면 ①②④⑤를 빠르게 지울 수 있다.',
    rule: '안내문은 except / only / per 가 붙은 자리에 밑줄부터 긋고 선택지와 대조한다.',
    keyVocab: [
      { word: 'admission', meaning: '입장(료)' },
      { word: 'deposit', meaning: '보증금', note: '「예금·퇴적물」의 뜻도 있으나 여기서는 돌려받는 보증금이다.' },
      { word: 'issue (a warning)', meaning: '(경보를) 발령하다' },
    ],
    keySyntax: [
      {
        sentence: 'The market is cancelled only when a heavy rain warning is issued; light rain does not stop it.',
        chunks: ['The market is cancelled', 'only when a heavy rain warning is issued;', 'light rain does not stop it.'],
        translation: '이 시장은 호우 경보가 발령될 때에만 취소되며, 약한 비로는 중단되지 않는다.',
        point: 'only when — 「~할 때에만」. 조건을 좁히는 표현이라 일치 문제의 단골 근거다.',
      },
    ],
  },
];
