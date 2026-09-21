import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * 웹에서만 쓰이는 바깥 껍데기(정적 내보내기 때 한 번 그려진다).
 *
 * `body` 바탕색을 여기서 정하는 이유: 화면 안쪽은 ThemedView 가 칠하지만
 * 내용이 짧으면 그 아래가 브라우저 기본색(어두운 모드에서 순검정)으로 남아
 * 카드 색과 어긋나 보인다. 여기는 리액트 밖이라 훅을 못 쓰므로 CSS 로 건다.
 */
const backgroundStyle = `
  :root { color-scheme: light dark; }
  body { background-color: #F7F5F2; }
  @media (prefers-color-scheme: dark) {
    body { background-color: #14171C; }
  }
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: backgroundStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
