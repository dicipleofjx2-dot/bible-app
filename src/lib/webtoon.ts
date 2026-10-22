import { READING_WEBTOON_LIST } from '@/lib/readingHelper/webtoon';
import { APP_WINDOW } from '@/lib/openExternal';

/**
 * 말씀웹툰 — 연재 둘, 읽는 곳은 워드프레스.
 *
 * ── 왜 앱 안에서 읽지 않는가 ───────────────────────────────────────
 * 한동안 그림을 앱 안으로 받아 와 전자책처럼 넘겨 읽었다. 그런데 그림이 한 화에
 * 3.7~4.1MB 였고, 저장소가 「담아 두지 말라(private, no-cache)」로 내주고 있어서
 * 같은 사람이 같은 화를 다시 열 때마다 그만큼을 새로 받았다. 네 앱이 한 저장소를
 * 같이 쓰므로 그 전송량이 주보·기도센터에도 영향을 준다.
 *
 * 그래서 **웹툰은 워드프레스에서 읽고, 앱은 주소만 건다**(2026-10-22, 사장님 결정).
 * 읽는 자리를 한 군데로 모으면 꾸미는 일도 거기서 한 번만 하면 된다.
 *
 * 연재를 더하려면 아래에 한 줄 더한다. 창 이름(`window`)은 연재마다 달리 준다 —
 * 같은 이름을 주면 설교 웹툰을 보다가 통독 웹툰을 누를 때 보던 자리를 잃는다.
 */

export type WebtoonSeries = {
  key: string;
  title: string;
  description: string;
  emoji: string;
  /** 연재가 올라오는 워드프레스 자리. 앱은 여기로 보낸다. */
  site: string;
  /** 창 이름 — 같은 연재는 늘 같은 창에서 열린다(탭이 쌓이지 않게). */
  window: string;
};

export const WEBTOON_SERIES: WebtoonSeries[] = [
  {
    key: 'sermon',
    title: '주일설교 웹툰',
    description: '그 주 설교를 목사님과 한 제자의 이야기로',
    emoji: '🎙️',
    site: 'https://sermon.dgaiworks.com/sermon-comics/',
    window: APP_WINDOW.webtoon,
  },
  {
    key: 'reading',
    title: '성경통독 웹툰',
    description: '통독 하루 분량을 한 화씩 그린 연재',
    emoji: '📖',
    site: READING_WEBTOON_LIST,
    window: APP_WINDOW.readingWebtoon,
  },
];
