import { View } from 'react-native';

// 웹에서는 PDF를 브라우저 기본 뷰어에 맡긴다.
//
// 예전에 Google Docs 뷰어(gview)로 감쌌던 건 안드로이드 WebView가 PDF를 못
// 그리는 문제 때문이었는데, 웹 브라우저는 사정이 다르다 — 크롬·사파리·
// 파이어폭스 모두 PDF 뷰어를 내장하고 있고 우리 PDF는 Supabase가
// `content-type: application/pdf`에 CORS까지 열어 주므로 iframe에 바로 걸면
// 뜬다. gview는 서버에서 페이지를 이미지로 렌더링해 보내는 방식이라 300쪽짜리
// 책에서는 한참 비어 있거나 아예 안 뜬다(간증집 3MB·332쪽을 올린 뒤 "내용이
// 안 보인다"는 제보를 받았다).
//
// 브라우저가 PDF를 못 여는 드문 경우를 위해 아래에 새 탭 링크를 남겨 둔다.
export function PdfViewer({ url }: { url: string }) {
  return (
    <View style={{ flex: 1, width: '100%' }}>
      {/* react-native-web은 소문자 태그를 그대로 DOM 엘리먼트로 렌더링한다 */}
      <iframe
        src={url}
        title="book-pdf"
        style={{ flex: 1, width: '100%', height: '100%', border: 'none', backgroundColor: '#ffffff' }}
      />
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'block',
          padding: '10px 12px',
          textAlign: 'center',
          fontSize: 13,
          color: '#6B6558',
          textDecoration: 'underline',
        }}
      >
        화면에 안 보이면 새 탭에서 열기
      </a>
    </View>
  );
}
