import { StyleSheet } from 'react-native';
import type { Href } from 'expo-router';

import { HubList, type HubSection } from '@/components/HubList';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { useAuth } from '@/lib/auth';

/**
 * 코이노니아 — 함께 겨루고 노는 자리(2026-10-27 사장님 요청).
 *
 * 성경게임대전과 성경 아케이드를 한 문 안에 모았다. 홈 바둑판에 각각 칸을
 * 두면 성격이 같은 두 칸이 나란히 붙어 자리만 차지한다. 코이노니아는 함께
 * 나누는 사귐을 뜻하는 말이고, 겨루는 것도 사귐의 한 모양이다.
 *
 * 로그인하지 않아도 들어가 볼 수 있게 둔다 — 기록 저장만 로그인이 필요하다.
 * 문 앞에서 막으면 무슨 게임인지 보지도 못하고 돌아간다.
 */
export default function KoinoniaScreen() {
  const { session } = useAuth();

  const sections: HubSection[] = [
    {
      items: [
        {
          emoji: '🏆',
          label: '성경게임대전',
          description: '방에 들어가 함께 겨루는 성경 퀴즈',
          href: '/arena' as Href,
        },
        {
          emoji: '🕹️',
          label: '성경 아케이드',
          description: '혼자 차근차근 — 오늘의 포인트를 쌓는 자리',
          href: '/arcade' as Href,
        },
      ],
    },
  ];

  return (
    <HubList
      title="코이노니아"
      sections={sections}
      isSignedIn={!!session}
      footer={
        <ThemedText themeColor="textSecondary" style={[Type.caption, styles.footer]}>
          기록을 남기려면 로그인이 필요합니다. 구경은 그냥 하셔도 됩니다.
        </ThemedText>
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: 'center', marginTop: Spacing.two },
});
