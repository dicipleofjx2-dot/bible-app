import { StyleSheet } from 'react-native';

import { HubList, type HubSection } from '@/components/HubList';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { useAuth } from '@/lib/auth';
import { APP_WINDOW } from '@/lib/openExternal';

/**
 * 데이빗에듀 — 배우는 앱들을 한데 모은 문(2026-10-02).
 *
 * 홈 바둑판의 「지도로 보는 바이블 저니」 칸을 이 이름으로 바꾸고, 바이블 저니는
 * 이 안으로 옮겼다. 교육용 앱이 하나씩 늘 때마다 홈에 칸을 더하면 바둑판이
 * 끝없이 길어진다 — 늘어나는 것은 여기 한 줄씩 더한다.
 *
 * 새 앱을 붙일 때: 바깥 앱이면 `external` 에 주소와 창 이름(`APP_WINDOW`)을,
 * 이 앱 안 화면이면 `href` 만 적는다.
 */
export default function EduHubScreen() {
  const { session } = useAuth();

  const sections: HubSection[] = [
    {
      items: [
        {
          emoji: '🗺️',
          label: '바이블 저니',
          description: '성경과 세계사를 위성지도·3D 지형 위에서 따라가는 여행',
          href: '/',
          external: { url: 'https://journey.dgaiworks.com/', window: APP_WINDOW.bibleJourney },
        },
      ],
    },
  ];

  return (
    <HubList
      title="데이빗에듀"
      sections={sections}
      isSignedIn={!!session}
      footer={
        <ThemedText themeColor="textSecondary" style={[Type.caption, styles.footer]}>
          배우는 앱들이 이곳에 하나씩 더해집니다.
        </ThemedText>
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: 'center', marginTop: Spacing.two },
});
