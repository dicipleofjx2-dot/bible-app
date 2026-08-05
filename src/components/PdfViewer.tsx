import { Linking, Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { toEmbeddablePdfUrl } from './pdfViewerUrl';

// 안드로이드 WebView는 시스템에 PDF 뷰어 앱이 없으면 PDF를 아예 못 그려서
// 검은 화면만 남는 경우가 흔하다 — Google Docs 뷰어로 감싸서 일반 웹페이지로
// 받으면 기기의 PDF 지원 여부와 무관하게 렌더링된다.
// androidLayerType="software" — 그와 별개로 안드로이드 WebView의 GPU 레이어
// 합성 문제로 화면이 통째로 까맣게 뜨는 잘 알려진 버그의 표준 우회법.
//
// 다만 gview는 서버에서 페이지를 이미지로 만들어 보내는 방식이라 300쪽이 넘는
// 책에서는 한참 비어 있거나 실패하기도 한다. 그때 손쓸 방법이 없으면 안 되므로
// 밖에서 직접 여는 길을 아래에 남겨 둔다.
export function PdfViewer({ url }: { url: string }) {
  return (
    <View style={{ flex: 1, width: '100%' }}>
      <WebView
        source={{ uri: toEmbeddablePdfUrl(url) }}
        style={{ flex: 1, width: '100%', backgroundColor: '#ffffff' }}
        androidLayerType="software"
        startInLoadingState
      />
      <Pressable onPress={() => Linking.openURL(url)} style={{ paddingVertical: 10, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: '#6B6558', textDecorationLine: 'underline' }}>
          화면에 안 보이면 밖에서 열기
        </Text>
      </Pressable>
    </View>
  );
}
