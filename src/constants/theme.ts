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

/** 데이빗바이블의 단일 테마 — 살구빛 종이 + 산호색 강조 + Gold 성취.
 *
 * 색을 두 번 갈아입었다. 처음엔 따뜻한 아이보리(#FAF6EF), 2026-08 여름엔 시원한
 * 바다빛(#E9F1F7), 그리고 2026-08-22 에 다시 따뜻한 살구빛으로 왔다. 통독도우미를
 * 파스텔로 바꾸자는 이야기에서 시작했는데, **한 앱에 두 벌을 두면 화면을 옮길
 * 때마다 다른 앱에 들어온 것처럼 보여서** 전체를 옮기기로 했다.
 *
 * 푸른색을 통째로 버리지는 않았다. `support` 에 흐린 청회색으로 남겨 두 번째
 * 색으로 쓴다 — 새부대교회 홈페이지와 이어 주는 다리다.
 *
 * 강조색은 대비를 재서 정했다. 시안의 #DD8055 는 흰 글자에 2.9:1 이라 단추에
 * 못 쓴다(단추 글자는 전부 흰색이다). 한 단계 누른 #BC5C35 가 4.5:1.
 *
 * (예전 4가지 스킨 선택기는 브랜드 일관성을 위해 없앴다.) */
export const Skins: Record<SkinId, Skin> = {
  david: {
    label: 'David Bible',
    colors: {
      light: {
        // 살구빛 종이. 바탕을 한 겹 낮추고 카드(backgroundElement)를 흰색으로
        // 띄워 카드가 위에 있는 것으로 읽히게 했다.
        text: '#40302A',
        background: '#FBF2EA',
        backgroundElement: '#FFFFFF',
        // 시안의 산호색은 #DD8055 였는데, 흰 글자를 얹으면 대비가 2.9:1 밖에
        // 안 나온다. 한 단계 눌러 4.5:1 을 맞췄다 — 단추 글자는 전부 흰색이다.
        backgroundSelected: '#BC5C35',
        textSecondary: '#907A70',
        accent: '#BC5C35',
        // 원래의 푸른색을 흐린 청회색으로 남긴다. 새부대교회 홈페이지와 이어
        // 주는 다리이자, 따뜻한 색만으로는 구분이 안 되는 자리에 쓸 두 번째 색.
        support: '#6E8C99',
        border: '#F1E0D3',
        accentSoft: '#FBE6D8',
        done: '#E9B44C',
        readingBackground: '#FAF4ED',
      },
      dark: {
        // 저녁 흙빛. 밝은 모드와 같은 계열로 맞춰 한 가족으로 읽히게 했다.
        text: '#F3E6DD',
        background: '#241A16',
        backgroundElement: '#33241E',
        backgroundSelected: '#EC9A70',
        textSecondary: '#B79E92',
        accent: '#EC9A70',
        support: '#9DB8C4',
        border: '#45322A',
        accentSoft: '#4A3126',
        done: '#E9B44C',
        readingBackground: '#1F1512',
      },
    },
    // 「오늘의 말씀」 히어로 카드에만 쓴다. 그 위 글자는 전부 흰색이라 **밝은
    // 쪽 끝**이 대비를 정한다. 시안의 #DD8055 는 흰 글자에 2.9:1 이라 지금
    // 쓰는 #2E8FBF(3.6:1)보다 떨어진다 — #CE6E44 로 눌러 3.5:1 을 맞췄다.
    gradient: {
      light: ['#A9502C', '#CE6E44'],
      dark: ['#7A3E22', '#A85F38'],
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
