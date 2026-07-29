import { WebView } from 'react-native-webview';

import { toEmbeddablePdfUrl } from './pdfViewerUrl';

// 안드로이드 WebView는 시스템에 PDF 뷰어 앱이 없으면 PDF를 아예 못 그려서
// 검은 화면만 남는 경우가 흔하다 — Google Docs 뷰어로 감싸서 일반 웹페이지로
// 받으면 기기의 PDF 지원 여부와 무관하게 항상 동일하게 렌더링된다.
// androidLayerType="software" — 그와 별개로 안드로이드 WebView의 GPU 레이어
// 합성 문제로 화면이 통째로 까맣게 뜨는 잘 알려진 버그의 표준 우회법.
export function PdfViewer({ url }: { url: string }) {
  return (
    <WebView
      source={{ uri: toEmbeddablePdfUrl(url) }}
      style={{ flex: 1, width: '100%', backgroundColor: '#ffffff' }}
      androidLayerType="software"
      startInLoadingState
    />
  );
}
