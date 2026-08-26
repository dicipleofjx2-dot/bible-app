import type { EscapeRoom } from './escapeTypes';
import { ESCAPE_ROOMS_2 } from './rooms2';

/** 성경 방탈출의 방들. 사건 하나가 방 하나다. → docs/arena/README.md
 *
 * ## 방을 더할 때 지킬 것 — 사실 확인 규칙
 *
 * 1. **모든 정답의 `reveal` 에 장·절을 단다.** 근거를 못 다는 문제는 넣지 않는다.
 *    성경 게임에서 틀린 문제 하나는 게임이 재미없는 것보다 훨씬 나쁘다.
 * 2. **본문에 적힌 것만 묻는다.** 전승·추측·설교 예화에서 온 숫자는 안 된다
 *    (예: 방주에 탄 동물의 마릿수, 골리앗의 정확한 키의 미터 환산).
 * 3. **표기가 갈리는 답은 `accepted` 에 다 적는다** — 감람나무/올리브나무,
 *    다리오/다리우스. 아는 사람이 표기 때문에 틀리면 그 자리에서 그만둔다.
 * 4. **`order` 의 items 는 정답 순서대로 적는다.** 섞는 것은 화면이 한다.
 * 5. 개역개정을 기준으로 한다 — 앱의 다른 곳과 같은 번역이라야 한다.
 */
