/**
 * 중보기도 나무의 셈 — 화면이 아니라 여기에 둔다.
 *
 * 열매가 얼마나 익었는지는 「응답된 기도제목 / 전체 기도제목」 하나로 정한다.
 * 이 파일에는 상태도, 그리기도 없다. 값만 넣으면 값만 나오므로 눈으로 확인하기
 * 어려운 환경(HANDOFF 의 「Verification environment」 참고)에서도 검사가 된다.
 */

/** 아직 안 익은 열매 → 다 익은 열매. 가운데를 주황으로 지난다. */
const RIPENESS_STOPS: readonly (readonly [number, number, number])[] = [
  // 연둣빛. 잎(#4E7C41)보다 **밝은 쪽**으로 잡았다 — 처음에 잎과 같은 채도의
  // 초록으로 두었더니 아직 응답이 없는 열매가 잎에 묻혀 안 보였다.
  [0xcb, 0xdb, 0x8c],
  [0xd6, 0xb0, 0x4a], // 노랑
  [0xe0, 0x84, 0x38], // 주황
  [0xc4, 0x36, 0x2a], // 진홍 — 다 익었다
];

/** 지름(px). 다 익은 열매가 눈에 먼저 걸리도록 두 배 가까이 커진다. */
export const FRUIT_MIN_SIZE = 34;
export const FRUIT_MAX_SIZE = 62;

export type FruitLook = {
  /** 0~1. 기도제목이 하나도 없으면 0 */
  ratio: number;
  size: number;
  color: string;
  /** 테두리 — 같은 색을 어둡게 눌러 열매의 윤곽을 만든다 */
  outline: string;
  /** 전부 응답된 열매. 화면에서 반짝임 하나를 더 준다 */
  fullyRipe: boolean;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function toHex(n: number): string {
  return Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, '0');
}

/** 여러 색 사이를 고르게 지나는 보간. t 는 0~1 */
export function ripenessColor(t: number, darken = 0): string {
  const ratio = clamp01(t);
  const span = RIPENESS_STOPS.length - 1;
  const pos = ratio * span;
  const i = Math.min(span - 1, Math.floor(pos));
  const f = pos - i;
  const a = RIPENESS_STOPS[i];
  const b = RIPENESS_STOPS[i + 1];
  const mix = (k: number) => (a[k] + (b[k] - a[k]) * f) * (1 - darken);
  return `#${toHex(mix(0))}${toHex(mix(1))}${toHex(mix(2))}`;
}

/**
 * 기도제목 수와 응답 수로 열매 모양을 정한다.
 *
 * 기도제목이 **없는** 열매는 0 으로 둔다 — 0/0 을 1 로 보면 아직 아무것도
 * 올리지 않은 사람이 「다 응답됨」으로 붉게 익어 버린다.
 */
export function fruitLook(total: number, answered: number): FruitLook {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeAnswered = Math.min(safeTotal, Math.max(0, Math.floor(answered)));
  const ratio = safeTotal === 0 ? 0 : safeAnswered / safeTotal;
  return {
    ratio,
    size: Math.round(FRUIT_MIN_SIZE + (FRUIT_MAX_SIZE - FRUIT_MIN_SIZE) * ratio),
    color: ripenessColor(ratio),
    outline: ripenessColor(ratio, 0.32),
    fullyRipe: safeTotal > 0 && safeAnswered === safeTotal,
  };
}

/** 「3/7 응답」처럼 읽히는 한 줄 */
export function ripenessLabel(total: number, answered: number): string {
  if (total === 0) return '기도제목 없음';
  if (answered === total) return `다 익었어요 · ${answered}/${total} 응답`;
  return `${answered}/${total} 응답`;
}

/**
 * 유튜브 재생목록 주소에서 목록 아이디만 뽑는다.
 *
 * 사람들이 붙여 넣는 주소가 제각각이다 — youtube.com/playlist?list=…,
 * 영상 주소 뒤에 &list=… 가 붙은 것, youtu.be 짧은 주소, 앱에서 복사한
 * m.youtube.com. 아이디만 남기면 어느 쪽이든 같은 곳으로 간다.
 * 목록이 아니라 영상 하나만 준 주소도 받아 준다.
 */
export type PrayerMusicSource =
  | { kind: 'playlist'; id: string; embedUrl: string }
  | { kind: 'video'; id: string; embedUrl: string }
  | null;

const PLAYLIST_ID = /^[A-Za-z0-9_-]{2,64}$/;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function parsePrayerMusicUrl(raw: string): PrayerMusicSource {
  const input = (raw ?? '').trim();
  if (!input) return null;

  // 주소가 아니라 아이디만 붙여 넣는 사람이 있다. PL… 로 시작하면 재생목록이다.
  if (!input.includes('/') && !input.includes('?')) {
    if (/^(PL|OL|UU|LL|RD|FL)/.test(input) && PLAYLIST_ID.test(input)) {
      return { kind: 'playlist', id: input, embedUrl: playlistEmbed(input) };
    }
    if (VIDEO_ID.test(input)) return { kind: 'video', id: input, embedUrl: videoEmbed(input) };
    return null;
  }

  let url: URL;
  try {
    url = new URL(input.startsWith('http') ? input : `https://${input}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, '');
  if (!/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) return null;

  const list = url.searchParams.get('list');
  if (list && PLAYLIST_ID.test(list)) {
    return { kind: 'playlist', id: list, embedUrl: playlistEmbed(list) };
  }

  const video =
    url.searchParams.get('v') ??
    (host === 'youtu.be' ? url.pathname.slice(1) : null) ??
    (url.pathname.startsWith('/embed/') ? url.pathname.slice('/embed/'.length) : null) ??
    (url.pathname.startsWith('/shorts/') ? url.pathname.slice('/shorts/'.length) : null);
  if (video && VIDEO_ID.test(video)) return { kind: 'video', id: video, embedUrl: videoEmbed(video) };

  return null;
}

function playlistEmbed(id: string): string {
  return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(id)}&rel=0`;
}

function videoEmbed(id: string): string {
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0`;
}

/**
 * 오늘(기기 기준) 기도한 열매인가.
 *
 * 서버가 준 시각을 문자열로 자르지 않고 Date 로 옮겨 **그 사람의 날**로 견준다
 * — 서울에서 새벽에 기도하면 UTC 로는 아직 어제다.
 */
export function prayedToday(lastPrayedAt: string | null, now: Date = new Date()): boolean {
  if (!lastPrayedAt) return false;
  const d = new Date(lastPrayedAt);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** 「오늘 기도함」 · 「3일 전」 처럼 읽히는 한 줄. */
export function lastPrayedLabel(lastPrayedAt: string | null, now: Date = new Date()): string {
  if (!lastPrayedAt) return '아직 기도 기록 없음';
  const d = new Date(lastPrayedAt);
  if (Number.isNaN(d.getTime())) return '아직 기도 기록 없음';
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (days <= 0) return '오늘 기도함';
  if (days === 1) return '어제 기도함';
  if (days < 30) return `${days}일 전에 기도함`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} 에 기도함`;
}
