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
          href: '/',
          external: { url: 'https://sermon.dgaiworks.com/sermon-comics/', window: APP_WINDOW.webtoon },
        },
      ],
    },
  ];

  return <HubList title={t('tab.word')} sections={sections} isSignedIn={!!session} />;
}
