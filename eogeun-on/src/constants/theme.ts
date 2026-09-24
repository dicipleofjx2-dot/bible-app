import { Platform } from 'react-native';

/**
 * 어근영단어ON 의 색.
 *
 *   잉크 블루  #2B4C7E — 공책의 파란 줄, 집중 (주색, 흰 글자 8.6:1)
 *   연필 노랑  #F2C14E — 새 단어, 눈여겨볼 것 (칠하는 색. 글자로는 #7A5A0C)
 *   초록       #2F6B4F — 맞음
 *   벽돌       #A9442A — 틀림(글자로도 흰 바탕 6.1:1)
 *
 * **맞음·틀림을 색만으로 가르지 않는다** — 늘 ⭕/✖ 와 글자를 같이 둔다.
 * 어두운 모드에서는 주색을 밝게 뒤집고, 그 위 글자는 어두운 색(onAccent)으로 얹는다.
 */

export type ThemeColor =
  | 'text'
  | 'background'
  | 'backgroundElement'
  | 'textSecondary'
  | 'accent'
  | 'accentSoft'
  | 'onAccent'
  | 'border'
  | 'good'
  | 'goodSoft'
  | 'bad'
  | 'badSoft'
  | 'gold'
  | 'goldSoft';

export const Colors: Record<'light' | 'dark', Record<ThemeColor, string>> = {
  light: {
    text: '#1B2433',
    background: '#F6F7FB',
    backgroundElement: '#FFFFFF',
    textSecondary: '#5E6878',
    accent: '#2B4C7E',
    accentSoft: '#E3EAF5',
    onAccent: '#FFFFFF',
    border: '#DDE2EC',
    good: '#2F6B4F',
    goodSoft: '#E2F0E8',
    bad: '#A9442A',
    badSoft: '#FAE4DC',
    gold: '#7A5A0C',
    goldSoft: '#FCF1D2',
  },
  dark: {
    text: '#E8EDF6',
    background: '#10141C',
    backgroundElement: '#1A2030',
    textSecondary: '#9AA5B8',
    accent: '#9DB8E6',
    accentSoft: '#1F2A40',
    onAccent: '#0F1830',
    border: '#2A3346',
    good: '#8FD1AE',
    goodSoft: '#1B3027',
    bad: '#F0A189',
    badSoft: '#3A231C',
    gold: '#F2C14E',
    goldSoft: '#3A3120',
  },
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace' },
  default: { sans: 'normal', mono: 'monospace' },
  web: { sans: 'system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', mono: 'monospace' },
});

export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;

export const MaxContentWidth = 640;
