import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
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

// 기기 기본 서체를 쓰므로 굵기는 fontWeight로 준다.
// 줄간격은 한글 기준으로 넉넉히 잡았다(같은 크기라도 라틴 문자보다 빽빽해 보인다).
const styles = StyleSheet.create({
  small: {
    
    fontSize: 14,
    lineHeight: 21,
  },
  smallBold: {
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 21,
  },
  default: {
    
    fontSize: 16,
    lineHeight: 26,
  },
  title: {
    fontWeight: '700',
    fontSize: 34,
    lineHeight: 44,
  },
  subtitle: {
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 34,
  },
  link: {
    
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontWeight: '700',
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
