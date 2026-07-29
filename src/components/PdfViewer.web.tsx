import { View } from 'react-native';

import { toEmbeddablePdfUrl } from './pdfViewerUrl';

// 직접 <iframe src="...pdf">로 렌더링을 시도했다가 화면이 검게 뜨는 문제가
// 계속돼서(브라우저별 내장 PDF 뷰어 신뢰도 문제) Google Docs 뷰어로 감쌌다.
export function PdfViewer({ url }: { url: string }) {
  return (
    <View style={{ flex: 1, width: '100%' }}>
      {/* react-native-web은 소문자 태그를 그대로 DOM 엘리먼트로 렌더링한다 */}
      <iframe src={toEmbeddablePdfUrl(url)} title="book-pdf" style={{ flex: 1, width: '100%', height: '100%', border: 'none' }} />
    </View>
  );
}
