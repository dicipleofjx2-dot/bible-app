import { BIBLE_BOOKS } from './bibleBooks';
import type { PlanChapterEntry } from './readingPlan';

/**
 * 성경통독 웹툰(2026-10-02) — 말씀광산 앱이 통독 하루 분량만큼 한 화씩 그려
 * 워드프레스(sermon.dgaiworks.com 「통독 웹툰」)에 연재한다. 앱은 링크만 건다.
 *
 * 화마다 다루는 장이 **성경 전체 장 번호**(창세기 1장 = 1 … 요한계시록 22장 = 1189)로
 * 적혀 온다. 하루 분량이 책 경계를 넘을 때가 있어서다(창세기 50장 + 출애굽기 1~2장).
 *
 * 그날 읽는 장과 **겹치는 화를 다** 고른다. 웹툰은 7/29 시작 기준으로 나눴는데,
 * 다른 날 시작한 사람은 하루 분량이 두 화에 걸칠 수 있다 — 하나만 주면 반쪽만 본다.
 *
 * 짝: 말씀광산 `src/lib/reading-plan.ts`(같은 장 번호), 플러그인 `GET /dgcb/v1/reading-comics`.
 */

export const READING_WEBTOON_LIST = 'https://sermon.dgaiworks.com/reading-comics/';
const API = 'https://sermon.dgaiworks.com/wp-json/dgcb/v1/reading-comics';

export type ReadingWebtoon = {
  id: number;
  title: string;
  link: string;
  from: number;
  to: number;
  episode: number;
  thumb: string | null;
};

const BOOK_START: number[] = (() => {
  const out: number[] = [];
  let acc = 0;
  for (const b of BIBLE_BOOKS) {
    out[b.id] = acc;
    acc += b.chapters;
  }
  return out;
})();

/** 성경 전체 장 번호 — 창세기 1장 = 1 */
export function globalChapter(bookId: number, chapter: number): number {
  return (BOOK_START[bookId] ?? 0) + chapter;
}

// 화면을 오갈 때마다 묻지 않게 잠깐 들고 있는다. 새 화가 올라와도 10분 안에는 보인다.
const TTL = 10 * 60 * 1000;
let cached: { at: number; list: ReadingWebtoon[] } | null = null;
let inflight: Promise<ReadingWebtoon[]> | null = null;

async function fetchList(): Promise<ReadingWebtoon[]> {
  if (cached && Date.now() - cached.at < TTL) return cached.list;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as unknown;
      const list = Array.isArray(body)
        ? (body as ReadingWebtoon[]).filter((w) => w && typeof w.link === 'string' && w.from > 0 && w.to >= w.from)
        : [];
      cached = { at: Date.now(), list };
      return list;
    } catch {
      // 웹툰은 덤이다 — 못 받아 와도 통독 화면은 그대로 둔다. 다음에 다시 묻는다.
      return cached?.list ?? [];
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** 그날 읽는 장과 겹치는 화(성경 순서). 없으면 빈 배열. */
export async function webtoonsForChapters(chapters: PlanChapterEntry[]): Promise<ReadingWebtoon[]> {
  if (chapters.length === 0) return [];
  const idx = chapters.map((c) => globalChapter(c.bookId, c.chapter));
  const lo = Math.min(...idx);
  const hi = Math.max(...idx);
  const list = await fetchList();
  return list.filter((w) => w.from <= hi && w.to >= lo).sort((a, b) => a.from - b.from);
}
