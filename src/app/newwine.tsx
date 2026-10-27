import { StyleSheet } from 'react-native';

import { HubList, type HubSection } from '@/components/HubList';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { useAuth } from '@/lib/auth';
import { APP_WINDOW } from '@/lib/openExternal';

/**
 * New Wine — 새부대 소식을 꾸준히 듣는 자리(2026-10-27 사장님 요청).
 *
 * 이름은 교회 이름에서 왔다: 새 포도주는 새 부대에(마 9:17). 부대가 교회라면
 * 그 안에 담기는 것이 여기 실리는 글과 영상이다.
 *
 * 매거진 한 곳으로 바로 보내지 않고 이 문을 하나 두는 까닭: 소식은 **읽는 것과
 * 듣는 것**으로 온다. 매거진은 달마다 묶어 읽는 글이고, 방송은 그 사이사이
 * 올라오는 예배와 설교다. 둘을 한 칸에 욱여넣으면 다른 하나는 영영 안 보인다.
 *
 * 글과 영상은 모두 **바깥에 둔 채 주소만 건다**. 받아 오면 그만큼이 우리
 * 저장소에서 나가는데, 소식은 끝없이 늘어나는 것이라 그 양에 끝이 없다.
 */
export default function NewWineScreen() {
  const { session } = useAuth();

  const sections: HubSection[] = [
    {
      items: [
        {
          emoji: '🍇',
          label: 'New Wine 매거진',
          description: '한 달의 은혜를 모아 묶는 교회 매거진',
          href: '/',
          external: { url: 'https://newwine.dgaiworks.com/', window: APP_WINDOW.newWine },
        },
        {
          /*
           * 새부대 방송 — 교회 유튜브 채널(@Newwineskin_Church).
           * 주일예배·새벽기도 생중계가 올라오는 곳이고, 주보의 설교 영상도
           * 모두 이 채널에서 온다. 유튜브가 틀어 주므로 전송량이 들지 않는다.
           */
          emoji: '📺',
          label: '새부대 방송',
          description: '주일예배 · 새벽기도 생중계와 지난 설교',
          href: '/',
          external: { url: 'https://www.youtube.com/@Newwineskin_Church', window: APP_WINDOW.churchBroadcast },
        },
        {
          emoji: '⛪',
          label: '새부대교회 홈페이지',
          description: '교회 소개와 이번 주 소식',
          href: '/',
          external: { url: 'https://newwineskin.co.kr/', window: APP_WINDOW.churchHome },
        },
      ],
    },
  ];

  return (
    <HubList
      title="New Wine"
      sections={sections}
      isSignedIn={!!session}
      footer={
        <ThemedText themeColor="textSecondary" style={[Type.caption, styles.footer]}>
          새 포도주는 새 부대에 — 마태복음 9장 17절
        </ThemedText>
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: 'center', marginTop: Spacing.two },
});
