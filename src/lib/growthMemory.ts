/**
 * 데이빗스톤 성장ON — 점심 전 암송(월~금).
 *
 * 열두 주를 세 주제로 돈다: 성경(1~4주) · 구원(5~8주) · 기도(9~12주).
 * 월~목은 새 구절 하나, **금요일은 그 주 네 구절을 다 외우는 복습**이다.
 * 열두 주를 마치면 1주차로 돌아간다.
 *
 * 본문은 개역한글이다. 앱 DB 의 `ko_ko` 는 스물세 권에서 절이 어긋나 있어
 * (예: 시 119:105 자리에 119:28 이 들어 있다) 읽어 오지 않고 **여기에 직접
 * 적었다.** 화면이 성경 저장소를 기다리지 않아도 된다.
 *
 * 화면·저장과 섞지 않은 순수 함수만 둔다 — 노드로 바로 검사하려고.
 */

export type MemoryVerse = { ref: string; text: string };
export type MemoryWeek = { theme: '성경' | '구원' | '기도'; title: string; verses: MemoryVerse[] };

export const MEMORY_WEEKS: MemoryWeek[] = [
  {
    theme: '성경',
    title: '하나님의 감동으로 된 말씀',
    verses: [
      { ref: '디모데후서 3:16', text: '모든 성경은 하나님의 감동으로 된 것으로 교훈과 책망과 바르게 함과 의로 교육하기에 유익하니' },
      { ref: '디모데후서 3:17', text: '이는 하나님의 사람으로 온전케 하며 모든 선한 일을 행하기에 온전케 하려 함이니라' },
      { ref: '히브리서 4:12', text: '하나님의 말씀은 살았고 운동력이 있어 좌우에 날선 어떤 검보다도 예리하여 혼과 영과 및 관절과 골수를 찔러 쪼개기까지 하며 또 마음의 생각과 뜻을 감찰하나니' },
      { ref: '이사야 40:8', text: '풀은 마르고 꽃은 시드나 우리 하나님의 말씀은 영영히 서리라 하라' },
    ],
  },
  {
    theme: '성경',
    title: '내 발의 등, 내 길의 빛',
    verses: [
      { ref: '시편 119:105', text: '주의 말씀은 내 발에 등이요 내 길에 빛이니이다' },
      { ref: '시편 119:9', text: '청년이 무엇으로 그 행실을 깨끗케 하리이까 주의 말씀을 따라 삼갈 것이니이다' },
      { ref: '시편 119:11', text: '내가 주께 범죄치 아니하려 하여 주의 말씀을 내 마음에 두었나이다' },
      { ref: '여호수아 1:8', text: '이 율법책을 네 입에서 떠나지 말게 하며 주야로 그것을 묵상하여 그 가운데 기록한대로 다 지켜 행하라 그리하면 네 길이 평탄하게 될 것이라 네가 형통하리라' },
    ],
  },
  {
    theme: '성경',
    title: '듣고 행하는 사람',
    verses: [
      { ref: '야고보서 1:22', text: '너희는 도를 행하는 자가 되고 듣기만 하여 자신을 속이는 자가 되지 말라' },
      { ref: '마태복음 4:4', text: '예수께서 대답하여 가라사대 기록되었으되 사람이 떡으로만 살것이 아니요 하나님의 입으로 나오는 모든 말씀으로 살 것이라 하였느니라 하시니' },
      { ref: '로마서 10:17', text: '그러므로 믿음은 들음에서 나며 들음은 그리스도의 말씀으로 말미암았느니라' },
      { ref: '요한복음 5:39', text: '너희가 성경에서 영생을 얻는 줄 생각하고 성경을 상고하거니와 이 성경이 곧 내게 대하여 증거하는 것이로다' },
    ],
  },
  {
    theme: '성경',
    title: '말씀을 즐거워하는 사람',
    verses: [
      { ref: '시편 1:1', text: '복있는 사람은 악인의 꾀를 좇지 아니하며 죄인의 길에 서지 아니하며 오만한 자의 자리에 앉지 아니하고' },
      { ref: '시편 1:2', text: '오직 여호와의 율법을 즐거워하여 그 율법을 주야로 묵상하는 자로다' },
      { ref: '시편 1:3', text: '저는 시냇가에 심은 나무가 시절을 좇아 과실을 맺으며 그 잎사귀가 마르지 아니함 같으니 그 행사가 다 형통하리로다' },
      { ref: '마태복음 24:35', text: '천지는 없어지겠으나 내 말은 없어지지 아니하리라' },
    ],
  },
  {
    theme: '구원',
    title: '모든 사람이 죄를 범하였으매',
    verses: [
      { ref: '로마서 3:23', text: '모든 사람이 죄를 범하였으매 하나님의 영광에 이르지 못하더니' },
      { ref: '로마서 6:23', text: '죄의 삯은 사망이요 하나님의 은사는 그리스도 예수 우리 주 안에 있는 영생이니라' },
      { ref: '이사야 53:6', text: '우리는 다 양 같아서 그릇 행하며 각기 제 길로 갔거늘 여호와께서는 우리 무리의 죄악을 그에게 담당시키셨도다' },
      { ref: '로마서 5:8', text: '우리가 아직 죄인 되었을 때에 그리스도께서 우리를 위하여 죽으심으로 하나님께서 우리에게 대한 자기의 사랑을 확증하셨느니라' },
    ],
  },
  {
    theme: '구원',
    title: '길이요 진리요 생명이신 예수님',
    verses: [
      { ref: '요한복음 3:16', text: '하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 저를 믿는 자마다 멸망치 않고 영생을 얻게 하려 하심이니라' },
      { ref: '요한복음 14:6', text: '예수께서 가라사대 내가 곧 길이요 진리요 생명이니 나로 말미암지 않고는 아버지께로 올 자가 없느니라' },
      { ref: '사도행전 4:12', text: '다른 이로서는 구원을 얻을 수 없나니 천하 인간에 구원을 얻을 만한 다른 이름을 우리에게 주신 일이 없음이니라' },
      { ref: '요한복음 1:12', text: '영접하는 자 곧 그 이름을 믿는 자들에게는 하나님의 자녀가 되는 권세를 주셨으니' },
    ],
  },
  {
    theme: '구원',
    title: '은혜로 믿음으로',
    verses: [
      { ref: '에베소서 2:8', text: '너희가 그 은혜를 인하여 믿음으로 말미암아 구원을 얻었나니 이것이 너희에게서 난 것이 아니요 하나님의 선물이라' },
      { ref: '에베소서 2:9', text: '행위에서 난 것이 아니니 이는 누구든지 자랑치 못하게 함이니라' },
      { ref: '로마서 10:9', text: '네가 만일 네 입으로 예수를 주로 시인하며 또 하나님께서 그를 죽은 자 가운데서 살리신 것을 네 마음에 믿으면 구원을 얻으리니' },
      { ref: '로마서 10:10', text: '사람이 마음으로 믿어 의에 이르고 입으로 시인하여 구원에 이르느니라' },
    ],
  },
  {
    theme: '구원',
    title: '영생의 확신과 새 생명',
    verses: [
      { ref: '요한일서 5:11', text: '또 증거는 이것이니 하나님이 우리에게 영생을 주신 것과 이 생명이 그의 아들 안에 있는 그것이니라' },
      { ref: '요한일서 5:12', text: '아들이 있는 자에게는 생명이 있고 하나님의 아들이 없는 자에게는 생명이 없느니라' },
      { ref: '요한복음 5:24', text: '내가 진실로 진실로 너희에게 이르노니 내 말을 듣고 또 나 보내신 이를 믿는 자는 영생을 얻었고 심판에 이르지 아니하나니 사망에서 생명으로 옮겼느니라' },
      { ref: '고린도후서 5:17', text: '그런즉 누구든지 그리스도 안에 있으면 새로운 피조물이라 이전 것은 지나갔으니 보라 새것이 되었도다' },
    ],
  },
  {
    theme: '기도',
    title: '부르짖으면 응답하신다',
    verses: [
      { ref: '예레미야 33:3', text: '너는 내게 부르짖으라 내가 네게 응답하겠고 네가 알지 못하는 크고 비밀한 일을 네게 보이리라' },
      { ref: '마태복음 7:7', text: '구하라 그러면 너희에게 주실 것이요 찾으라 그러면 찾을 것이요 문을 두드리라 그러면 너희에게 열릴 것이니' },
      { ref: '요한복음 14:13', text: '너희가 내 이름으로 무엇을 구하든지 내가 시행하리니 이는 아버지로 하여금 아들을 인하여 영광을 얻으시게 하려 함이라' },
      { ref: '요한일서 5:14', text: '그를 향하여 우리의 가진 바 담대한 것이 이것이니 그의 뜻대로 무엇을 구하면 들으심이라' },
    ],
  },
  {
    theme: '기도',
    title: '쉬지 말고 기도하라',
    verses: [
      { ref: '데살로니가전서 5:16', text: '항상 기뻐하라' },
      { ref: '데살로니가전서 5:17', text: '쉬지 말고 기도하라' },
      { ref: '데살로니가전서 5:18', text: '범사에 감사하라 이는 그리스도 예수 안에서 너희를 향하신 하나님의 뜻이니라' },
      { ref: '빌립보서 4:6', text: '아무 것도 염려하지 말고 오직 모든 일에 기도와 간구로 너희 구할 것을 감사함으로 하나님께 아뢰라' },
    ],
  },
  {
    theme: '기도',
    title: '은혜의 보좌 앞으로',
    verses: [
      { ref: '마태복음 6:6', text: '너는 기도할 때에 네 골방에 들어가 문을 닫고 은밀한 중에 계신 네 아버지께 기도하라 은밀한 중에 보시는 네 아버지께서 갚으시리라' },
      { ref: '야고보서 5:16', text: '이러므로 너희 죄를 서로 고하며 병 낫기를 위하여 서로 기도하라 의인의 간구는 역사하는 힘이 많으니라' },
      { ref: '시편 145:18', text: '여호와께서는 자기에게 간구하는 모든 자 곧 진실하게 간구하는 모든 자에게 가까이 하시는도다' },
      { ref: '히브리서 4:16', text: '그러므로 우리가 긍휼하심을 받고 때를 따라 돕는 은혜를 얻기 위하여 은혜의 보좌 앞에 담대히 나아갈 것이니라' },
    ],
  },
  {
    theme: '기도',
    title: '주님이 가르쳐 주신 기도',
    verses: [
      { ref: '마태복음 6:9', text: '그러므로 너희는 이렇게 기도하라 하늘에 계신 우리 아버지여 이름이 거룩히 여김을 받으시오며' },
      { ref: '마태복음 6:10', text: '나라이 임하옵시며 뜻이 하늘에서 이룬 것같이 땅에서도 이루어지이다' },
      { ref: '마태복음 6:11', text: '오늘날 우리에게 일용할 양식을 주옵시고' },
      {
        ref: '마태복음 6:12-13',
        text: '우리가 우리에게 죄 지은 자를 사하여 준 것 같이 우리 죄를 사하여 주옵시고 우리를 시험에 들게 하지 마옵시고 다만 악에서 구하옵소서 (나라와 권세와 영광이 아버지께 영원히 있사옵나이다 아멘)',
      },
    ],
  },
];

