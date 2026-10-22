/**
 * 결단송 — 말씀광산이 워드프레스 「결단송」(sermon.dgaiworks.com)에 올린 곡들.
 *
 * 글 본문 맨 위 숨은 칸 `<div class="dg-song-data" data-song="{…}">` 에 유튜브 주소·표지·가사가
 * JSON 으로 들어 있다(말씀광산 src/lib/song-bible.ts). 새 곡을 올리면 앱을 고치지 않아도 맨 위에 보인다.
 *
 * **듣는 길은 유튜브 하나다(2026-10-22).** 전에는 호스팅에 올린 음원 파일을 앱 안
 * 플레이어로 틀었다. 같은 곡이 유튜브에도 올라가 있어 두 벌을 들고 있었고, 음원
 * 파일은 용량도 비용도 들었다. 유튜브 쪽만 남긴다 — 곡을 올리는 분도 한 군데만
 * 올리면 된다.
 *
 * 가사는 그대로 보여 준다. 다만 **어느 줄을 부르는지 밝히지는 않는다** — 그건
 * 음원의 재생 시각을 알아야 할 수 있는 일이고, 유튜브 안에서 흐르는 시각은
 * 바깥에서 볼 수 없다.
 */
export const SONGS_API = 'https://sermon.dgaiworks.com/wp-json/wp/v2/decision_song?per_page=50&_fields=id,title,link,content,date';

export type SongCue = { start: number; end: number; text: string };
export type DecisionSong = {
  id: number;
  title: string;
  link: string;
  date: string;
  /** 유튜브 주소. 이것이 없으면 들을 길이 없어 글 주소만 남긴다. */
  youtube: string | null;
  cover: string | null;
  /** 결단송 웹툰 뮤직비디오(유튜브) — 말씀광산이 올린 뒤에만 */
  mv: string | null;
  sermon: string;
  scripture: string | null;
  cues: SongCue[];
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#039': "'", apos: "'" };
function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => (ENTITIES['#' + d] ?? String.fromCodePoint(Number(d))))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n] ?? m);
}

type Raw = { id: number; title?: { rendered?: string }; link: string; date: string; content?: { rendered?: string } };

export function parseSong(r: Raw): DecisionSong | null {
  const html = r.content?.rendered ?? '';
  const m = html.match(/data-song="([^"]*)"/);
  if (!m) return null;
  try {
    const d = JSON.parse(decode(m[1])) as {
      audio?: string; cover?: string | null; youtube?: string | null; mv?: string | null; sermon?: string; scripture?: string | null; cues?: [number, number, string][];
    };
    return {
      id: r.id,
      title: decode(r.title?.rendered ?? '') || '결단송',
      link: r.link,
      date: r.date,
      cover: d.cover ?? null,
      youtube: d.youtube ?? null,
      mv: d.mv ?? null,
      sermon: d.sermon ?? '',
      scripture: d.scripture ?? null,
      cues: (d.cues ?? []).map(([start, end, text]) => ({ start, end, text })),
    };
  } catch {
    return null;
  }
}

export async function fetchDecisionSongs(): Promise<DecisionSong[]> {
  const res = await fetch(SONGS_API, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`결단송 목록을 불러오지 못했습니다(${res.status})`);
  const list = (await res.json()) as Raw[];
  return list.map(parseSong).filter((s): s is DecisionSong => !!s);
}
