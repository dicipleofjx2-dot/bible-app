/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export type ThemeColor = 'text' | 'background' | 'backgroundElement' | 'backgroundSelected' | 'textSecondary';

export type SkinId = 'coral' | 'mint' | 'sunset' | 'ocean';

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

export const DEFAULT_SKIN: SkinId = 'coral';

/** Four selectable app-wide skins (see Profile screen). Each pairs a light and
 * dark palette plus a matching accent gradient for CTAs and the active tab. */
export const Skins: Record<SkinId, Skin> = {
  coral: {
    label: '코랄 바이올렛',
    colors: {
      light: {
        text: '#1A1523',
        background: '#FBF8FF',
        backgroundElement: '#F3ECFF',
        backgroundSelected: '#FFA36C',
        textSecondary: '#726B82',
      },
      dark: {
        text: '#ffffff',
        background: '#130F1C',
        backgroundElement: '#231C36',
        backgroundSelected: '#8B5CF6',
        textSecondary: '#B4ABC9',
      },
    },
    gradient: {
      light: ['#FFA36C', '#FF6FA5'],
      dark: ['#8B5CF6', '#5B3DF5'],
    },
  },
  mint: {
    label: '민트 드림',
    colors: {
      light: {
        text: '#0F2A24',
        background: '#F2FBF8',
        backgroundElement: '#DFF6EE',
        backgroundSelected: '#4FD1B5',
        textSecondary: '#4F7A70',
      },
      dark: {
        text: '#ffffff',
        background: '#081A16',
        backgroundElement: '#0F2E27',
        backgroundSelected: '#0D9488',
        textSecondary: '#8FBDB2',
      },
    },
    gradient: {
      light: ['#4FD1B5', '#38BDF8'],
      dark: ['#0D9488', '#0369A1'],
    },
  },
  sunset: {
    label: '선셋 오렌지',
    colors: {
      light: {
        text: '#2A1810',
        background: '#FFF7F0',
        backgroundElement: '#FFE8D6',
        backgroundSelected: '#FF8C5A',
        textSecondary: '#8A6A55',
      },
      dark: {
        text: '#ffffff',
        background: '#1C0F0A',
        backgroundElement: '#2E1B12',
        backgroundSelected: '#C2410C',
        textSecondary: '#C9A98C',
      },
    },
    gradient: {
      light: ['#FF8C5A', '#FFC24B'],
      dark: ['#C2410C', '#7C2D12'],
    },
  },
  ocean: {
    label: '오로라 블루',
    colors: {
      light: {
        text: '#0E1A2B',
        background: '#F4F9FF',
        backgroundElement: '#E1EEFF',
        backgroundSelected: '#60A5FA',
        textSecondary: '#5A7290',
      },
      dark: {
        text: '#ffffff',
        background: '#070F1F',
        backgroundElement: '#0F1E36',
        backgroundSelected: '#4F46E5',
        textSecondary: '#9AAECB',
      },
    },
    gradient: {
      light: ['#60A5FA', '#818CF8'],
      dark: ['#4F46E5', '#7C3AED'],
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
