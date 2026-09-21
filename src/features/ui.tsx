import { Pressable, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Button({
  label,
  onPress,
  tone = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'plain' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { palette } = useTheme();
  const background = tone === 'primary' ? palette.accent : tone === 'danger' ? palette.danger : 'transparent';
  // 밝은 accent 위에는 어두운 글자를 얹는다 — 어두운 모드의 accent 에 흰 글자는
  // 대비가 2:1도 안 나온다.
  const color = tone === 'plain' ? palette.text : tone === 'primary' ? palette.onAccent : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: background,
          borderWidth: tone === 'plain' ? 1 : 0,
          borderColor: palette.border,
          borderRadius: 12,
          paddingVertical: 13,
          paddingHorizontal: Spacing.lg,
          alignItems: 'center',
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}>
      <ThemedText style={{ color, fontWeight: '700', fontSize: 16 }}>{label}</ThemedText>
    </Pressable>
  );
}

export function Chip({
  label,
  color,
  selected,
  onPress,
}: {
  label: string;
  color?: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const { palette } = useTheme();
  const background = selected ? (color ?? palette.accent) : palette.cardMuted;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={{
        backgroundColor: background,
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: selected ? 'transparent' : palette.border,
      }}>
      <ThemedText style={{ fontSize: 13, fontWeight: '600', color: selected ? '#1A1A1A' : palette.textMuted }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** 갈래별 크기를 보여 주는 가로 막대. 원그래프보다 길이 견주기가 쉽다. */
export function Bar({ ratio, color }: { ratio: number; color: string }) {
  const { palette } = useTheme();
  const width = `${Math.max(0, Math.min(1, ratio)) * 100}%` as const;
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.cardMuted, overflow: 'hidden' }}>
      <View style={{ height: 8, width, backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }, style]}>{children}</View>;
}
