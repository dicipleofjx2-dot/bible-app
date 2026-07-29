// 브라우저/네이티브 WebView가 PDF를 직접(<iframe src="...pdf">) 렌더링하는 건
// 의외로 신뢰도가 낮다 — 특히 안드로이드 WebView는 시스템에 PDF 뷰어 앱이
// 없으면 아예 못 그려서 검은 화면만 남는 경우가 흔하다. Google Docs 뷰어에
// 맡기면 PDF를 일반 웹페이지(HTML/캔버스)로 렌더링해주기 때문에, 로컬
// PDF 플러그인 유무와 무관하게 어디서든 동일하게 보인다 — 파일의 실제
// 글자 색/크기도(추출·재구성 없이 그대로 그려주므로) 그대로 유지된다.
export function toEmbeddablePdfUrl(fileUrl: string): string {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;
}
