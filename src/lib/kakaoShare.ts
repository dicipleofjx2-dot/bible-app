import { Platform } from 'react-native';

// Web-only for now — KakaoTalk sharing from a native app needs the native
// Kakao SDK (separate integration, its own app registration/key hash, and a
// native rebuild), not this JS SDK. Revisit once a native build is possible
// again (see HANDOFF.md's EAS quota note) and the user wants native share too.
const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY;

declare global {
  interface Window {
    Kakao?: any;
  }
}

let sdkLoadPromise: Promise<void> | null = null;

function loadKakaoSdk(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve, reject) => {
    if (window.Kakao?.isInitialized?.()) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
    script.integrity = 'sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Hs90nka';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      try {
        window.Kakao!.init(KAKAO_JS_KEY);
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error('카카오 SDK를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });
  return sdkLoadPromise;
}

export const isKakaoShareAvailable = Platform.OS === 'web' && !!KAKAO_JS_KEY;

export async function shareVerseCard(params: {
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
}): Promise<void> {
  if (!isKakaoShareAvailable) {
    throw new Error('카카오톡 공유가 아직 설정되지 않았습니다.');
  }
  await loadKakaoSdk();
  window.Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: params.title,
      description: params.description,
      imageUrl: params.imageUrl,
      link: { mobileWebUrl: params.linkUrl, webUrl: params.linkUrl },
    },
    buttons: [
      {
        title: '앱에서 보기',
        link: { mobileWebUrl: params.linkUrl, webUrl: params.linkUrl },
      },
    ],
  });
}
