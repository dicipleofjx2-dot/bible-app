import { HubList, type HubSection } from '@/components/HubList';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';

/**
 * 부흥의 천사들 — 사역을 위한 자리.
 *
 * 2026-10-20 에 「성장」 칸을 이 사역에 내주었다. 거기 있던 순종일기·우선순위·
 * 천국재정은 화면째 걷었다. 순종은 R2M 「오늘의 훈련」과 목자의 경건생활 표에서도
 * 함께 뺐다(사용자 결정) — 적는 자리가 없는 항목을 체크만 남겨 둘 수 없다.
 *
 * 남긴 둘은 이 사역과 결이 같아서다. 중보기도 나무는 사람을 심어 기도하는
 * 자리이고, 데이빗북스는 함께 읽는 자리다.
 *
 * 중보기도센터·전도는 **홈 바둑판에 이미 있어서** 여기에 두지 않는다 — 같은 문이
 * 두 군데 있으면 어느 쪽이 본 자리인지 흐려진다. 사역 관리(교회운영ON)도 뺐다.
 *
 * ⚠️ 파일 이름과 주소(/growth)는 그대로 둔다. 바꾸면 홈 타일·탭·저쪽 앱들이
 * 거는 링크가 한꺼번에 끊긴다. 보이는 이름만 갈아입혔다(tab.growth).
 *
 * 문구를 모듈 상수로 두지 않고 함수 안에서 만든다 — 모듈을 읽을 때 한 번 만들어
 * 두면 처음 언어로 굳어 언어를 바꿔도 안 따라온다.
 */
export default function RevivalAngelsScreen() {
  const { session } = useAuth();
  const t = useT();

  const sections: HubSection[] = [
    {
      title: '네 가지 사역',
      items: [
        {
          emoji: '😇',
          label: '사역 신청하기',
          description: '말씀과 예언 · 치유와 축사 · 찬양과 경배 · 천국의 재정',
          href: '/revival',
          requiresAuth: true,
        },
      ],
    },
    {
      title: t('growth.title'),
      items: [
        {
          emoji: '🌳',
          label: '중보기도 나무',
          description: '기도할 사람을 열매로 심고, 응답될수록 익어 가는 나무',
          href: '/prayer-tree',
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