/** 첫 묶음. 목록으로 쓰는 것은 아래 ESCAPE_ROOMS 다. */
const ESCAPE_ROOMS_1: EscapeRoom[] = [
  {
    id: 'ark',
    title: '방주의 문이 닫혔다',
    passage: '창세기 6~8장',
    emoji: '🚢',
    level: 1,
    intro:
      '등 뒤에서 문이 닫힌다. 밖에서는 빗소리가 굵어지고, 발밑의 나무가 천천히 들리기 시작한다. 이 배가 어디로 가는지 알아야 살아서 내린다.',
    seconds: 300,
    locks: [
      {
        id: 'ark-1',
        fixture: '뱃머리에 걸린 자',
        question: '하나님이 노아에게 이르신 방주의 길이는 몇 규빗인가?',
        hint: '너비 오십, 높이 삼십. 길이는 그보다 훨씬 길다.',
        reveal: '삼백 규빗. "그 방주의 길이는 삼백 규빗, 너비는 오십 규빗, 높이는 삼십 규빗이라" (창세기 6:15)',
        spec: { type: 'number', unit: '규빗', answer: 300, digits: 3 },
      },
      {
        id: 'ark-2',
        fixture: '벽에 그어진 날짜 금',
        question: '땅에 비가 몇 날 몇 밤을 내렸는가?',
        hint: '광야의 그 숫자, 시내산의 그 숫자와 같다.',
        reveal: '사십 주야. "사십 주야를 비가 땅에 쏟아졌더라" (창세기 7:12)',
        spec: { type: 'number', unit: '일', answer: 40, digits: 2 },
      },
      {
        id: 'ark-3',
        fixture: '새장이 놓인 창',
        // 문제 글에는 마크다운을 쓰지 않는다 — 화면이 그냥 글자로 그려서
        // 별표가 그대로 보인다. 강조는 말로 한다(「맨 처음」).
        question: '물이 줄었는지 보려고 노아가 창을 열고 맨 처음 내보낸 새는?',
        hint: '많이들 비둘기라고 답한다. 그 앞에 한 마리가 더 있었다.',
        reveal: '까마귀. "까마귀를 내놓으매 물이 땅에서 마르기까지 날아 왕래하였더라" (창세기 8:7)',
        spec: { type: 'choice', choices: ['비둘기', '까마귀', '독수리', '참새'], correctIndex: 1 },
      },
    ],
    finalLock: {
      id: 'ark-final',
      fixture: '방주의 문',
      question: '저녁때 돌아온 비둘기가 입에 물고 온 새 잎사귀는 어느 나무의 것인가?',
      hint: '기름을 짜는 나무. 평화의 상징으로 오늘까지 쓰인다.',
      reveal: '감람나무. "그 입에 감람나무 새 잎사귀가 있는지라" (창세기 8:11)',
      spec: {
        type: 'word',
        firstLetter: '감',
        accepted: ['감람나무', '감람', '올리브', '올리브나무'],
      },
    },
    outro: '문이 열리고 마른 땅 냄새가 들어온다. 하늘에 무지개가 걸려 있다.',
  },

  {
    id: 'jonah',
    title: '물고기 뱃속',
    passage: '요나 1~2장',
    emoji: '🐋',
    level: 1,
    intro:
      '캄캄하다. 벽이 물컹하고 따뜻하다. 여기가 어디인지, 어쩌다 여기까지 왔는지 되짚지 않으면 나갈 길이 없다.',
    seconds: 300,
    locks: [
      {
        id: 'jonah-1',
        fixture: '배삯이 적힌 표',
        question: '요나가 여호와의 낯을 피하여 가려던 곳은 어디인가?',
        hint: '니느웨와 정반대 방향, 바다 건너 서쪽 끝.',
        reveal: '다시스. "여호와의 낯을 피하려고 일어나 다시스로 도망하려 하여" (요나 1:3)',
        spec: { type: 'word', firstLetter: '다', accepted: ['다시스'] },
      },
      {
        id: 'jonah-2',
        fixture: '물때가 새겨진 기둥',
        question: '요나가 물고기 뱃속에 있은 것은 몇 날 몇 밤인가?',
        hint: '예수님이 자기 죽음과 부활을 설명하실 때 이 사건을 드셨다.',
        reveal: '삼 일 삼 야. "요나가 밤낮 삼 일을 물고기 뱃속에 있으니라" (요나 1:17)',
        spec: { type: 'number', unit: '일', answer: 3, digits: 1 },
      },
      {
        id: 'jonah-3',
        fixture: '뒤엉킨 밧줄 여섯 가닥',
        question: '여기까지 오게 된 일들을 순서대로 세워라.',
        hint: '제비를 뽑은 것은 바람이 인 다음이다.',
        reveal: '요나 1장 2~17절의 차례다.',
        spec: {
          type: 'order',
          items: [
            '니느웨로 가서 외치라는 말씀이 요나에게 임하다',
            '다시스로 가는 배를 타려고 욥바로 내려가다',
            '여호와께서 큰 바람을 바다 위에 내리시다',
            '제비를 뽑으니 요나가 뽑히다',
            '요나를 들어 바다에 던지매 바다가 잔잔해지다',
            '여호와께서 예비하신 큰 물고기가 요나를 삼키다',
          ],
        },
      },
    ],
    finalLock: {
      id: 'jonah-final',
      fixture: '물고기의 입',
      question: '요나가 애초에 가라는 말씀을 받은 큰 성읍의 이름은?',
      hint: '앗수르의 수도. 요나가 가장 가기 싫어한 곳.',
      reveal: '니느웨. "너는 일어나 저 큰 성읍 니느웨로 가서 그것을 향하여 외치라" (요나 1:2)',
      spec: { type: 'word', firstLetter: '니', accepted: ['니느웨'] },
    },
    outro: '물고기가 요나를 육지에 토해 낸다. 두 번째 기회가 주어졌다.',
  },

  {
    id: 'jericho',
    title: '무너지지 않는 성벽',
    passage: '여호수아 2, 6장',
    emoji: '🏰',
    level: 2,
    intro:
      '성벽 안이다. 문은 굳게 닫혔고 나가는 자도 들어오는 자도 없다. 밖에서는 이레째 무언가가 성을 돌고 있다.',
    seconds: 300,
    locks: [
      {
        id: 'jericho-1',
        fixture: '엿새치 돌을 세는 판',
        question: '엿새 동안은 하루에 성을 몇 번 돌았는가?',
        hint: '일곱째 날만 달랐다.',
        reveal: '한 번. "엿새 동안을 이같이 행하되" — 하루 한 번씩 돌았다 (여호수아 6:3, 14)',
        spec: { type: 'number', unit: '바퀴', answer: 1, digits: 1 },
      },
      {
        id: 'jericho-2',
        fixture: '나팔이 걸린 못 일곱 개',
        question: '일곱째 날에는 성을 몇 번 돌았는가?',
        hint: '이 사건에서 되풀이되는 그 숫자.',
        reveal: '일곱 번. "일곱째 날에는 그 성을 일곱 번 돌며" (여호수아 6:4)',
        spec: { type: 'number', unit: '바퀴', answer: 7, digits: 1 },
      },
      {
        id: 'jericho-3',
        fixture: '성벽에 붙은 집의 문',
        question: '여호수아가 보낸 두 정탐꾼을 지붕에 숨겨 준 여인의 이름은?',
        hint: '뒷날 마태복음 1장 족보에 이름이 오른다.',
        reveal: '라합. "기생 라합과 그의 아버지의 가족과 그에게 속한 모든 것은 살려 주라" (여호수아 6:17)',
        spec: { type: 'word', firstLetter: '라', accepted: ['라합'] },
      },
    ],
    finalLock: {
      id: 'jericho-final',
      fixture: '창문에 매인 줄',
      question: '살아남을 표로 라합이 창문에 맨 줄은 무슨 색이었는가?',
      hint: '유월절 문설주에 바른 것과 같은 색이다.',
      reveal: '붉은 줄. "이 붉은 줄을 우리를 달아 내린 창문에 매고" (여호수아 2:18)',
      spec: { type: 'choice', choices: ['흰 줄', '푸른 줄', '붉은 줄', '자색 줄'], correctIndex: 2 },
    },
    outro: '나팔 소리와 함께 성벽이 무너져 내린다. 붉은 줄이 걸린 창만 그대로 서 있다.',
  },

  {
    id: 'lions',
    title: '사자굴의 밤',
    passage: '다니엘 6장',
    emoji: '🦁',
    level: 2,
    intro:
      '돌이 굴 입구를 막고 왕의 인장이 찍히는 소리가 들린다. 어둠 속에서 숨소리가 여럿이다. 아침까지 버티려면 이 일이 어떻게 시작되었는지부터 알아야 한다.',
    seconds: 300,
    locks: [
      {
        id: 'lions-1',
        fixture: '금령이 적힌 조서',
        question: '왕 외의 다른 신에게 구하지 말라는 금령은 며칠 동안이었는가?',
        hint: '한 달에 해당하는 날수.',
        reveal: '삼십 일. "이제 삼십 일 동안에 누구든지 왕 외의 어떤 신에게나 사람에게 무엇을 구하면" (다니엘 6:7)',
        spec: { type: 'number', unit: '일', answer: 30, digits: 2 },
      },
      {
        id: 'lions-2',
        fixture: '다락방의 창',
        question: '다니엘은 하루에 몇 번씩 무릎을 꿇고 기도하였는가?',
        hint: '금령을 알고도 전에 하던 대로 했다.',
        reveal: '세 번. "하루 세 번씩 무릎을 꿇고 기도하며 그의 하나님께 감사하였더라" (다니엘 6:10)',
        spec: { type: 'number', unit: '번', answer: 3, digits: 1 },
      },
      {
        id: 'lions-3',
        fixture: '창이 향한 쪽의 벽',
        question: '다니엘의 다락 창은 어느 도시를 향하여 열려 있었는가?',
        hint: '솔로몬이 성전을 봉헌하며 이 방향을 두고 기도했다.',
        reveal: '예루살렘. "예루살렘으로 향한 창문을 열고" (다니엘 6:10)',
        spec: { type: 'word', firstLetter: '예', accepted: ['예루살렘'] },
      },
    ],
    finalLock: {
      id: 'lions-final',
      fixture: '굴을 막은 돌의 인장',
      question: '이 금령에 도장을 찍은 왕의 이름은?',
      hint: '메대 사람. 다니엘을 사자굴에서 건지려고 밤새 애썼다.',
      reveal: '다리오. "이에 다리오 왕이 조서에 어인을 찍으니라" (다니엘 6:9)',
      spec: { type: 'word', firstLetter: '다', accepted: ['다리오', '다리우스', '다리오왕'] },
    },
    outro: '새벽에 돌이 치워진다. 사자들은 입을 다물고 있었고, 몸에 아무 상함이 없다.',
  },

  {
    id: 'redsea',
    title: '홍해 앞, 막다른 길',
    passage: '출애굽기 14장',
    emoji: '🌊',
    level: 3,
    intro:
      '앞은 바다, 뒤는 병거 소리. 백성은 울부짖고 시간은 없다. 오늘 밤 이곳에서 무슨 일이 일어나는지 순서대로 알아야 건널 수 있다.',
    seconds: 330,
    locks: [
      {
        id: 'redsea-1',
        fixture: '모래에 꽂힌 것',
        question: '바다 위로 손을 내밀 때 모세가 손에 들라고 하신 것은?',
        hint: '나일 강을 치고 반석을 친 바로 그것.',
        reveal: '지팡이. "지팡이를 들고 손을 바다 위로 내밀어 그것이 갈라지게 하라" (출애굽기 14:16)',
        spec: { type: 'choice', choices: ['놋뱀', '지팡이', '나팔', '언약궤'], correctIndex: 1 },
      },
      {
        id: 'redsea-2',
        fixture: '밤새 흔들린 풍향계',
        question: '여호와께서 밤새도록 불게 하여 바닷물을 물러가게 하신 바람은?',
        hint: '해가 뜨는 쪽에서 불어온다.',
        reveal: '큰 동풍. "여호와께서 큰 동풍이 밤새도록 바닷물을 물러가게 하시니" (출애굽기 14:21)',
        spec: { type: 'word', firstLetter: '동', accepted: ['동풍', '큰동풍'] },
      },
      {
        id: 'redsea-3',
        fixture: '여섯 조각으로 깨진 석판',
        question: '그날 밤 일어난 일을 순서대로 세워라.',
        hint: '구름 기둥이 자리를 옮긴 것은 모세가 손을 내밀기 전이다.',
        reveal: '출애굽기 14장 10~28절의 차례다.',
        spec: {
          type: 'order',
          items: [
            '애굽 사람들이 뒤쫓아 오는 것을 보고 이스라엘이 심히 두려워 부르짖다',
            '구름 기둥이 앞에서 뒤로 옮겨 두 진 사이에 서다',
            '모세가 바다 위로 손을 내밀다',
            '큰 동풍이 밤새 불어 바다가 갈라지고 물이 벽이 되다',
            '이스라엘 자손이 바다 가운데를 마른 땅으로 걸어가다',
            '뒤따라 들어간 애굽 군대 위로 물이 되돌아와 덮다',
          ],
        },
      },
    ],
    finalLock: {
      id: 'redsea-final',
      fixture: '바로의 병거 수를 새긴 문',
      question: '바로가 거느리고 뒤쫓은 특별 병거는 몇 대인가?',
      hint: '세 자리 수. 애굽의 모든 병거는 따로 더 있었다.',
      reveal: '육백 대. "바로가 정예 병거 육백 대와 애굽의 모든 병거를 거느리니" (출애굽기 14:7)',
      spec: { type: 'number', unit: '대', answer: 600, digits: 3 },
    },
    outro: '마른 땅을 밟고 건넌다. 뒤를 돌아보니 바다가 다시 제자리로 흐르고 있다.',
  },

  {
    id: 'philippi',
    title: '한밤중의 옥문',
    passage: '사도행전 16장',
    emoji: '⛓️',
    level: 3,
    intro:
      '깊은 옥이다. 발에는 차꼬가 채워져 있고 등은 매 맞은 자리가 쓰리다. 밤은 깊었는데 옆 감방에서 노랫소리가 들려온다.',
    seconds: 330,
    locks: [
      {
        id: 'philippi-1',
        fixture: '고발장이 붙은 벽',
        question: '바울과 실라가 매를 맞고 옥에 갇힌 직접적인 까닭은?',
        hint: '누군가의 돈줄이 끊어졌기 때문이다.',
        reveal:
          '점치는 귀신 들린 여종에게서 귀신을 쫓아내자 주인들의 이익의 소망이 끊어졌기 때문. "주인들은 자기 이익의 소망이 끊어진 것을 보고" (사도행전 16:19)',
        spec: {
          type: 'choice',
          choices: [
            '성전에서 장사하는 자들을 내쫓아서',
            '점치는 여종에게서 귀신을 쫓아내어 주인들의 돈벌이가 끊겨서',
            '가이사에게 세금 바치는 것을 금하여서',
            '안식일에 병자를 고쳐서',
          ],
          correctIndex: 1,
        },
      },
      {
        id: 'philippi-2',
        fixture: '차꼬가 채워진 나무 틀',
        question: '한밤중에 옥에서 바울과 실라가 하고 있던 일은?',
        hint: '다른 죄수들이 그 소리를 듣고 있었다.',
        reveal: '기도하고 하나님을 찬송함. "한밤중에 바울과 실라가 기도하고 하나님을 찬송하매 죄수들이 듣더라" (사도행전 16:25)',
        spec: {
          type: 'choice',
          choices: [
            '잠들어 있었다',
            '탈옥할 길을 의논하고 있었다',
            '기도하고 하나님을 찬송하고 있었다',
            '간수와 다투고 있었다',
          ],
          correctIndex: 2,
        },
      },
      {
        id: 'philippi-3',
        fixture: '흔들리는 옥터',
        question: '옥터가 움직이고 옥문이 곧 다 열린 것은 무엇 때문인가?',
        hint: '땅이 흔들렸다.',
        reveal: '큰 지진. "이에 갑자기 큰 지진이 나서 옥터가 움직이고 문이 곧 다 열리며" (사도행전 16:26)',
        spec: { type: 'word', firstLetter: '지', accepted: ['지진', '큰지진'] },
      },
    ],
    finalLock: {
      id: 'philippi-final',
      fixture: '열린 옥문',
      question: '"주 예수를 믿으라 그리하면 너와 네 ○이 구원을 받으리라" — 빈칸에 들어갈 한 글자는?',
      hint: '간수 한 사람에게만 해당하는 말이 아니었다.',
      reveal: '집. "주 예수를 믿으라 그리하면 너와 네 집이 구원을 받으리라" (사도행전 16:31)',
      spec: { type: 'word', accepted: ['집', '집안', '가족'] },
    },
    outro: '간수가 그 밤에 두 사람의 상처를 씻기고, 온 집이 함께 세례를 받는다.',
  },
];

/** 화면이 쓰는 방 목록. 쉬운 방이 앞에 오도록 난이도 순으로 세운다 —
 * 처음 들어온 사람이 첫 방에서 막히면 다시 안 온다. */
export const ESCAPE_ROOMS: EscapeRoom[] = [...ESCAPE_ROOMS_1, ...ESCAPE_ROOMS_2].sort(
  (a, b) => a.level - b.level
);

export function findRoom(id: string): EscapeRoom | undefined {
  return ESCAPE_ROOMS.find((r) => r.id === id);
}
