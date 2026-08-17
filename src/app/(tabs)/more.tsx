import { HubList, type HubSection } from '@/components/HubList';
import { useAuth } from '@/lib/auth';

const SECTIONS: HubSection[] = [
  {
    items: [
      { emoji: '💬', label: '커뮤니티', description: '성도들과 나누는 소식과 글', href: '/community' },
      { emoji: '👤', label: '마이페이지', description: '로그인·닉네임·관리자 메뉴', href: '/profile' },
      { emoji: '💝', label: '후원', description: '정기후원·쿠팡파트너스·후원계좌', href: '/support' },
    ],
  },
];

export default function MoreHubScreen() {
  const { session } = useAuth();
  return <HubList title="더보기" sections={SECTIONS} isSignedIn={!!session} />;
}
