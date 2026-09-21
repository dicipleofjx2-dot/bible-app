export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const MaxContentWidth = 720;

export type Palette = {
  background: string;
  card: string;
  cardMuted: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentSoft: string;
  /** 밝은 accent 위에 얹는 글자색. 어두운 모드의 accent 에 흰 글자를 얹으면 대비가 2:1도 안 나온다. */
  onAccent: string;
  danger: string;
  positive: string;
};

export const LightTheme: Palette = {
  background: '#F7F5F2',
  card: '#FFFFFF',
  cardMuted: '#F1EEE9',
  text: '#20242B',
  textMuted: '#6B7280',
  border: '#E3DED7',
  accent: '#2F6F5E',
  accentSoft: '#DCEBE4',
  onAccent: '#FFFFFF',
  danger: '#B4453A',
  positive: '#2F6F5E',
};

export const DarkTheme: Palette = {
  background: '#14171C',
  card: '#1D2128',
  cardMuted: '#252A33',
  text: '#ECEDEF',
  textMuted: '#9AA1AC',
  border: '#2E343E',
  accent: '#6FBFA4',
  accentSoft: '#22382F',
  onAccent: '#10221B',
  danger: '#E4796C',
  positive: '#6FBFA4',
};
