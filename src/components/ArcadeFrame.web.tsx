import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';

import { arcadeUrl } from '@/lib/arcade';
import { isPageMessage, replyTo, type HostMessage } from './arcadeBridge';
import type { ArcadeState } from '@/lib/arcade';

/**
 * 웹에서는 게임 판을 iframe 으로 띄운다.
 *
 * 캔버스 다섯 판을 리액트 네이티브 부품으로 다시 짜지 않는다 — 그리는 방식이
 * 아예 달라서 사실상 다시 만드는 일이 되고, 그러면 같은 게임이 두 벌이 되어
 * 한쪽만 고쳐지는 날이 온다. 한 장짜리 HTML 을 그대로 싣고 포인트만 앱이 넣는다.
 */
export function ArcadeFrame({
  signedIn,
  onState,
}: {
  signedIn: boolean;
  onState?: (s: ArcadeState) => void;
}) {
  const ref = useRef<HTMLIFrameElement | null>(null);

  const post = useCallback((msg: HostMessage) => {
    ref.current?.contentWindow?.postMessage(msg, '*');
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // 다른 창이 보낸 말은 무시한다. 우리 iframe 이 보낸 것만 받는다.
      if (ref.current && e.source !== ref.current.contentWindow) return;
      if (!isPageMessage(e.data)) return;
      void replyTo(e.data, signedIn, onState).then((reply) => {
        if (reply) post(reply);
      });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [signedIn, onState, post]);

  return (
    <View style={{ flex: 1, width: '100%' }}>
      {/* react-native-web은 소문자 태그를 그대로 DOM 엘리먼트로 렌더링한다 */}
      <iframe
        ref={ref}
        src={arcadeUrl()}
        title="창세기 아케이드"
        style={{ border: 0, width: '100%', height: '100%', display: 'block', background: '#0D1120' }}
      />
    </View>
  );
}
