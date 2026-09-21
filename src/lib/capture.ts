/**
 * 문자를 앱 안으로 들여오는 세 갈래 중 **손으로 붙여넣기 밖의 둘** —
 * 카톡에서 「공유」로 보내기(②), 안드로이드 알림 가로채기(③) — 의 다리.
 *
 * 둘 다 안드로이드 앱에서만 된다. 웹과 아이폰에서는 네이티브 모듈이 아예 없고,
 * 그때 이 파일은 **조용히 물러선다**(`supported: false`). 자동수집은 덤이지
 * 이 앱이 서 있는 기둥이 아니다 — 붙여넣기만으로 앱은 온전히 돌아간다.
 */
import { requireOptionalNativeModule } from 'expo';

type CardCaptureNativeModule = {
  /** 알림 접근 권한이 실제로 켜져 있는가. 사용자가 안드로이드 설정에서 언제든 끌 수 있다. */
  isListenerEnabled(): boolean;
  /** 안드로이드의 「알림 접근」 설정 화면을 연다. 이 권한은 앱이 대화상자로 받을 수 없다. */
  openListenerSettings(): void;
  /** 알림이 모아 둔 문자들을 가져오고 비운다. 앱이 꺼져 있는 동안 쌓인 것을 받는 길이다. */
  drainCaptured(): string[];
  /** 「공유」로 넘어온 글을 한 번만 꺼내 준다. 두 번째 부름부터는 null. */
  consumeSharedText(): string | null;
};

const native = requireOptionalNativeModule<CardCaptureNativeModule>('CardCapture');

/** 이 기기에서 자동수집을 쓸 수 있는가. 웹·아이폰·Expo Go 에서는 false. */
export const captureSupported = native !== null;

export function isListenerEnabled(): boolean {
  try {
    return native?.isListenerEnabled() ?? false;
  } catch {
    return false;
  }
}

export function openListenerSettings(): void {
  try {
    native?.openListenerSettings();
  } catch {
    // 설정 화면이 없는 기기 — 할 수 있는 일이 없다.
  }
}

/** 알림으로 모인 문자들. 없으면 빈 배열. */
export function drainCaptured(): string[] {
  try {
    return native?.drainCaptured() ?? [];
  } catch {
    return [];
  }
}

/** 카톡에서 「공유 → 이 앱」으로 넘어온 글. 없으면 null. */
export function consumeSharedText(): string | null {
  try {
    return native?.consumeSharedText() ?? null;
  } catch {
    return null;
  }
}
