import { HubList, type HubSection } from '@/components/HubList';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';

export default function MoreHubScreen() {
  const { session } = useAuth();
  const t = useT();

  const sections: HubSection[] = [
    {
      items: [
        {
          emoji: '👤',
          label: t('more.myPage'),
          description: t('more.myPageDesc'),
          href: '/profile',
        },
        {
          emoji: '📦',
          label: '물품관리ON',
          description: '교회와 가정의 물품을 사진으로 보고 찾는 수납 지도',
          href: '/inventory',
          requiresAuth: true,
        },
        {
          emoji: '💝',
          label: t('more.support'),
          description: t('more.supportDesc'),
          href: '/support',
        },
      ],
    },
  ];

  return <HubList title={t('tab.more')} sections={sections} isSignedIn={!!session} />;
}
