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
 *
 * 워드프레스로 쓴 **배우는 블로그**도 여기 건다(2026-10-27). 글은 그쪽 사이트에
 * 있고 앱은 주소만 건다 — 글과 그림을 앱으로 받아 오면 그만큼이 우리 저장소에서
 * 나가고, 블로그는 글이 계속 늘어나는 곳이라 그 양이 끝이 없다.
 */
export default function EduHubScreen() {
  const { session } = useAuth();

  const sections: HubSection[] = [
    {
      items: [
        {
          /*
           * New Wine — 교회 매거진(2026-10-27).
           *
           * 이름은 교회 이름에서 왔다: 새 포도주는 새 부대에(마 9:17). 부대가
           * 교회라면 그 안에 담기는 것이 이 매거진이다.
           */
          emoji: '🍇',
          label: 'New Wine 매거진',
          description: '새 부대에 담기는 새 포도주 — 교회가 띄우는 글',
          href: '/',
          external: { url: 'https://newwine.dgaiworks.com/', window: APP_WINDOW.newWine },
        },
        {
          emoji: '🗺️',
          label: '바이블 저니',
          description: '성경과 세계사를 위성지도·3D 지형 위에서 따라가는 여행',
          href: '/',
          external: { url: 'https://journey.dgaiworks.com/', window: APP_WINDOW.bibleJourney },
        },
        {
          // 새로 연 칸이라 한 달 동안 NEW 딱지를 단다(2026-10-20 → 11-20). 지나면 저절로 사라진다.
          emoji: '🔤',
          label: '영어 성경단어장',
          description: '복음서·여호수아·사사기(NIV)의 어려운 영어 단어를 체크하고 카드로 학습',
          href: '/bible-vocab',
          highlight: true,
          newUntil: '2026-11-20T23:59:59+09:00',
        },
        {
          emoji: '🦉',
          label: '희귀동물 백과사전',
          description: '멸종위기 동물을 등급·서식지·분류로 살펴보는 도감',
          href: '/',
          external: { url: 'https://rareanimals.dgaiworks.com/', window: APP_WINDOW.rareAnimals },
        },
        {
          emoji: '🌌',
          label: '우주가 찬양한다',
          description: '해와 달과 별이 노래하는 창조주 하나님',
          href: '/',
          external: { url: 'https://amazingcosmos.dgaiworks.com/', window: APP_WINDOW.amazingCosmos },
        },
        {
          emoji: '🛤️',
          label: '복음이 온 길',
          description: '조선의 서학 서적에서 오늘까지, 한국 기독교 선교 역사',
          href: '/',
          external: { url: 'https://gospelroad.dgaiworks.com/', window: APP_WINDOW.gospelRoad },
        },
        {
          emoji: '🎓',
          label: '디지털캠퍼스',
          description: '훈련을 영상으로 듣는 곳 · 카카오 로그인 그대로',
          href: '/',
          external: { url: 'https://davidstone-campus.vercel.app/davidstone', window: APP_WINDOW.campus },
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
