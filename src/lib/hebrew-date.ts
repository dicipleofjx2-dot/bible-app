// Hebrew calendar month names, as returned by Intl's `en-u-ca-hebrew`
// calendar (no Korean locale data exists for these, so we transliterate
// ourselves). Adar I/II only appear in Hebrew leap years.
const HEBREW_MONTH_KO: Record<string, string> = {
  Tishri: '티슈리월',
  Heshvan: '헤슈반월',
  Kislev: '키슬레브월',
  Tevet: '테벳월',
  Shevat: '스밧월',
  Adar: '아달월',
  'Adar I': '아달월(1)',
  'Adar II': '아달월(2)',
  Nisan: '니산월',
  Iyar: '이야르월',
  Sivan: '시완월',
  Tamuz: '담무즈월',
  Av: '아브월',
  Elul: '엘룰월',
};

// 달력 한 면이 42칸이고 칸마다 여러 번 부르게 되므로 포맷터를 한 번만 만든다
// (Intl.DateTimeFormat 생성이 formatToParts 자체보다 훨씬 비싸다).
let hebrewFormatter: Intl.DateTimeFormat | null = null;

function getRawParts(date: Date) {
  hebrewFormatter ??= new Intl.DateTimeFormat('en-u-ca-hebrew', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  });
  const parts = hebrewFormatter.formatToParts(date);

  return {
    day: parts.find((p) => p.type === 'day')?.value ?? '',
    month: parts.find((p) => p.type === 'month')?.value ?? '',
    year: parts.find((p) => p.type === 'year')?.value ?? '',
  };
}

function getHebrewParts(date: Date) {
  const { day, month, year } = getRawParts(date);
  return { day, month: HEBREW_MONTH_KO[month] ?? month, year };
}

/**
 * 사건 표에서 쓰는 정규화된 월 키. 윤년의 'Adar II' 는 평년 'Adar' 로 합친다 —
 * 부림절과 아달월의 사건들은 윤년에 뒤쪽 아달에서 지키기 때문이다. 윤달인
 * 'Adar I' 만 'AdarI' 로 따로 둔다.
 */
function normalizeMonthKey(month: string): string {
  if (month === 'Adar II') return 'Adar';
  if (month === 'Adar I') return 'AdarI';
  return month;
}

export type HebrewFields = {
  /** 사건 표 조회용 영문 월 키 (예: 'Nisan', 'Adar', 'AdarI'). */
  monthKey: string;
  /** 화면에 쓰는 한글 월 이름 (예: '니산월'). */
  monthKo: string;
  day: number;
  year: number;
};

/** 히브리력 월·일을 숫자로 뽑는다. 한국 시간 자정 기준. */
export function getHebrewFields(date: Date = new Date()): HebrewFields {
  const { day, month, year } = getRawParts(date);
  return {
    monthKey: normalizeMonthKey(month),
    monthKo: HEBREW_MONTH_KO[month] ?? month,
    day: Number(day),
    year: Number(year),
  };
}

/** Today's date on the Hebrew calendar, computed in Korea Standard Time. */
export function getHebrewDateKST(date: Date = new Date()): string {
  const { day, month, year } = getHebrewParts(date);
  return `${year}년 ${month} ${day}일`;
}

/** Compact "월 일" form for calendar day cells, e.g. "니산월 12". */
export function getHebrewDayLabelKST(date: Date = new Date()): string {
  const { day, month } = getHebrewParts(date);
  return `${month.replace('월', '')} ${day}`;
}

/** Today's Gregorian date in Korea Standard Time, e.g. "2026년 7월 14일". */
export function getKoreanDateKST(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  }).format(date);
}

/** Today's date for display: Korean calendar first, Hebrew calendar in parentheses. */
export function getTodayLabelKST(date: Date = new Date()): string {
  return `${getKoreanDateKST(date)} (${getHebrewDateKST(date)})`;
}
