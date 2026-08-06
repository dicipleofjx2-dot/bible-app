import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { FontFamily } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

// 커스텀 TTF는 fontWeight를 무시한다 — 굵기는 패밀리 이름으로 고른다.
// fontWeight를 같이 주면 안드로이드가 가짜 굵게를 덧입혀 획이 뭉개지므로 뺐다.
// 줄간격은 한글 기준으로 넉넉히 잡았다(같은 크기라도 라틴 문자보다 빽빽해 보인다).
const styles = StyleSheet.create({
  small: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  smallBold: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    lineHeight: 21,
  },
  default: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 26,
  },
  title: {
    fontFamily: FontFamily.display,
    fontSize: 34,
    lineHeight: 44,
  },
  subtitle: {
    fontFamily: FontFamily.display,
    fontSize: 24,
    lineHeight: 34,
  },
  link: {
    fontFamily: FontFamily.regular,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: FontFamily.bold,
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
