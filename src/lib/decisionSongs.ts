/**
 * 결단송 플레이리스트 — 말씀광산이 워드프레스 「결단송」(sermon.dgaiworks.com)에 올린 곡들.
 *
 * 글 본문 맨 위 숨은 칸 `<div class="dg-song-data" data-song="{…}">` 에 음원·표지·가사 시간표가
 * JSON 으로 들어 있다(말씀광산 src/lib/song-bible.ts). 새 곡을 올리면 앱을 고치지 않아도 맨 위에 보인다.
 */
export const SONGS_API = 'https://sermon.dgaiworks.com/wp-json/wp/v2/decision_song?per_page=50&_fields=id,title,link,content,date';

export type SongCue = { start: number; end: number; text: string };
export type DecisionSong = {
  id: number;
  title: string;
  link: string;
  date: string;
  audio: string;
  cover: string | null;
  youtube: string | null;
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
    if (!d.audio) return null;
    return {
      id: r.id,
      title: decode(r.title?.rendered ?? '') || '결단송',
      link: r.link,
      date: r.date,
      audio: d.audio,
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

/** 지금 시각에 부르는 가사 줄 번호(없으면 -1) */
export function cueAt(cues: SongCue[], t: number): number {
  for (let i = cues.length - 1; i >= 0; i--) if (t >= cues[i].start) return t <= cues[i].end + 1.5 ? i : -1;
  return -1;
}
