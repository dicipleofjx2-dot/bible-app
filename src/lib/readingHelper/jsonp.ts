import { Platform } from 'react-native';

let counter = 0;

/** Loads a URL via JSONP (script-tag injection) — bypasses CORS entirely
 * since <script> loads aren't subject to it, unlike fetch/XHR. Web-only:
 * relies on `document`, and native has no CORS restriction to work around
 * in the first place (callers should just use `fetch` there). */
export function fetchJsonp(baseUrl: string, callbackParam = 'callback'): Promise<unknown> {
  if (Platform.OS !== 'web') {
    return Promise.reject(new Error('fetchJsonp is web-only'));
  }

  return new Promise((resolve, reject) => {
    const callbackName = `__jsonp_callback_${Date.now()}_${counter++}`;
    const script = document.createElement('script');

    const cleanup = () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      script.remove();
      clearTimeout(timeoutId);
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP 요청이 시간 초과되었습니다.'));
    }, 15000);

    (window as unknown as Record<string, unknown>)[callbackName] = (data: unknown) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP 스크립트를 불러오지 못했습니다.'));
    };

    const separator = baseUrl.includes('?') ? '&' : '?';
    script.src = `${baseUrl}${separator}${callbackParam}=${callbackName}`;
    document.head.appendChild(script);
  });
}
