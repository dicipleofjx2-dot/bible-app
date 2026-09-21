import { Text, View, type TextProps, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function ThemedView({ style, ...rest }: ViewProps) {
  const { palette } = useTheme();
  return <View style={[{ backgroundColor: palette.background }, style]} {...rest} />;
}

export function Card({ style, ...rest }: ViewProps) {
  const { palette } = useTheme();
  return (
    <View
      style={[{ backgroundColor: palette.card, borderRadius: 14, borderWidth: 1, borderColor: palette.border, padding: 16 }, style]}
      {...rest}
    />
  );
}

type ThemedTextProps = TextProps & { tone?: 'default' | 'muted' | 'accent' | 'danger' };

export function ThemedText({ style, tone = 'default', ...rest }: ThemedTextProps) {
  const { palette } = useTheme();
  const color =
    tone === 'muted' ? palette.textMuted : tone === 'accent' ? palette.accent : tone === 'danger' ? palette.danger : palette.text;
  return <Text style={[{ color, fontSize: 16 }, style]} {...rest} />;
}
