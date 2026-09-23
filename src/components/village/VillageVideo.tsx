import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import type { VillageVideoProps } from './videoTypes';

/**
 * 선교 카드의 영상 — 폰에서는 WebView 안의 `<video>` 로 튼다.
 *
 * expo-video 를 새로 넣지 않은 까닭: 네이티브 모듈이라 이미 깔린 APK 에는 없다.
 * 그 길로 가면 이 기능이 **앱을 다시 빌드해 받기 전까지 폰에서 안 보인다.**
 * WebView 는 이 리포에 이미 있고(기도음악·아케이드가 쓴다) 다시 빌드할 필요가
 * 없다.
 *
 * `allowsInlineMediaPlayback` 이 없으면 iOS 가 전체화면으로 뺏어 간다.
 */
export function VillageVideo({ url, height = 210 }: VillageVideoProps) {
  const html = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;background:#000;height:100%}video{width:100%;height:100%;object-fit:contain}</style>
</head><body><video src="${url}" controls playsinline preload="metadata"></video></body></html>`;

  return (
    <View style={{ width: '100%', height, borderRadius: 12, overflow: 'hidden' }}>
      <WebView
        source={{ html }}
        style={{ flex: 1, backgroundColor: '#000000' }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        androidLayerType="software"
      />
    </View>
  );
}