export const MEMORY_DAY_LABELS = ['월', '화', '수', '목', '금'] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toIso(toUtc(iso) + days * DAY_MS);
}

/** 그 날이 든 주의 월요일('YYYY-MM-DD'). 날짜는 이미 서울 기준이어야 한다. */
export function mondayOf(iso: string): string {
  const dow = new Date(toUtc(iso)).getUTCDay(); // 0=일
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}

/** 1=월 … 5=금, 주말은 null. */
export function weekdayOf(iso: string): number | null {
  const dow = new Date(toUtc(iso)).getUTCDay();
  return dow >= 1 && dow <= 5 ? dow : null;
}

/** 이번 주가 몇 번째 주인가(0부터). 시작일 전이어도 거꾸로 돌려 늘 0~11 이다. */
export function weekIndex(start: string, iso: string): number {
  const n = MEMORY_WEEKS.length;
  const diff = Math.round((toUtc(mondayOf(iso)) - toUtc(mondayOf(start))) / (7 * DAY_MS));
  return ((diff % n) + n) % n;
}

/** 「이번 주를 N주차로」 — 그렇게 되는 시작일(월요일). */
export function startForWeek(today: string, weekNo: number): string {
  return addDays(mondayOf(today), -(weekNo - 1) * 7);
}

export type MemoryDayPlan = {
  date: string;
  weekNo: number; // 1~12
  week: MemoryWeek;
  day: number; // 1~5
  isReview: boolean;
  verses: MemoryVerse[];
  /** 저장할 때 같이 남기는 열쇠 — 편성이 바뀌어도 그날 무엇을 외웠는지 남는다. */
  key: string;
};

