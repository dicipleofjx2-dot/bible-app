import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import type { PrayerMusicPlayerProps } from './prayerMusicPlayerTypes';

/**
 * 기도음악 — 폰에서는 WebView 로 유튜브 플레이어를 그대로 띄운다.
 *
 * 유튜브 앱으로 넘기지 않는 이유: 넘기면 앱을 나가게 되고, 돌아오면 나무가
 * 처음부터 다시 그려진다. 기도하는 동안 음악은 켜져 있고 화면은 나무여야 한다.
 * allowsInlineMediaPlayback 이 없으면 iOS 는 전체화면으로 뺏어 간다.
 */
export function PrayerMusicPlayer({ embedUrl, height = 200 }: PrayerMusicPlayerProps) {
  return (
    <View style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden' }}>
      <WebView
        source={{ uri: embedUrl }}
        style={{ flex: 1, backgroundColor: '#000000' }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        androidLayerType="software"
      />
    </View>
  );
}
