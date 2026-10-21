import { allWebtoons, READING_WEBTOON_LIST, webtoonImages } from '@/lib/readingHelper/webtoon';

/**
 * 말씀웹툰 책장 — 연재가 둘이고, 앞으로 더 는다.
 *
 * 전에는 「말씀웹툰」 한 칸이 곧 성경통독 웹툰이었다. 그런데 말씀 탭의 설명은
 * 「주일 설교를 그린 연재」였다 — 들어가면 통독 웹툰이 나오니 설명과 내용이
 * 어긋나 있었다(2026-10-21). 연재가 둘이라서 생긴 어긋남이라, 한 칸에 욱여넣지
 * 않고 **책장을 두 칸으로 가른다.**
 *
 * ── 연재마다 사는 곳이 다르다 ───────────────────────────────────────
 * 둘 다 워드프레스에 올라오지만 사이트도 글 종류도 다르다.
 *
 *   · 주일설교 웹툰 — sermon.dgaiworks.com 의 `sermon_comic`
 *   · 성경통독 웹툰 — biblestudy.dgaiworks.com 의 `reading_comic`
 *     (통독은 「몇 장을 다루는 화인가」를 따로 받아 와야 해서 전용 길이 있다)
 *
 * 그 차이를 **이 파일 안에서만** 안다. 화면은 `episodesOf(series)` 와
 * `episodeImages(series, id)` 둘만 쓴다 — 연재를 더할 때 화면을 고치지 않게.
 *
 * 연재를 더하려면: SERIES 에 한 줄 더하고, 아래 두 함수의 갈림에 그 연재를 넣는다.
 */

export type WebtoonSeriesKey = 'sermon' | 'reading';

export type WebtoonSeries = {
  key: WebtoonSeriesKey;
  title: string;
  /** 책장에서 한 줄로 보여 줄 설명 */
  description: string;
  emoji: string;
  /** 연재가 올라오는 자리. 앱이 못 받아 왔을 때 돌아갈 길로 쓴다. */
  site: string;
};

export const WEBTOON_SERIES: WebtoonSeries[] = [
  {
    key: 'sermon',
    title: '주일설교 웹툰',
    description: '그 주 설교를 목사님과 한 제자의 이야기로',
    emoji: '🎙️',
    site: 'https://sermon.dgaiworks.com/sermon-comics/',
  },
  {
    key: 'reading',
    title: '성경통독 웹툰',
    description: '통독 하루 분량을 한 화씩 그린 연재',
    emoji: '📖',
    site: READING_WEBTOON_LIST,
  },
];

export function seriesOf(key: string | undefined): WebtoonSeries | null {
  return WEBTOON_SERIES.find((s) => s.key === key) ?? null;
}

export type WebtoonEpisode = {
  id: number;
  title: string;
  /** 몇 화인지. 제목에서 집어내지 못하면 null — 그때는 번호를 안 적는다. */
  episode: number | null;
  /** 「2026-10-18」. 통독 웹툰은 날짜 대신 성경 순서로 서므로 null 이다. */
  date: string | null;
  thumb: string | null;
};

const SERMON_WP = 'https://sermon.dgaiworks.com/wp-json';

/** 「말씀 웹툰 4화 — …」에서 4를 집어낸다. 못 찾으면 null. */
function episodeNumber(title: string): number | null {
  const m = title.match(/(\d+)\s*화/);
  return m ? Number(m[1]) : null;
}

/** 워드프레스가 돌려주는 제목의 &#8211; 같은 글자를 사람이 읽는 글자로. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** 글 본문에서 그림 주소를 **적힌 차례대로** 꺼낸다. 웹툰은 차례가 곧 이야기다. */
function imagesIn(html: string): string[] {
  const out: string[] = [];
  const re = /<img[^>]+src="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

// 화면을 오갈 때마다 묻지 않게 잠깐 들고 있는다(설교 웹툰 쪽).
const TTL = 10 * 60 * 1000;
let sermonCache: { at: number; list: WebtoonEpisode[] } | null = null;

async function sermonEpisodes(): Promise<WebtoonEpisode[]> {
  if (sermonCache && Date.now() - sermonCache.at < TTL) return sermonCache.list;
  try {
    // 본문째 받아 와서 **첫 그림을 표지로** 쓴다. 대표 이미지를 따로 묻는 것보다
    // 한 번에 끝나고, 대표 이미지를 안 걸어 둔 화에도 표지가 생긴다.
    const res = await fetch(
      `${SERMON_WP}/wp/v2/sermon_comic?_fields=id,title,date,content&per_page=50&orderby=date&order=asc`,
    );
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as {
      id: number;
      title?: { rendered?: string };
      date?: string;
      content?: { rendered?: string };
    }[];
    const list = body.map((p) => {
      const title = decodeEntities(p.title?.rendered ?? '').trim();
      const imgs = imagesIn(p.content?.rendered ?? '');
      return {
        id: p.id,
        title,
        episode: episodeNumber(title),
        date: p.date ? p.date.slice(0, 10) : null,
        thumb: imgs[0] ?? null,
      };
    });
    sermonCache = { at: Date.now(), list };
    return list;
  } catch {
    // 웹툰은 덤이다 — 못 받아 와도 화면은 그대로 두고 다음에 다시 묻는다.
    return sermonCache?.list ?? [];
  }
}

async function sermonImages(id: number): Promise<string[]> {
  try {
    const res = await fetch(`${SERMON_WP}/wp/v2/sermon_comic/${id}?_fields=id,content`);
    if (!res.ok) return [];
    const body = (await res.json()) as { content?: { rendered?: string } };
    return imagesIn(body?.content?.rendered ?? '');
  } catch {
    return [];
  }
}

/** 그 연재의 화 전부. 앞 화부터 선다. */
export async function episodesOf(series: WebtoonSeriesKey): Promise<WebtoonEpisode[]> {
  if (series === 'sermon') return sermonEpisodes();
  const rows = await allWebtoons();
  return rows.map((w) => ({
    id: w.id,
    title: w.title,
    episode: w.episode,
    date: null,
    thumb: w.thumb,
  }));
}

/** 한 화의 그림들. 세로로 이어 붙인 띠라 차례가 곧 이야기다. */
export async function episodeImages(series: WebtoonSeriesKey, id: number): Promise<string[]> {
  return series === 'sermon' ? sermonImages(id) : webtoonImages(id);
}
