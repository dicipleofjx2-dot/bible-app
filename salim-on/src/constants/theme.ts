import { Platform } from 'react-native';

/**
 * 살림ON 의 색.
 *
 * 살림은 매일 보는 화면이다. 튀는 색을 쓰면 하루에 다섯 번 보는 사람이
 * 지친다 — 차분한 숲빛을 주색으로 두고, 눈여겨볼 것(늦음·확인 대기)에만
 * 따뜻한 색을 쓴다.
 *
 *   숲 그린   #2F5D50 — 정돈, 살림 (주색)
 *   테라코타  #C96F4A — 늦음, 반려 (경고)
 *   머스터드  #D9A441 — 확인 대기, 눈여겨볼 것 (강조)
 *   아이보리  #FAF6EF — 배경
 *
 * **칠하는 색과 글자로 쓰는 색을 갈랐다.** 머스터드 #D9A441 위의 흰 글자는
 * 1.9:1, 테라코타 #C96F4A 는 3.1:1 이라 배지 글자로 쓸 수 없다. 넓은 면은
 * 이 색 그대로 칠하고, 그 위의 글자에는 한 단계 눌러 둔 짝을 쓴다.
 *
 * 어두운 모드는 같은 계열을 밝기만 뒤집었다. 숲 그린을 그대로 두면 어두운
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
    // 잉크는 검정이 아니라 초록 쪽으로 눕힌 먹색이다. 아이보리 종이 위에서
    // 순수한 검정은 튄다.
    text: '#1F2A26',
    background: '#FAF6EF',
    backgroundElement: '#FFFFFF',
    textSecondary: '#6C7A74',
    // 단추 글자는 전부 흰색이다. 숲 그린은 흰 글자에 8.4:1 이 나온다.
    accent: '#2F5D50',
    accentSoft: '#E4EEE9',
    border: '#E6DFD2',
  },
  dark: {
    text: '#ECF2EF',
    background: '#141A18',
    backgroundElement: '#1D2622',
    textSecondary: '#97A8A1',
    // 어두운 바탕에서는 숲 그린이 안 보인다. 밝은 쪽으로 뒤집고, 그 위의
    // 글자는 어두운 색으로 얹는다.
    accent: '#8FC4B2',
    accentSoft: '#223029',
    border: '#2D3A34',
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

/** 넓은 화면에서 한 줄이 끝없이 길어지지 않게. 태블릿을 벽에 걸어 두고 쓴다. */
export const MaxContentWidth = 900;
