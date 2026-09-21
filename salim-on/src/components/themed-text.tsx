import { StyleSheet, Text, type TextProps } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small';
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
        style,
      ]}
      {...rest}
    />
  );
}

// 줄간격은 한글 기준으로 넉넉히 잡는다 — 같은 크기라도 라틴 문자보다 빽빽해 보인다.
const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 26 },
  title: { fontSize: 30, lineHeight: 40, fontWeight: '700' },
  small: { fontSize: 14, lineHeight: 21 },
});
