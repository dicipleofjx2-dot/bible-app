'use client';

import { useEffect } from 'react';

/** 홈 화면에 설치되는 앱이 되려면 워커가 하나 있어야 한다(§14 PWA). */
export default function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* 등록에 실패해도 앱은 그대로 돈다 — 설치만 안 될 뿐이다. */
    });
  }, []);
  return null;
}
