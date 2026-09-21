import { LinearGradient } from 'expo-linear-gradient';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import type { Tone } from '@/lib/chores';

/**
 * 살림ON 이 함께 쓰는 조각들.
 *
 * 화면마다 같은 카드·입력칸을 따로 두면 간격과 색이 조금씩 어긋난다. 여기
 * 모아 한 번에 손본다.
 *
 * **색만으로 상태를 가르지 않는다** — 배지에는 늘 글자나 그림글자를 같이
 * 둔다. 늦음과 끝냄을 초록·빨강으로만 갈라 두면 색을 못 가리는 사람에게는
 * 같은 화면이다.
 */

export type Palette = {
  green: string;
  greenSoft: string;
  gold: string;
  goldSoft: string;
  clay: string;
  claySoft: string;
  muted: string;
  mutedSoft: string;
  heroFrom: string;
  heroTo: string;
};

export function usePalette(): Palette {
  const dark = useColorScheme() === 'dark';
  return dark
    ? {
        green: '#8FC4B2',
        greenSoft: '#213029',
        gold: '#E5C273',
        goldSoft: '#3A3324',
        clay: '#EE9C7F',
        claySoft: '#3D271F',
        muted: '#97A8A1',
        mutedSoft: '#222C28',
        heroFrom: '#17221E',
        heroTo: '#2A3C34',
      }
    : {
        green: '#2F5D50', // 흰 글자에 8.4:1 — 배지 글자로도 쓸 수 있다
        greenSoft: '#E4EEE9',
        gold: '#8A6314', // 칠하는 머스터드는 #D9A441, 글자로 쓰는 짝은 이것
        goldSoft: '#FBF1D8',
        clay: '#A9442A', // 칠하는 테라코타는 #C96F4A
        claySoft: '#FAE4DC',
        muted: '#6C7A74',
        mutedSoft: '#EFEBE3',
        heroFrom: '#2F5D50',
        heroTo: '#4B8272',
      };
}

export function toneColors(tone: Tone, palette: Palette): { fg: string; bg: string } {
  switch (tone) {
    case 'good':
      return { fg: palette.green, bg: palette.greenSoft };
    case 'warn':
      return { fg: palette.gold, bg: palette.goldSoft };
    case 'alert':
      return { fg: palette.clay, bg: palette.claySoft };
    default:
      return { fg: palette.muted, bg: palette.mutedSoft };
  }
}

// ── 그릇 ────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const body = (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }, style]}>
      {children}
    </ThemedView>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}>
      {body}
    </Pressable>
  );
}

export function Hero({
  title,
  subtitle,
  emoji,
  right,
}: {
  title: string;
  subtitle?: string;
  emoji?: string;
  right?: React.ReactNode;
}) {
  const palette = usePalette();
  return (
    <LinearGradient
      colors={[palette.heroFrom, palette.heroTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}>
      <View style={styles.heroRow}>
        <View style={styles.heroText}>
          <ThemedText style={[Type.screenTitle, styles.heroTitle]}>
            {emoji ? `${emoji} ` : ''}
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText style={[Type.itemDescription, styles.heroSubtitle]}>{subtitle}</ThemedText>
          ) : null}
        </View>
        {right}
      </View>
    </LinearGradient>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <ThemedText style={Type.itemTitle}>{title}</ThemedText>
      {action}
    </View>
  );
}

export function EmptyNote({ text, emoji = '🧺' }: { text: string; emoji?: string }) {
  return (
    <View style={styles.empty}>
      <ThemedText style={styles.emptyEmoji}>{emoji}</ThemedText>
      <ThemedText themeColor="textSecondary" style={[Type.itemDescription, { textAlign: 'center' }]}>
        {text}
      </ThemedText>
    </View>
  );
}

export function Badge({ label, tone = 'calm', emoji }: { label: string; tone?: Tone; emoji?: string }) {
  const palette = usePalette();
  const { fg, bg } = toneColors(tone, palette);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <ThemedText style={[Type.caption, { color: fg, fontWeight: '600' } as TextStyle]}>
        {emoji ? `${emoji} ` : ''}
        {label}
      </ThemedText>
    </View>
  );
}

/** 오늘 어디까지 왔는지. 숫자만 적으면 한눈에 안 들어온다. */
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const theme = useTheme();
  const palette = usePalette();
  const ratio = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <View style={styles.progressWrap}>
      <View style={[styles.progressTrack, { backgroundColor: theme.accentSoft }]}>
        <View
          style={[styles.progressFill, { backgroundColor: palette.green, width: `${ratio * 100}%` }]}
        />
      </View>
      <ThemedText themeColor="textSecondary" style={Type.caption}>
        {total > 0 ? `${done} / ${total} 끝냄` : '오늘 할 일이 없습니다'}
      </ThemedText>
    </View>
  );
}

