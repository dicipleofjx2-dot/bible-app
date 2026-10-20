import { Pressable, StyleSheet, TextInput, View, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import type { GrowthLevel } from '@/lib/growth';

/**
 * 성장ON 화면들이 함께 쓰는 조각들.
 *
 * 사명기록관(`features/mission/ui.tsx`)과 뼈대는 같지만 **글자를 키우지
 * 않았다.** 그쪽은 은퇴를 앞둔 사역자가 쓰고, 이쪽은 교사가 아이 스무 명을
 * 훑는 화면이다 — 기획서 §7 이 「교사 화면은 정보 밀도를 높이고」라고 못박았다.
 *
 * 평가 색을 빨강으로 두지 않는다(§7). 「도움 필요」는 아이의 잘못이 아니라
 * 교사가 할 일이라, 경고색으로 칠하면 화면이 아이를 나무라는 것처럼 읽힌다.
 */

export function GrowthCard({ children, style }: { children: React.ReactNode; style?: object }) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }, style]}>
      {children}
    </ThemedView>
  );
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <ThemedText style={Type.itemTitle}>{children}</ThemedText>
      {hint ? (
        <ThemedText themeColor="textSecondary" style={Type.caption}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  hint,
  keyboardType,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
  keyboardType?: 'default' | 'number-pad';
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      {label ? (
        <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
        ]}
      />
      {hint ? (
        <ThemedText themeColor="textSecondary" style={Type.caption}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  tone = 'accent',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'accent' | 'quiet';
}) {
  const theme = useTheme();
  // 어두운 모드의 accent 는 밝은 살구색이다. 밝은 바탕엔 어두운 글자를 얹는다
  // (features/mission/ui.tsx 에서 같은 대비 문제를 겪었다).
  const isDark = useColorScheme() === 'dark';
  const background = tone === 'accent' ? theme.accent : theme.accentSoft;
  const color = tone === 'accent' ? (isDark ? '#241A16' : '#FFFFFF') : theme.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
      ]}>
      <ThemedText style={[Type.itemTitle, { color } as TextStyle]}>{label}</ThemedText>
    </Pressable>
  );
}

/** 하나만 고르는 알약 줄. */
export function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
  allowNull,
}: {
  label?: string;
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (id: T | null) => void;
  allowNull?: boolean;
}) {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';
  return (
    <View style={styles.field}>
      {label ? (
        <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>
          {label}
        </ThemedText>
      ) : null}
      <View style={styles.chips}>
        {options.map((option) => {
          const on = option.id === value;
          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(on && allowNull ? null : option.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: on ? theme.accent : 'transparent',
                  borderColor: on ? theme.accent : theme.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <ThemedText
                style={[
                  Type.caption,
                  { color: on ? (isDark ? '#241A16' : '#FFFFFF') : theme.textSecondary } as TextStyle,
                ]}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** 여럿 고르는 알약 줄. 여러 학생에게 같은 기록을 한 번에 넣을 때 쓴다. */
export function MultiChipRow<T extends string>({
  label,
  options,
  values,
  onToggle,
  onAll,
}: {
  label?: string;
  options: { id: T; label: string; marker?: string }[];
  values: T[];
  onToggle: (id: T) => void;
  onAll?: () => void;
}) {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';
  return (
    <View style={styles.field}>
      <View style={styles.rowBetween}>
        {label ? (
          <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>
            {label} · {values.length}명
          </ThemedText>
        ) : (
          <View />
        )}
        {onAll ? (
          <Pressable onPress={onAll}>
            <ThemedText style={[Type.caption, { color: theme.accent } as TextStyle]}>
              {values.length === options.length ? '모두 해제' : '모두 선택'}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.chips}>
        {options.map((option) => {
          const on = values.includes(option.id);
          return (
            <Pressable
              key={option.id}
              onPress={() => onToggle(option.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: on ? theme.accent : 'transparent',
                  borderColor: on ? theme.accent : theme.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <ThemedText
                style={[
                  Type.caption,
                  { color: on ? (isDark ? '#241A16' : '#FFFFFF') : theme.textSecondary } as TextStyle,
                ]}>
                {option.marker ? `${option.marker} ` : ''}
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Bar({ value, max = 100 }: { value: number; max?: number }) {
  const theme = useTheme();
  const ratio = max === 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <View style={[styles.barTrack, { backgroundColor: theme.accentSoft }]}>
      <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: theme.accent }]} />
    </View>
  );
}

/**
 * 관찰 단계 배지.
 *
 * 「도움 필요」에 빨강을 쓰지 않는다(§7). `support`(흐린 청회색)로 둔다 —
 * 눈에는 걸리되 나무라지 않는 색이다.
 */
export function LevelBadge({ level }: { level: GrowthLevel | null }) {
  const theme = useTheme();
  if (!level) return null;
  const map: Record<GrowthLevel, { label: string; bg: string; fg: string }> = {
    great: { label: '매우 좋음', bg: theme.done, fg: '#FFFFFF' },
    good: { label: '좋음', bg: theme.accentSoft, fg: theme.accent },
    ok: { label: '보통', bg: theme.backgroundElement, fg: theme.textSecondary },
    help: { label: '도움 필요', bg: theme.support, fg: '#FFFFFF' },
  };
  const s = map[level];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <ThemedText style={[Type.caption, { color: s.fg } as TextStyle]}>{s.label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  sectionTitle: { gap: 2, marginTop: Spacing.one },
  field: { gap: Spacing.one },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 15,
    lineHeight: 22,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  button: { borderRadius: 14, paddingVertical: Spacing.two + 4, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 6 },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
});
