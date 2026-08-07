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
  | 'support'
  // 2026-08 푸른 계통 개편에서 더한 것들.
  // 예전에는 바탕과 카드의 명도 차이만으로 층을 나눠서 화면이 평평해 보였다.
  | 'border' // 카드 테두리 — 1px 선 하나로 경계가 또렷해진다
  | 'accentSoft' // 배지·연한 강조 바탕
  | 'done' // 완료·달성 표시. 푸른 화면에서 성취만 따뜻한 색으로 눈에 걸리게
  | 'readingBackground'; // 성경·전자책처럼 오래 보는 화면. 채도를 한 단계 낮춘다

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
        // 아침 바다. 바탕을 한 겹 낮추고 카드(backgroundElement)를 흰색으로 띄워
        // 카드가 위에 있는 것으로 읽히게 했다.
        text: '#0F2433',
        background: '#E9F1F7',
        backgroundElement: '#FFFFFF',
        backgroundSelected: '#1F6FA8',
        textSecondary: '#5C7A8E',
        accent: '#1F6FA8',
        support: '#2E93A0',
        border: '#DCE8F1',
        accentSoft: '#E4F0F8',
        done: '#F4C25A',
        readingBackground: '#EDF3F7',
      },
      dark: {
        // 깊은 바다. 밝은 모드와 같은 계열로 맞춰 한 가족으로 읽히게 했다.
        text: '#E6F0F6',
        background: '#08202D',
        backgroundElement: '#0F2C3C',
        backgroundSelected: '#5AB0DC',
        textSecondary: '#8CA9BA',
        accent: '#5AB0DC',
        support: '#5FC2CC',
        border: '#17394C',
        accentSoft: '#153B50',
        done: '#F4C25A',
        readingBackground: '#071C27',
      },
    },
    gradient: {
      light: ['#1F6FA8', '#2E8FBF'],
      dark: ['#12496E', '#1B6C96'],
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
