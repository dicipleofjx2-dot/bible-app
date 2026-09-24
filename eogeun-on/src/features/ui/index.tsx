import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';

/** 화면 틀 — 가운데 한 줄, 넓은 화면에서도 640 을 넘지 않는다. */
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const inner = <View style={styles.inner}>{children}</View>;
  return scroll ? (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.scroll, { paddingBottom: Spacing.five + insets.bottom }]}
      keyboardShouldPersistTaps="handled">
      {inner}
    </ScrollView>
  ) : (
    <View style={[styles.scroll, { flex: 1, backgroundColor: theme.background, paddingBottom: insets.bottom }]}>{inner}</View>
  );
}

export function Card({ children, style, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'good' | 'bad' | 'gold' | 'accent' }) {
  const theme = useTheme();
  const bg = tone ? theme[`${tone}Soft` as ThemeColor] : theme.backgroundElement;
  const border = tone ? theme[tone] : theme.border;
  return <View style={[styles.card, { backgroundColor: bg, borderColor: border }, style]}>{children}</View>;
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <View style={{ gap: Spacing.one }}>
      <ThemedText style={Type.screenTitle}>{children}</ThemedText>
      {sub ? <ThemedText themeColor="textSecondary" style={Type.body}>{sub}</ThemedText> : null}
    </View>
  );
}

export function Section({ children }: { children: ReactNode }) {
  return <ThemedText themeColor="textSecondary" style={[Type.sectionTitle, { marginTop: Spacing.two }]}>{children}</ThemedText>;
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'good' | 'bad';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  big,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  big?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const map: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: theme.accent, fg: theme.onAccent, border: theme.accent },
    secondary: { bg: theme.backgroundElement, fg: theme.accent, border: theme.border },
    ghost: { bg: 'transparent', fg: theme.textSecondary, border: 'transparent' },
    good: { bg: theme.goodSoft, fg: theme.good, border: theme.good },
    bad: { bg: theme.badSoft, fg: theme.bad, border: theme.bad },
  };
  const c = map[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        big && styles.buttonBig,
        { backgroundColor: c.bg, borderColor: c.border, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}>
      <ThemedText style={[big ? Type.itemTitle : styles.buttonText, { color: c.fg, textAlign: 'center' }]}>{label}</ThemedText>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, disabled }: { label: string; selected?: boolean; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accent : theme.backgroundElement, opacity: disabled ? 0.45 : 1 },
      ]}>
      <ThemedText style={[styles.buttonText, { color: selected ? theme.onAccent : theme.text }]}>{label}</ThemedText>
    </Pressable>
  );
}

export function Badge({ label, tone = 'accent' }: { label: string; tone?: 'good' | 'bad' | 'gold' | 'accent' }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: theme[`${tone}Soft` as ThemeColor] }]}>
      <ThemedText style={[Type.caption, { color: theme[tone], fontWeight: '700' }]}>{label}</ThemedText>
    </View>
  );
}

export function Bar({ value, total }: { value: number; total: number }) {
  const theme = useTheme();
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <View style={[styles.bar, { backgroundColor: theme.accentSoft }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: value }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: theme.accent, borderRadius: 999 }} />
    </View>
  );
}

export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card style={{ flex: 1, minWidth: 100, gap: Spacing.half }}>
      <ThemedText themeColor="textSecondary" style={Type.caption}>{label}</ThemedText>
      <ThemedText style={{ fontSize: 26, lineHeight: 32, fontWeight: '700' }}>{value}</ThemedText>
      {note ? <ThemedText themeColor="textSecondary" style={Type.caption}>{note}</ThemedText> : null}
    </Card>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  card: { borderWidth: 1, borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  button: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: Spacing.three, minHeight: 48, justifyContent: 'center' },
  buttonBig: { paddingVertical: 16, minHeight: 58, borderRadius: 14 },
  buttonText: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  badge: { borderRadius: 999, paddingVertical: 2, paddingHorizontal: 10, alignSelf: 'flex-start' },
  bar: { height: 10, borderRadius: 999, overflow: 'hidden', width: '100%' },
});