/** 평일 하루의 계획. 주말이면 null. */
export function dayPlan(start: string, iso: string): MemoryDayPlan | null {
  const day = weekdayOf(iso);
  if (!day) return null;
  const idx = weekIndex(start, iso);
  const week = MEMORY_WEEKS[idx];
  const isReview = day === 5;
  return {
    date: iso,
    weekNo: idx + 1,
    week,
    day,
    isReview,
    verses: isReview ? week.verses : [week.verses[day - 1]],
    key: `w${idx + 1}-${isReview ? 'review' : `d${day}`}`,
  };
}

/** 그 주 월~금 날짜. */
export function weekDates(iso: string): string[] {
  const mon = mondayOf(iso);
  return [0, 1, 2, 3, 4].map((i) => addDays(mon, i));
}

export type MemoryStatus = 'passed' | 'retry';
export type MemoryCheckLike = { student_id: string; on_date: string; status: MemoryStatus; tries: number };

/** 그날 통과 몇 명 / 다시 도전 중 몇 명. 기록 없는 학생은 「아직」이다. */
export function memoryDaySummary(
  studentIds: string[],
  checks: MemoryCheckLike[],
  date: string,
): { passed: number; retry: number; pending: number; total: number } {
  const ids = new Set(studentIds);
  const day = checks.filter((c) => c.on_date === date && ids.has(c.student_id));
  const passed = day.filter((c) => c.status === 'passed').length;
  const retry = day.filter((c) => c.status === 'retry').length;
  return { passed, retry, pending: studentIds.length - passed - retry, total: studentIds.length };
}
