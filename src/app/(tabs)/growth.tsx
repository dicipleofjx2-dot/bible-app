import { HubList, type HubSection } from '@/components/HubList';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';

// 혼자 쓰는 기록과 함께하는 자리를 갈랐다.
//
// 문구를 상수로 두지 않고 함수 안에서 만든다 — 모듈을 읽을 때 한 번 만들어
// 두면 처음 언어로 굳어 언어를 바꿔도 안 따라온다.
export default function GrowthHubScreen() {
  const { session } = useAuth();
  const t = useT();

  const sections: HubSection[] = [
    {
      title: t('growth.recordDay'),
      items: [
        {
          emoji: '❤️‍🔥',
          label: t('growth.obedienceDiary'),
          description: t('growth.obedienceDiaryDesc'),
          href: '/spiritual-journal',
        },
        {
          emoji: '📊',
          label: t('growth.priority'),
          description: t('growth.priorityDesc'),
          href: '/priorities',
        },
        {
          emoji: '🪙',
          label: t('growth.finance'),
          description: t('growth.financeDesc'),
          href: '/kingdom-finance',
        },
      ],
    },
    {
      title: t('growth.title'),
      items: [
        {
          emoji: '🙏',
          label: t('growth.shalomPrayer'),
          description: t('growth.shalomPrayerDesc'),
          href: '/prayer-group',
          requiresAuth: true,
        },
        {
          emoji: '📕',
          label: t('growth.davidBooks'),
          description: t('growth.davidBooksDesc'),
          href: '/library',
        },
      ],
    },
  ];

  return <HubList title={t('tab.growth')} sections={sections} isSignedIn={!!session} />;
}
