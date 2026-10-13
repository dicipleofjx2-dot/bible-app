import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ranchUrl } from '@/lib/ranchUrl';

/**
 * 앱에서는 3D 목장을 WebView 로 띄운다(웹은 RanchFrame.web.tsx 의 iframe).
 *
 * 스크롤 화면 **안에** 넣지 않는다 — 3D 판은 끌어서 돌리는 손짓을 쓰므로 같은
 * 자리에서 화면 스크롤과 싸운다. 화면 위쪽에 높이를 정해 두고 아래만 스크롤한다.
 * 동물 목록은 주소 뒤 #s= 로 실어 보낸다(개인 정보 없음, 종류와 크기뿐).
 */
export function RanchFrame({
  items,
  embed = false,
}: {
  items: [string, string, string][];
  /** 스크롤 화면 안에 끼울 때 — 위아래로 미는 손짓은 화면 스크롤에 넘긴다 */
  embed?: boolean;
}) {
  return (
    <View style={{ flex: 1, width: '100%' }}>
      <WebView
        source={{ uri: ranchUrl(items, embed) }}
        style={{ flex: 1, width: '100%', backgroundColor: '#9fd2f5' }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        overScrollMode="never"
        bounces={false}
        startInLoadingState
      />
    </View>
  );
}
