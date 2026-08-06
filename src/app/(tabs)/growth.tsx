import { HubList, type HubSection } from '@/components/HubList';
import { useAuth } from '@/lib/auth';

// 혼자 쓰는 기록과 함께하는 자리를 갈랐다.
const SECTIONS: HubSection[] = [
  {
    title: '하루를 기록하기',
    items: [
      { emoji: '❤️‍🔥', label: '순종일기', description: '말씀을 따라 산 하루를 기록', href: '/spiritual-journal' },
      { emoji: '📊', label: '우선순위', description: '오늘 우선해야 할 일 정리', href: '/priorities' },
      { emoji: '🪙', label: '천국재정', description: '재정을 하나님 나라 관점으로', href: '/kingdom-finance' },
    ],
  },
  {
    title: '함께 자라기',
    items: [
      {
        emoji: '🙏',
        label: '샬롬기도단',
        description: '함께 기도제목을 나누는 공간',
        href: '/prayer-group',
        requiresAuth: true,
      },
      { emoji: '📕', label: '데이빗북스', description: '전자책 서재', href: '/library' },
    ],
  },
];

export default function GrowthHubScreen() {
  const { session } = useAuth();
  return <HubList title="성장" sections={SECTIONS} isSignedIn={!!session} />;
}
