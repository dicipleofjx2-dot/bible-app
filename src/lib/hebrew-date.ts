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

/** Today's date on the Hebrew calendar, computed in Korea Standard Time. */
export function getHebrewDateKST(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-u-ca-hebrew', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  }).formatToParts(date);

  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';

  return `${year}년 ${HEBREW_MONTH_KO[month] ?? month} ${day}일`;
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
