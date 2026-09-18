import { Platform } from 'react-native';

/**
 * 물품관리ON 의 색.
 *
 * 데이빗바이블 안에 얹혀 있을 때는 그 앱의 살구빛을 빌려 썼다 — 한 앱 안에서
 * 화면마다 다른 색을 쓰면 다른 앱에 들어온 것처럼 보이기 때문이다. 이제 제 앱이
 * 되었으니 **기획서 §6.2 의 색을 그대로 쓴다.**
 *
 *   딥 네이비 #233B53 — 신뢰, 정돈, 안정 (주색)
 *   세이지 그린 #7FA58A — 생활, 돌봄 (보조)
 *   웜 골드 #D6A84B — 중요 정보 (강조)
 *   아이보리 #F7F4ED — 따뜻하고 밝은 공간감 (배경)
 *   코랄 #D96C5F — 부족, 기한 임박, 파손 (경고)
 *
 * 다만 **글자를 얹는 자리는 시안 그대로 쓰지 않았다.** 흰 글자를 얹는 색은
 * 4.5:1 을 넘어야 읽힌다. 세이지 #7FA58A 에 흰 글자는 2.3:1, 골드 #D6A84B 는
 * 1.9:1 이다 — 그래서 「칠하는 색」과 「글자로 쓰는 색」을 갈라 두었다.
 * 시안의 색은 넓은 면(머리띠·배지 바탕)에 그대로 남고, 그 위의 글자에는 한
 * 단계 눌러 둔 짝을 쓴다.
 *
 * 어두운 모드는 같은 계열을 밝기만 뒤집어 잡았다. 네이비를 그대로 두면 어두운
 * 바탕에 묻혀 아무것도 안 보인다.
 */

export type ThemeColor =
  | 'text'
  | 'background'
  | 'backgroundElement'
  | 'textSecondary'
  | 'accent'
  | 'accentSoft'
  | 'border';

export const Colors: Record<'light' | 'dark', Record<ThemeColor, string>> = {
  light: {
    // 잉크는 검정이 아니라 네이비 쪽으로 눕힌 먹색이다. 아이보리 종이 위에서
    // 순수한 검정은 튄다.
    text: '#1E2B38',
    background: '#F7F4ED',
    backgroundElement: '#FFFFFF',
    textSecondary: '#6B7A88',
    // 단추 글자는 전부 흰색이다. 네이비는 흰 글자에 11:1 이 나온다.
    accent: '#233B53',
    accentSoft: '#E6ECF2',
    border: '#E7DFD1',
  },
  dark: {
    text: '#ECF1F5',
    background: '#121A22',
    backgroundElement: '#1C2833',
    textSecondary: '#9BACBA',
    // 어두운 바탕에서는 네이비가 안 보인다. 같은 계열을 밝은 쪽으로 뒤집고,
    // 그 위의 글자는 어두운 색으로 얹는다.
    accent: '#8FB6D6',
    accentSoft: '#24323F',
    border: '#2E3C49',
  },
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
    serif: 'serif',
    rounded: 'system-ui, sans-serif',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 34, android: 24 }) ?? 0;

/** 넓은 화면에서 한 줄이 끝없이 길어지지 않게. PC 에서도 읽는 앱이다. */
export const MaxContentWidth = 900;
