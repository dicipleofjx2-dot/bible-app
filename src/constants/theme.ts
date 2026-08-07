/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export type ThemeColor =
  | 'text'
  | 'background'
  | 'backgroundElement'
  | 'backgroundSelected'
  | 'textSecondary'
  | 'accent'
  | 'support';

export type SkinId = 'david';

type Skin = {
  label: string;
  colors: {
    light: Record<ThemeColor, string>;
    dark: Record<ThemeColor, string>;
  };
  gradient: {
    light: readonly [string, string];
    dark: readonly [string, string];
  };
};

export const DEFAULT_SKIN: SkinId = 'david';

/** 데이빗바이블의 단일 테마 — Deep Navy 글자 + 옅은 바다빛 바탕 + Gold 강조.
 *
 * 원래 바탕은 따뜻한 아이보리(#FAF6EF)였는데, 2026-08 여름에 시원하게 읽히도록
 * 옅은 바다빛으로 바꿨다. 글자의 짙은 남색과 금색 강조는 그대로 둬서 브랜드가
 * 흐트러지지 않는다 — 모래와 바다처럼 맞물린다. 새부대교회 홈페이지도 같은
 * 색으로 맞춰 두어서 앱과 홈페이지가 한 브랜드로 읽힌다.
 * (예전 4가지 스킨 선택기는 브랜드 일관성을 위해 없앴다.) */
export const Skins: Record<SkinId, Skin> = {
  david: {
    label: 'David Bible',
    colors: {
      light: {
        text: '#16233D',
        background: '#F1F8FA',
        backgroundElement: '#DFEDF2',
        backgroundSelected: '#C9A24B',
        textSecondary: '#5C6B78',
        accent: '#C9A24B',
        support: '#4FA3A8',
      },
      dark: {
        // 어두운 모드도 남색에서 살짝 청록 쪽으로 옮겨 깊은 바다처럼.
        text: '#EDF3F5',
        background: '#08192A',
        backgroundElement: '#12283C',
        backgroundSelected: '#D4AF6A',
        textSecondary: '#9AAFBC',
        accent: '#D4AF6A',
        support: '#6FBFC4',
      },
    },
    gradient: {
      light: ['#C9A24B', '#E8C77E'],
      dark: ['#D4AF6A', '#F0D9A0'],
    },
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
