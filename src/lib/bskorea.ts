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
