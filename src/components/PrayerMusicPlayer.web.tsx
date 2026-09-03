import { View } from 'react-native';

import type { ComponentType } from 'react';

import type { PrayerMusicPlayerProps } from './prayerMusicPlayerTypes';

/**
 * 웹에서는 iframe 하나면 된다.
 *
 * react-native-web 에는 iframe 을 내는 컴포넌트가 없으므로 그냥 DOM 요소를
 * 쓴다. RN 타입에는 없는 태그라 타입 검사를 지나려면 as any 가 한 번 필요하다
 * — 이 파일은 웹에서만 묶이므로 안전하다.
 */
export function PrayerMusicPlayer({ embedUrl, height = 200 }: PrayerMusicPlayerProps) {
  const Iframe = 'iframe' as unknown as ComponentType<Record<string, unknown>>;
  return (
    <View style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden' }}>
      <Iframe
        src={embedUrl}
        width="100%"
        height={height}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
        title="기도음악"
        style={{ border: 0 }}
      />
    </View>
  );
}
