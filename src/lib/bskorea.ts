/**
 * 대한성서공회 성경읽기로 보내는 주소를 만든다.
 *
 * 개역개정 본문을 앱에 담아 두는 것과, 성서공회 사이트로 보내 거기서 읽게 하는
 * 것은 전혀 다르다. 앞은 저작물을 복제해 배포하는 것이고, 뒤는 저작권자가 직접
 * 제공하는 자리로 안내하는 것뿐이다. 그래서 큐티 본문은 여기로 보낸다.
 *
 * 주소 형식은 2026-08-22에 실제 사이트에서 확인했다.
 *   https://www.bskorea.or.kr/bible/korbibReadpage.php?version=GAE&book=ezk&chap=9&sec=6
 * `version=GAE`가 개역개정, `book`은 아래 세 글자 코드, `sec`은 그 장에서
 * 화면이 맞춰 줄 절이다.
 */

const BASE = 'https://www.bskorea.or.kr/bible/korbibReadpage.php';

/** 개역개정 */
const VERSION = 'GAE';

/**
 * 성서공회의 66권 코드. 사이트의 선택 상자에서 그대로 받아 적었다.
 *
 * 우리 DB의 book_id(창세기 1 … 요한계시록 66) 순서와 같다. 이름으로 맞추면
 * 「요한1서」·「요한일서」처럼 표기가 갈릴 때 조용히 어긋나므로 번호로 맞춘다.
 */
const BOOK_CODES = [
  'gen', 'exo', 'lev', 'num', 'deu', 'jos', 'jdg', 'rut', '1sa', '2sa',
  '1ki', '2ki', '1ch', '2ch', 'ezr', 'neh', 'est', 'job', 'psa', 'pro',
  'ecc', 'sng', 'isa', 'jer', 'lam', 'ezk', 'dan', 'hos', 'jol', 'amo',
  'oba', 'jnh', 'mic', 'nam', 'hab', 'zep', 'hag', 'zec', 'mal', 'mat',
  'mrk', 'luk', 'jhn', 'act', 'rom', '1co', '2co', 'gal', 'eph', 'php',
  'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm', 'heb', 'jas', '1pe',
  '2pe', '1jn', '2jn', '3jn', 'jud', 'rev',
];

/**
 * 이 본문을 성서공회에서 여는 주소.
 *
 * 모르는 book_id면 null을 돌려준다 — 엉뚱한 곳으로 보내느니 단추를 안 보이는
 * 편이 낫다.
 */
export function bskoreaReadUrl(bookId: number, chapter: number, startVerse: number): string | null {
  const code = BOOK_CODES[bookId - 1];
  if (!code) return null;
  return `${BASE}?version=${VERSION}&book=${code}&chap=${chapter}&sec=${Math.max(1, startVerse)}`;
}

/**
 * ESV(Crossway)를 esv.org 에서 연다.
 *
 * ESV 본문은 Crossway 저작물이라 앱에 담지 않는다. 대신 출판사가 직접 공개한
 * 자리로 보낸다 — 성서공회와 같은 방식이다.
 *
 * 주소 형식은 2026-08-22에 확인했다.
 *   https://www.esv.org/Ezekiel+9:6/   ·   .../1+Samuel+1:1/   ·   .../Psalms+23:1/
 * 우리 DB 의 `books.name_en`("1 Samuel", "Psalms")이 그대로 통한다.
 */
export function esvReadUrl(bookNameEn: string, chapter: number, startVerse: number): string | null {
  const name = bookNameEn.trim();
  if (!name) return null;
  const ref = `${name} ${chapter}:${Math.max(1, startVerse)}`;
  return `https://www.esv.org/${encodeURIComponent(ref).replace(/%20/g, '+')}/`;
}

/**
 * BibleGateway 로 보낸다 — NIV·현대인의 성경처럼 그 사이트가 공개한 역본.
 *
 * BibleGateway 는 NIV 판권을 가진 Zondervan 계열이 운영한다. 본문을 우리가
 * 복제하지 않고 그 자리로 안내만 하므로 성서공회·esv.org 와 같은 방식이다.
 *
 * 주소 형식은 2026-08-22에 확인했다.
 *   https://www.biblegateway.com/passage/?search=Ezekiel%209:6&version=NIV
 * 책 이름은 영어(books.name_en)를 쓴다. 한글 역본(KLB)이라도 검색어는 영어여야
 * 한다 — 사이트가 영어 책 이름으로 찾는다.
 */
export function bibleGatewayUrl(
  bookNameEn: string,
  chapter: number,
  startVerse: number,
  version: string,
): string | null {
  const name = bookNameEn.trim();
  if (!name) return null;
  const ref = `${name} ${chapter}:${Math.max(1, startVerse)}`;
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=${version}`;
}

/** 링크로만 보는 역본이 어디로 가는지 한 곳에 모은다. */
export const LINK_SOURCE_LABEL: Record<string, string> = {
  krv: '대한성서공회',
  klb: 'Bible Gateway',
  koerv: 'Bible Gateway',
  esv: 'ESV.org',
  niv: 'Bible Gateway',
};

/**
 * 이 역본을 바깥에서 여는 주소.
 *
 * 화면마다 if 를 늘어놓으면 역본을 더할 때 빠뜨리는 곳이 생긴다. 여기 한 곳만
 * 고치면 큐티·성경읽기·통독이 함께 따라온다.
 */
export function externalReadUrl(
  translation: string,
  bookId: number,
  bookNameEn: string,
  chapter: number,
  startVerse: number,
): string | null {
  if (translation === 'krv') return bskoreaReadUrl(bookId, chapter, startVerse);
  if (translation === 'esv') return esvReadUrl(bookNameEn, chapter, startVerse);
  if (translation === 'niv') return bibleGatewayUrl(bookNameEn, chapter, startVerse, 'NIV');
  if (translation === 'klb') return bibleGatewayUrl(bookNameEn, chapter, startVerse, 'KLB');
  if (translation === 'koerv') return bibleGatewayUrl(bookNameEn, chapter, startVerse, 'KOERV');
  return null;
}
