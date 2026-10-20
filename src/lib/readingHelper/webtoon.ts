import { BIBLE_BOOKS } from './bibleBooks';
import type { PlanChapterEntry } from './readingPlan';

/**
 * 성경통독 웹툰(2026-10-02) — 말씀광산 앱이 통독 하루 분량만큼 한 화씩 그려
 * 워드프레스(biblestudy.dgaiworks.com 「통독 웹툰」)에 연재한다. 앱은 링크만 건다.
 *
 * 화마다 다루는 장이 **성경 전체 장 번호**(창세기 1장 = 1 … 요한계시록 22장 = 1189)로
 * 적혀 온다. 하루 분량이 책 경계를 넘을 때가 있어서다(창세기 50장 + 출애굽기 1~2장).
 *
 * 그날 읽는 장과 **겹치는 화를 다** 고른다. 웹툰은 7/29 시작 기준으로 나눴는데,
 * 다른 날 시작한 사람은 하루 분량이 두 화에 걸칠 수 있다 — 하나만 주면 반쪽만 본다.
 *
 * 짝: 말씀광산 `src/lib/reading-plan.ts`(같은 장 번호), 플러그인 `GET /dgcb/v1/reading-comics`.
 */

// 2026-10-14 통독 웹툰을 설교 사이트(sermon.dgaiworks.com)에서 「성경연구」 사이트로 옮겼다.
// 옛 주소의 5화는 그대로 남아 있고, 말씀광산이 한동안 양쪽에 같이 올린다.
export const READING_WEBTOON_LIST = 'https://biblestudy.dgaiworks.com/reading-comics/';
const WP = 'https://biblestudy.dgaiworks.com/wp-json';
const API = `${WP}/dgcb/v1/reading-comics`;

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

/** 올라온 화 전부(성경 순서). 웹툰 책장이 쓴다. */
export async function allWebtoons(): Promise<ReadingWebtoon[]> {
  const list = await fetchList();
  return [...list].sort((a, b) => a.from - b.from);
}

/**
 * 한 화의 그림들.
 *
 * 워드프레스 글 본문에서 `<img src>` 를 **적힌 차례대로** 꺼낸다. 웹툰은 세로로
 * 길게 이어 붙인 띠라 차례가 곧 이야기다.
 *
 * 왜 사이트를 열지 않고 그림만 가져오는가 — 앱 안에서 전자책처럼 넘겨 보시게
 * 하려는 것이다. 바깥 창으로 보내면 글꼴도 머리말도 그 사이트 것이고, 돌아오는
 * 길도 사용자가 찾아야 한다.
 *
 * 그림은 이 교회의 Supabase 저장소(wordmine-share)에 있다 — 워드프레스가 올릴 때
 * 거기에 둔다. 그래서 주소가 바뀌어도 그림은 그대로다.
 */
export async function webtoonImages(id: number): Promise<string[]> {
  try {
    const res = await fetch(`${WP}/wp/v2/reading_comic/${id}?_fields=id,content`);
    if (!res.ok) return [];
    const body = (await res.json()) as { content?: { rendered?: string } };
    const html = body?.content?.rendered ?? '';
    const out: string[] = [];
    // 정규식으로 긁는다. 한 가지 틀로 찍어 내는 글이라 파서를 들일 일이 아니다.
    const re = /<img[^>]+src="([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) out.push(m[1]);
    return out;
  } catch {
    return [];
  }
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
