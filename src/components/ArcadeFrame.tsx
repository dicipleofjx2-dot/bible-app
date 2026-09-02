import { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { arcadeUrl, type ArcadeState } from '@/lib/arcade';
import { isPageMessage, replyTo, type HostMessage } from './arcadeBridge';

/**
 * 앱에서는 게임 판을 WebView 로 띄운다(웹은 ArcadeFrame.web.tsx 의 iframe).
 *
 * 판은 배포된 주소에서 받아 온다. 파일을 앱 안에 넣어 두면 게임을 고칠 때마다
 * 스토어 심사를 다시 받아야 하는데, 이건 웹에 올리기만 하면 되는 한 장짜리
 * HTML 이다.
 */
export function ArcadeFrame({
  signedIn,
  onState,
}: {
  signedIn: boolean;
  onState?: (s: ArcadeState) => void;
}) {
  const ref = useRef<WebView | null>(null);

  const post = useCallback((msg: HostMessage) => {
    // 판 쪽에서 window.__arcadeFromHost 로 받는다. JSON 을 문자열로 넣고
    // 마지막에 true 를 두는 건 injectJavaScript 의 관례다(반환값 경고 방지).
    const json = JSON.stringify(msg).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    ref.current?.injectJavaScript(
      `window.__arcadeFromHost && window.__arcadeFromHost('${json}'); true;`,
    );
  }, []);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let data: unknown;
      try {
        data = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (!isPageMessage(data)) return;
      void replyTo(data, signedIn, onState).then((reply) => {
        if (reply) post(reply);
      });
    },
    [signedIn, onState, post],
  );

  return (
    <View style={{ flex: 1, width: '100%' }}>
      <WebView
        ref={ref}
        source={{ uri: arcadeUrl() }}
        style={{ flex: 1, width: '100%', backgroundColor: '#0D1120' }}
        onMessage={onMessage}
        // 게임이 캔버스를 계속 다시 그리므로 소프트웨어 레이어로 내리면 눈에
        // 띄게 느려진다. PDF 화면과 달리 여기서는 GPU 레이어를 그대로 쓴다.
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState
      />
    </View>
  );
}
