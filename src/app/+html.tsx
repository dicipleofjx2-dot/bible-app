import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * 웹으로 내보낼 때 감싸는 HTML 껍데기.
 *
 * expo-router 가 기본 껍데기를 만들어 주는데, 거기에는 **홈 화면 아이콘에 필요한
 * 것이 하나도 없다.** 그래서 「홈 화면에 추가」를 하면 브라우저가 48px 파비콘을
 * 긁어다 흐릿하게 쓰고, 그것도 **설치하는 순간 박제돼** 새 아이콘을 배포해도
 * 바뀌지 않는다. 매니페스트와 apple-touch-icon 을 여기서 붙인다.
 *
 * 이 파일은 서버에서 한 번만 돌고 브라우저로는 안 나간다.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover 라야 아이폰 노치 아래까지 배경이 찬다. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        {/*
          검색엔진과 카카오톡 공유에 필요한 것들.
          여기 없으면 제목 없는 빈 문서로 잡혀 「데이빗바이블」로 검색해도 안 나온다.
          expo-router 정적 내보내기는 이 껍데기를 모든 화면에 함께 쓴다.
        */}
        <title>데이빗바이블 — 읽고 이해하고 기억하는 성경 앱</title>
        <meta
          name="description"
          content="성경을 읽고, 읽은 말씀을 이해하고 기억하도록 돕는 앱입니다. 통독 도우미·묵상·암송·성경 지도·아케이드를 한 곳에서."
        />
        <link rel="canonical" href="https://davidbible.dgaiworks.com/" />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />
        <meta name="keywords" content="성경 앱,성경통독,성경 읽기,묵상,암송,성경 지도,큐티,데이빗바이블" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:site_name" content="데이빗바이블" />
        <meta property="og:title" content="데이빗바이블 — 읽고 이해하고 기억하는 성경 앱" />
        <meta
          property="og:description"
          content="통독 도우미·묵상·암송·성경 지도·아케이드를 한 곳에서. 읽은 말씀이 남도록 돕습니다."
        />
        <meta property="og:url" content="https://davidbible.dgaiworks.com/" />
        <meta property="og:image" content="https://davidbible.dgaiworks.com/og.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="데이빗바이블" />
        <meta name="twitter:image" content="https://davidbible.dgaiworks.com/og.png" />


        {/* 홈 화면에 추가했을 때 쓰이는 것들 */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="데이빗바이블" />
        {/* 주소창 색. 밝은 모드는 앱 바탕, 어두운 모드는 어두운 바탕에 맞춘다. */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#FBF2EA" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#241A16" />

        {/*
          이걸 빼면 body 가 스크롤돼서 화면이 통째로 위아래로 흔들린다.
          expo-router 가 넣어 주던 것을 껍데기를 직접 쓰면서 우리가 챙긴다.
        */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
