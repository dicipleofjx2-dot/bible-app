import { HubList, type HubSection } from '@/components/HubList';
import { useAuth } from '@/lib/auth';

// 매일 읽는 것 / 내가 쓴 것 / 찾아 보는 것으로 나눴다. 예전에는 여섯 개가
// 한 줄로 늘어서 있어서 무엇부터 눌러야 할지 알기 어려웠다.
const SECTIONS: HubSection[] = [
  {
    title: '오늘의 말씀',
    items: [
      { emoji: '📖', label: '매일Q.T', description: '오늘의 QT 본문과 묵상 노트', href: '/meditation' },
      { emoji: '📚', label: '성경읽기', description: '자유롭게 성경 본문 읽기', href: '/read' },
      {
        emoji: '📆',
        label: '성경통독도우미',
        description: '365일 통독 + 퀴즈 + 암송',
        href: '/reading-helper',
        requiresAuth: true,
      },
    ],
  },
  {
    title: '내가 쓴 것',
    items: [
      { emoji: '✍️', label: 'Q.T묵상', description: '지금까지 쓴 QT 묵상 노트 모아보기', href: '/word-notes' },
      { emoji: '💡', label: '구절묵상', description: '하이라이트·암송 구절 모아보기', href: '/notes' },
    ],
  },
  {
    title: '깊이 보기',
    items: [{ emoji: '🧭', label: '성경연구', description: '성경검색·주석·성경지도', href: '/bible-study' }],
  },
];

export default function WordHubScreen() {
  const { session } = useAuth();
  return <HubList title="말씀" sections={SECTIONS} isSignedIn={!!session} />;
}
