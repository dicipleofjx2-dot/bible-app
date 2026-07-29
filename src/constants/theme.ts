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

/** David Bible's single calm/premium theme — Deep Navy + Warm Ivory + Gold
 * accent + Sage Green support, light and dark. Replaced the old 4-skin
 * picker (coral/mint/sunset/ocean) for a consistent brand identity. */
export const Skins: Record<SkinId, Skin> = {
  david: {
    label: 'David Bible',
    colors: {
      light: {
        text: '#16233D',
        background: '#FAF6EF',
        backgroundElement: '#F1EADC',
        backgroundSelected: '#C9A24B',
        textSecondary: '#6B6558',
        accent: '#C9A24B',
        support: '#8FA98C',
      },
      dark: {
        text: '#F5EFE3',
        background: '#0B1424',
        backgroundElement: '#16213A',
        backgroundSelected: '#D4AF6A',
        textSecondary: '#A9AFC0',
        accent: '#D4AF6A',
        support: '#9FBF9C',
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
