import type { ChoiceQuestion, QuizQuestion } from './quizTypes';

/**
 * 3초 OX 퀴즈에 낼 문제를 그날 퀴즈에서 만들어 낸다.
 *
 * 저장된 문항은 **전부 4지선다**다(707문항 전수 확인). OX 문항도, 단답형도
 * 따로 없다. 그래서 1,189개 장에 OX 문항을 새로 채워 넣는 대신, 이미 있는
 * 4지선다에서 **문제와 답 후보 하나**를 뽑아 "이게 맞나?"를 묻는다.
 *
 * 한국어 물음을 서술문으로 고쳐 쓰지 않는 이유가 있다. "하나님이 첫째 날에
 * 만드신 것은 무엇입니까?"를 "…만드신 것은 빛이다"로 바꾸려면 어미를 갈아
 * 끼워야 하는데, 물음 형태가 제각각이라("~했습니까?", "~들어갈 말은?",
 * "~몇째 날입니까?") 규칙으로 다루면 반드시 어색한 문장이 나온다. 물음을 그대로
 * 두고 답 후보만 크게 보여 주면 문장을 건드릴 일이 없고, 3초 안에 읽기도 더 빠르다.
 */

export type SpeedCategory = 'person' | 'place' | 'time' | 'other';

export type SpeedQuestion = {
  /** 원래 문항의 물음. 손대지 않는다. */
  prompt: string;
  /** 화면 한가운데 크게 띄우는 답 후보 */
  candidate: string;
  /** 이 후보가 맞는 답인가 (O가 정답인가) */
  isTrue: boolean;
  /** 맞는 답. 틀린 후보였을 때 지나가며 알려 준다. */
  answer: string;
  category: SpeedCategory;
};

/** 한 판에 내는 문제 수 */
export const SPEED_QUIZ_SIZE = 10;

/** 한 문제에 주는 시간(초) */
export const SPEED_QUIZ_SECONDS = 3;

/** 이 아래로는 판을 열지 않는다. 서너 문제로는 "다 맞히면 10점"이 너무 헐겁다. */
export const SPEED_QUIZ_MIN = 5;

/**
 * 사람·장소·시간을 묻는 문항인지 가려낸다.
 *
 * 물음말(누구·어디·언제)이 가장 확실한 단서고, 없으면 보기의 꼬리를 본다
 * ("모리아 산", "사흘", "애굽 땅"). 둘 다 아니면 'other'로 두고 뒤로 미룬다 —
 * 버리지는 않는다. 열 문제를 채우는 게 먼저다.
 */
export function categorize(q: ChoiceQuestion): SpeedCategory {
  // 따옴표 안은 본문을 인용한 대목이라 물음말이 들어 있어도 그 문항이 묻는 것이
  // 아니다. "네가 어디 있느냐고 물으셨을 때 아담의 대답은?"은 장소를 묻는 문항이
  // 아니라 대답을 묻는 문항이다. 인용을 걷어내고 본다.
  const text = q.question.replace(/["'“”‘’「」『』][^"'“”‘’「」『』]*["'“”‘’「」『』]/g, ' ');

  if (/누구|누가|이름은|이름을/.test(text)) return 'person';
  if (/어디|어느 곳|어느 땅|어느 산|어느 성|무슨 산|어느 지역|장소/.test(text)) return 'place';
  if (/언제|며칠|몇 년|몇 해|몇 날|몇 달|몇째|몇 번째|얼마 동안|몇 살|나이|몇 시/.test(text)) return 'time';

  // 보기 쪽 단서. 물음말만큼 믿을 게 못 되므로 **셋 이상**이 같은 결일 때만 쓴다.
  //
  // 「일」을 시간으로 보면 안 된다. "다스리는 일 / 나는 일 / 별을 세는 일"이
  // 전부 날짜로 잡혔다. 날을 세는 말은 숫자를 앞세우거나("사십일") 고유한
  // 이름을 가지므로("엿새") 그것만 시간으로 친다.
  const score = { place: 0, time: 0 };
  for (const choice of q.choices) {
    const c = choice.trim();
    if (
      /(날|년|해|달|개월|밤|주일|째|시간)$/.test(c) ||
      /\d+\s*(일|년|개월|달|주)$/.test(c) ||
      /(하루|이틀|사흘|나흘|닷새|엿새|이레|여드레|아흐레|열흘)$/.test(c)
    ) {
      score.time += 1;
    } else if (/(산|성|땅|강|바다|광야|골짜기|동산|평지|우물|굴|섬|성읍|지방|나라)$/.test(c)) {
      score.place += 1;
    }
  }
  if (score.time >= 3) return 'time';
  if (score.place >= 3) return 'place';

  return 'other';
}

function shuffled<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 그날 퀴즈 문항에서 OX 열 문제를 만든다.
 *
 * 낼 문항이 {@link SPEED_QUIZ_MIN}개도 안 되면 빈 배열 — 화면은 "준비 중"을
 * 보여 준다. 억지로 서너 문제짜리 판을 여느니 안 여는 게 낫다.
 *
 * 매번 다시 부르면 문제도 O/X도 달라진다. 같은 판을 외워서 푸는 놀이가 아니다.
 */
export function buildSpeedQuiz(questions: readonly QuizQuestion[]): SpeedQuestion[] {
  const choiceQuestions = questions.filter((q): q is ChoiceQuestion => q.type === 'choice' && q.choices.length >= 2);
  if (choiceQuestions.length < SPEED_QUIZ_MIN) return [];

  // 사람·장소·시간을 먼저 채우고, 모자라면 나머지로 채운다. 각 무리 안에서는
  // 섞어서 매번 다른 문제가 나오게 한다.
  const wanted: SpeedCategory[] = ['person', 'place', 'time'];
  const preferred: ChoiceQuestion[] = [];
  const rest: ChoiceQuestion[] = [];
  for (const q of shuffled(choiceQuestions)) {
    (wanted.includes(categorize(q)) ? preferred : rest).push(q);
  }
  const picked = [...preferred, ...rest].slice(0, SPEED_QUIZ_SIZE);

  // O와 X를 절반씩 낸다. 한쪽으로 쏠리면 문제를 안 읽고 한 단추만 눌러도 맞는다
  // (예전 객관식에서 정답이 538개 중 531개가 1번이라 실제로 그랬다).
  const trueCount = Math.floor(picked.length / 2);
  const flags = shuffled([
    ...Array(trueCount).fill(true),
    ...Array(picked.length - trueCount).fill(false),
  ]) as boolean[];

  return picked.map((q, i) => {
    const answer = q.choices[q.correctIndex];
    const wrongChoices = q.choices.filter((_, idx) => idx !== q.correctIndex);
    // 오답 보기가 없는 문항은 참으로 낼 수밖에 없다.
    const isTrue = flags[i] || wrongChoices.length === 0;
    return {
      prompt: q.question,
      candidate: isTrue ? answer : wrongChoices[Math.floor(Math.random() * wrongChoices.length)],
      isTrue,
      answer,
      category: categorize(q),
    };
  });
}
