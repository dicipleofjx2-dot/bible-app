// 토라포션(파라샤) — 그 주 안식일에 회당에서 읽는 모세오경 범위.
//
// ── 일정은 왜 표로 굳혀 두나 ────────────────────────────────────────
// 어느 안식일에 어느 파라샤를 읽는지는 히브리력 해의 모양(로쉬 하샤나 요일·
// 윤년 여부·그 해의 길이)에 따라 갈리고, 두 편을 붙여 읽는 주도 해마다 다르다.
// 손으로 짜면 몇 해에 한 번씩 조용히 어긋나므로 @hebcal/core 로 미리 계산해
// `src/data/torah-portions.json` 에 굳혔다(2015–2045년, 안식일 1,545일).
// 다시 만들려면 `node scripts/build-torah-portions.mjs`.
// 계산기는 **앱에 안 싣는다** — devDependency 로만 두고 앱은 json 만 읽는다.
//
// ── 절 번호는 개역개정 기준이다 ─────────────────────────────────────
// 히브리어 성경과 개역개정은 몇 군데에서 절을 나누는 자리가 다르다. 유대력
// 자료에 적힌 번호를 그대로 옮기면 앱에서 그 절을 펴 봤을 때 엉뚱한 데가
// 나온다. 그래서 **개역개정 번호로 적고**, 다른 곳에는 히브리어 번호를
// `hebrewNote` 에 함께 남겼다. 실제로 어긋나는 편은 아홉이다
// (바예체·바이슐라흐·이트로·바이크라·차브·피느하스·마토트·키 타보·니차빔).
//
// 이 번호가 맞는지는 **실제 성경 파일로 잰다** — `scripts/check-torah-portions.mjs`
// 가 54편이 창세기 1:1부터 신명기 34:12까지 빈틈없이 잇는지 bible.db 의 krv 절
// 수로 확인한다. 히브리어 번호를 잘못 옮기면 반드시 그 자리에서 틈이 벌어진다.

import parashot from '@/data/parashot.json';
import schedule from '@/data/torah-portions.json';

/** 모세오경 다섯 권. 번호는 성경 책 번호(창세기 1 … 신명기 5)와 같다. */
const BOOK_KO = ['창세기', '출애굽기', '레위기', '민수기', '신명기'];

export type Parasha = {
  /** 영문 이름. hebcal 이 쓰는 철자와 같아야 한다(일정표의 번호가 이 순서다). */
  en: string;
  /** 한글 음역. */
  ko: string;
  /** 이름의 뜻 — 그 편의 첫 낱말이다. */
  meaning: string;
  /** 1=창세기 … 5=신명기 */
  book: number;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  /** 히브리어 성경의 절 번호가 다를 때만. */
  hebrewNote?: string;
};

/**
 * 54편. **순서를 바꾸면 안 된다** — 일정표(json)가 이 자리 번호를 쓴다.
 * 53번(브조트 하브라카)은 안식일이 아니라 심핫 토라에 읽는다.
 *
 * 표 자체는 `src/data/parashot.json` 에 있다. 앱과 검사 스크립트
 * (`scripts/check-torah-portions.mjs`)가 **같은 파일 하나**를 봐야 하기 때문이다 —
 * 코드 안에 적어 두면 검사가 소스를 정규식으로 뜯어 읽어야 하고, 그러면 검사가
 * 지켜 주는 것이 없어진다.
 */
export const PARASHOT: Parasha[] = parashot as Parasha[];

const SCHEDULE = schedule as Record<string, number[]>;

export type TorahPortionOfWeek = {
  /** 그 주 안식일(토요일)의 날짜. YYYY-MM-DD */
  shabbat: string;
  /** 한 주에 두 편을 붙여 읽는 주가 있다. */
  parts: Parasha[];
  /** "니차빔 · 바옐레크" 처럼 이어 붙인 이름. */
  name: string;
  /** "신명기 29:8–31:30" — 붙여 읽는 주는 앞 편 시작부터 뒤 편 끝까지. */
  range: string;
  /** 심핫 토라에 읽는 브조트 하브라카인가(안식일이 아니다). */
  isSimchatTorah: boolean;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatRange(parts: Parasha[]): string {
  const first = parts[0];
  const last = parts[parts.length - 1];
  const book = BOOK_KO[first.book - 1] ?? '';
  const start = `${first.startChapter}:${first.startVerse}`;
  const end =
    last.endChapter === first.startChapter
      ? `${last.endVerse}`
      : `${last.endChapter}:${last.endVerse}`;
  return `${book} ${start}–${end}`;
}

function build(dateKey: string, indexes: number[]): TorahPortionOfWeek {
  const parts = indexes.map((i) => PARASHOT[i]).filter(Boolean);
  return {
    shabbat: dateKey,
    parts,
    name: parts.map((p) => p.ko).join(' · '),
    range: formatRange(parts),
    isSimchatTorah: parts.length === 1 && parts[0].en === "V'Zot HaBerachah",
  };
}

/** 그 날짜에 바로 읽는 토라포션. 안식일(또는 심핫 토라)이 아니면 null. */
export function getPortionOnDate(date: Date): TorahPortionOfWeek | null {
  const key = toKey(date);
  const idx = SCHEDULE[key];
  return idx ? build(key, idx) : null;
}

/**
 * 그 주에 읽는 토라포션.
 *
 * 유대력의 한 주는 **일요일에 시작해 안식일에 끝난다.** 그래서 어느 날을
 * 눌러도 그 주의 **다가오는 토요일**을 본다 — 수요일에 달력을 열어 "이번 주에
 * 무엇을 읽나"를 물으면 지난 토요일이 아니라 이번 토요일이 답이다.
 */
export function getPortionOfWeek(date: Date): TorahPortionOfWeek | null {
  const shabbat = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  shabbat.setDate(shabbat.getDate() + ((6 - shabbat.getDay() + 7) % 7));

  // 절기와 겹친 안식일에는 파라샤 대신 절기 독서를 한다 — 그 주는 비워 둔다.
  // (심핫 토라처럼 안식일이 아닌 날에 읽는 것은 `getPortionOnDate` 가 잡는다.
  //  둘을 한 함수에 욱여넣으면 "이번 주"와 "오늘"이 뒤섞여 화면이 거짓말한다.)
  return getPortionOnDate(shabbat);
}
