import type { Href } from 'expo-router';

import { HubList, type HubSection } from '@/components/HubList';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { APP_WINDOW } from '@/lib/openExternal';

// 매일 읽는 것 / 내가 쓴 것 / 찾아 보는 것으로 나눴다. 예전에는 여섯 개가
// 한 줄로 늘어서 있어서 무엇부터 눌러야 할지 알기 어려웠다.
//
// 문구를 상수로 두지 않고 함수 안에서 만든다 — 언어를 바꾸면 다시 그려져야
// 하는데, 모듈을 읽을 때 한 번 만들어 두면 처음 언어로 굳는다.
export default function WordHubScreen() {
  const { session } = useAuth();
  const t = useT();

  const sections: HubSection[] = [
    {
      title: t('word.title'),
      items: [
        {
          emoji: '🖼️',
          label: t('word.webtoon'),
          description: t('word.webtoonDesc'),
          // 바깥 사이트 대신 **앱 안 책장**으로. 전자책처럼 넘겨 읽는다.
          // 타입 생성기(.expo/types)가 새 길을 늦게 따라온다. 이 리포가 쓰던 대로 못 박는다.
          href: '/webtoon' as Href,
        },
        {
          emoji: '📚',
          label: t('word.davidWebtoon'),
          description: t('word.davidWebtoonDesc'),
          // 모든 웹툰의 본진(2026-10-23 사장님 결정) — 바깥 사이트로 연다.
          href: '/webtoon' as Href, // external 이 있으면 쓰지 않는다(타입이 요구해서 둔다)
          external: { url: 'https://webtoon.dgaiworks.com/', window: APP_WINDOW.davidWebtoon },
        },
        {
          emoji: '🌘',
          label: t('word.endtimeSigns'),
          description: t('word.endtimeSignsDesc'),
          // 마지막 때의 징조들(2026-10-24 사장님 요청) — 2000년 재난 기록·하늘의 징조·종말론 글이 있는 바깥 사이트.
          href: '/webtoon' as Href, // external 이 있으면 쓰지 않는다(타입이 요구해서 둔다)
          external: { url: 'https://signs.dgaiworks.com/', window: APP_WINDOW.endtimeSigns },
        },
      ],
    },
  ];

  return <HubList title={t('tab.word')} sections={sections} isSignedIn={!!session} />;
}