// ── 입력 ────────────────────────────────────────────────────────────

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  secureTextEntry,
  hint,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  secureTextEntry?: boolean;
  hint?: string;
  autoCapitalize?: 'none' | 'characters';
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? (secureTextEntry ? 'none' : undefined)}
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
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'accent' | 'quiet' | 'danger';
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const palette = usePalette();
  const isDark = useColorScheme() === 'dark';
  // 어두운 모드의 강조색은 밝은 연둣빛이다. 그 위에 흰 글자를 얹으면 대비가
  // 2:1 도 안 나온다 — 밝은 바탕에는 어두운 글자를 얹는다.
  const background =
    tone === 'accent' ? theme.accent : tone === 'danger' ? palette.claySoft : theme.accentSoft;
  const color =
    tone === 'accent' ? (isDark ? '#141A18' : '#FFFFFF') : tone === 'danger' ? palette.clay : theme.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
        style,
      ]}>
      <ThemedText style={[Type.itemTitle, { color } as TextStyle]}>{label}</ThemedText>
    </Pressable>
  );
}

export function QuickButton({
  emoji,
  label,
  onPress,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quick,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
      ]}>
      <ThemedText style={styles.quickEmoji}>{emoji}</ThemedText>
      <ThemedText style={Type.caption} numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
  allowEmpty,
}: {
  label?: string;
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (id: T | null) => void;
  allowEmpty?: boolean;
}) {
  const theme = useTheme();
  // 훅은 목록을 돌기 **전에** 부른다. map 안에서 부르면 선택지 수가 바뀔 때
  // 훅 차례가 어긋나 리액트가 통째로 무너진다.
  const dark = useColorScheme() === 'dark';
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
              onPress={() => onChange(on && allowEmpty ? null : option.id)}
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
                  { color: on ? (dark ? '#141A18' : '#FFFFFF') : theme.textSecondary } as TextStyle,
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

/** 요일 고르기. 여러 개를 같이 켠다 — 「매주 화·목」이 흔한 살림이다. */
export function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (next: number[]) => void;
}) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const names = ['일', '월', '화', '수', '목', '금', '토'];
  return (
    <View style={styles.field}>
      <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>
        요일
      </ThemedText>
      <View style={styles.chips}>
        {names.map((name, index) => {
          const on = value.includes(index);
          return (
            <Pressable
              key={name}
              onPress={() =>
                onChange(on ? value.filter((d) => d !== index) : [...value, index].sort((a, b) => a - b))
              }
              style={({ pressed }) => [
                styles.weekday,
                {
                  backgroundColor: on ? theme.accent : 'transparent',
                  borderColor: on ? theme.accent : theme.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <ThemedText
                style={[Type.caption, { color: on ? (dark ? '#141A18' : '#FFFFFF') : theme.textSecondary } as TextStyle]}>
                {name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** 숫자 조절. 누르는 자리를 크게 잡았다 — 젖은 손으로도 눌러야 한다. */
export function Stepper({
  label,
  value,
  step = 1,
  min = 1,
  max = 600,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  onChange: (next: number) => void;
}) {
  const theme = useTheme();
  const palette = usePalette();
  return (
    <View style={styles.field}>
      <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>
        {label}
      </ThemedText>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          style={({ pressed }) => [
            styles.stepButton,
            { backgroundColor: palette.claySoft, opacity: value <= min ? 0.4 : pressed ? 0.7 : 1 },
          ]}>
          <ThemedText style={[styles.stepSign, { color: palette.clay } as TextStyle]}>−</ThemedText>
        </Pressable>
        <View style={styles.stepValue}>
          <ThemedText style={styles.stepNumber}>{value}</ThemedText>
          {suffix ? (
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              {suffix}
            </ThemedText>
          ) : null}
        </View>
        <Pressable
          onPress={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          style={({ pressed }) => [
            styles.stepButton,
            { backgroundColor: theme.accentSoft, opacity: value >= max ? 0.4 : pressed ? 0.7 : 1 },
          ]}>
          <ThemedText style={[styles.stepSign, { color: theme.accent } as TextStyle]}>＋</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

/** 별점. 확인하는 사람이 누른다. 숫자도 같이 적는다 — 별만으로는 안 읽힌다. */
export function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const palette = usePalette();
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <ThemedText style={styles.star}>{n <= value ? '★' : '☆'}</ThemedText>
        </Pressable>
      ))}
      <ThemedText style={[Type.caption, { color: palette.gold, marginLeft: Spacing.two } as TextStyle]}>
        ★{value}
      </ThemedText>
    </View>
  );
}

export function Toggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => onChange(!value)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <View style={styles.toggleRow}>
        <View
          style={[
            styles.toggleBox,
            { borderColor: value ? theme.accent : theme.border, backgroundColor: value ? theme.accent : 'transparent' },
          ]}>
          {value ? <ThemedText style={styles.toggleMark}>✓</ThemedText> : null}
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={Type.body}>{label}</ThemedText>
          {hint ? (
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              {hint}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  hero: { borderRadius: 20, padding: Spacing.four, gap: Spacing.two },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  heroText: { flex: 1, gap: Spacing.one },
  heroTitle: { color: '#FFFFFF' },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)' },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  emptyEmoji: { fontSize: 32 },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  progressWrap: { gap: Spacing.one },
  progressTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  field: { gap: Spacing.one },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  button: {
    borderRadius: 14,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  quick: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  quickEmoji: { fontSize: 24 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  weekday: {
    borderWidth: 1,
    borderRadius: 999,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 24, fontWeight: '700', lineHeight: 28 },
  stepValue: { flex: 1, alignItems: 'center' },
  stepNumber: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  star: { fontSize: 30, lineHeight: 36 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.one },
  toggleBox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  toggleMark: { color: '#FFFFFF', fontSize: 16, lineHeight: 20, fontWeight: '700' },
});
