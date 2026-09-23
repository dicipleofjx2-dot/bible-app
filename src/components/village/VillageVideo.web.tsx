import type { ComponentType } from 'react';
import { View } from 'react-native';

import type { VillageVideoProps } from './videoTypes';

/**
 * 웹에서는 `<video>` 하나면 된다.
 *
 * react-native-web 에는 video 를 내는 컴포넌트가 없으므로 DOM 요소를 그대로
 * 쓴다(기도음악의 iframe 과 같은 방식). RN 타입에 없는 태그라 캐스팅이 한 번
 * 필요한데, 이 파일은 웹에서만 묶이므로 안전하다.
 */
export function VillageVideo({ url, height = 210 }: VillageVideoProps) {
  const Video = 'video' as unknown as ComponentType<Record<string, unknown>>;
  return (
    <View style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' }}>
      <Video
        src={url}
        controls
        playsInline
        preload="metadata"
        style={{ width: '100%', height: '100%', objectFit: 'contain', border: 0 }}
      />
    </View>
  );
}
