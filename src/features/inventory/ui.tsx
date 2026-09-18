import { Image } from 'expo-image';
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
import type { StatusTone } from '@/lib/inventory';

/**
 * 물품관리ON 이 함께 쓰는 조각들 — 「정돈된 공간 앨범」(기획서 §6.1).
 *
 * 화면마다 같은 카드·입력칸을 따로 두면 간격과 색이 조금씩 어긋난다. 여기 모아
 * 한 번에 손본다.
 *
 * ── 색 (기획서 §6.2) ────────────────────────────────────────────────
 * 딥 네이비가 주색이고, 세이지는 넉넉함, 골드는 눈여겨볼 것, 코랄은 부족·기한
 * 이다. 다만 **글자를 얹는 색과 칠하는 색을 갈랐다**: 세이지 #7FA58A 위의 흰
 * 글자는 2.3:1, 골드 #D6A84B 위는 1.9:1 이라 배지 글자로 쓸 수 없다. 넓은 면은
 * 시안 색 그대로 칠하고, 그 위의 글자에는 한 단계 눌러 둔 짝을 쓴다.
 *
 * 색만으로 상태를 가르지 않는다 — 배지에는 늘 글자나 그림글자를 같이 둔다
 * (§6.1 마지막 줄).
 */

export type InvPalette = {
  navy: string;
  navySoft: string;
  sage: string;
  sageSoft: string;
  gold: string;
  goldSoft: string;
  coral: string;
  coralSoft: string;
  /** 진한 바탕 위에 얹는 글자색. 바탕 밝기에 맞춰 흑/백을 고른다. */
  onStrong: string;
  heroFrom: string;
  heroTo: string;
};

export function useInvPalette(): InvPalette {
  const dark = useColorScheme() === 'dark';
  return dark
    ? {
        // 어두운 모드에서는 네이비가 바탕에 묻힌다. 같은 계열을 밝은 쪽으로
        // 뒤집고, 그 위 글자는 어두운 색으로 얹는다.
        navy: '#9DB8C4',
        navySoft: '#22323F',
        sage: '#A8C7B0',
        sageSoft: '#25352B',
        gold: '#E9C578',
        goldSoft: '#3C3423',
        coral: '#EE9084',
        coralSoft: '#3F261F',
        onStrong: '#121A22',
        heroFrom: '#16222D',
        heroTo: '#27394A',
      }
    : {
        navy: '#233B53', // 시안 그대로 — 흰 글자에 11:1
        navySoft: '#E6ECF2',
        sage: '#4F7D61', // 칠하는 세이지는 #7FA58A, 글자로 쓰는 짝은 이것
        sageSoft: '#E4EFE7',
        gold: '#8A6714', // 칠하는 골드는 #D6A84B
        goldSoft: '#FBF0D6',
        coral: '#B84134', // 칠하는 코랄은 #D96C5F
        coralSoft: '#FAE2DE',
        onStrong: '#FFFFFF',
        heroFrom: '#233B53',
        heroTo: '#3F6785',
      };
}

export function toneColors(tone: StatusTone, palette: InvPalette): { fg: string; bg: string } {
  switch (tone) {
    case 'good':
      return { fg: palette.sage, bg: palette.sageSoft };
    case 'warn':
      return { fg: palette.gold, bg: palette.goldSoft };
    case 'alert':
      return { fg: palette.coral, bg: palette.coralSoft };
    case 'calm':
      return { fg: palette.navy, bg: palette.navySoft };
    default:
      return { fg: palette.navy, bg: palette.navySoft };
  }
}

// ── 그릇 ────────────────────────────────────────────────────────────

export function InvCard({
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

/** 화면 맨 위 머리띠. 사진 앨범의 표지처럼 이 화면이 어디인지 한눈에 보인다. */
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
  const palette = useInvPalette();
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

// ── 사진 ────────────────────────────────────────────────────────────

/**
 * 사진 한 장을 담는 틀. **사진이 먼저 보이고 글자는 그 위에 얹는다**(§6.3).
 *
 * 사진이 없을 때 빈 회색 네모를 두면 목록이 공사장처럼 보인다. 부드러운
 * 그러데이션 위에 그 물품다운 그림글자를 하나 놓아 자리를 채운다.
 */
export function PhotoFrame({
  url,
  ratio = 4 / 3,
  emoji = '📦',
  caption,
  overlay,
  rounded = 16,
  style,
}: {
  url?: string;
  ratio?: number;
  emoji?: string;
  caption?: string;
  overlay?: React.ReactNode;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = useInvPalette();
  const theme = useTheme();
  return (
    <View style={[{ aspectRatio: ratio, borderRadius: rounded, overflow: 'hidden' }, style]}>
      {url ? (
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={160} />
      ) : (
        <LinearGradient
          colors={[palette.navySoft, theme.accentSoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <ThemedText style={styles.placeholderEmoji}>{emoji}</ThemedText>
        </LinearGradient>
      )}
      {caption ? (
        // 사진 위 글자는 반드시 어두운 반투명 바탕을 깔고 얹는다(§6.3).
        // 밝은 하늘이 찍힌 사진 위에서는 흰 글자만으로는 읽히지 않는다.
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)']}
          style={styles.captionWrap}
          pointerEvents="none">
          <ThemedText numberOfLines={2} style={[Type.itemTitle, styles.captionText]}>
            {caption}
          </ThemedText>
        </LinearGradient>
      ) : null}
      {overlay}
    </View>
  );
}

/** 공간 사진 위의 번호 핀(§4.2). 누르면 그 자리의 물품이 열린다. */
export function PhotoPin({
  label,
  x,
  y,
  onPress,
  active,
}: {
  label: string;
  x: number;
  y: number;
  onPress?: () => void;
  active?: boolean;
}) {
  const palette = useInvPalette();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pin,
        {
          // 퍼센트 문자열은 그냥 string 이라 DimensionValue 로 좁혀 준다.
          left: `${Math.min(Math.max(x, 0), 1) * 100}%` as `${number}%`,
          top: `${Math.min(Math.max(y, 0), 1) * 100}%` as `${number}%`,
          backgroundColor: active ? palette.gold : palette.navy,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      <ThemedText style={[Type.caption, { color: '#FFFFFF', fontWeight: '700' } as TextStyle]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

// ── 표시 ────────────────────────────────────────────────────────────

export function Badge({
  label,
  tone = 'calm',
  emoji,
}: {
  label: string;
  tone?: StatusTone;
  emoji?: string;
}) {
  const palette = useInvPalette();
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

/** 「물품 42종 · 총 118개 · 부족 4종」 한 줄(§4.1). */
export function StatLine({ text }: { text: string }) {
  return (
    <ThemedText themeColor="textSecondary" style={Type.caption} numberOfLines={1}>
      {text}
    </ThemedText>
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

export function EmptyNote({ text, emoji = '🗂️' }: { text: string; emoji?: string }) {
  return (
    <View style={styles.empty}>
      <ThemedText style={styles.emptyEmoji}>{emoji}</ThemedText>
      <ThemedText themeColor="textSecondary" style={[Type.itemDescription, { textAlign: 'center' }]}>
        {text}
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
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  secureTextEntry?: boolean;
  hint?: string;
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
        autoCapitalize={secureTextEntry ? 'none' : undefined}
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

export function SearchBox({
  value,
  onChangeText,
  onSubmit,
  placeholder = '무엇을 찾으시나요?',
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText style={styles.searchIcon}>🔍</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.searchInput, { color: theme.text }]}
      />
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
  const palette = useInvPalette();
  const isDark = useColorScheme() === 'dark';
  // 어두운 모드의 강조색은 밝은 하늘색이다. 그 위에 흰 글자를 얹으면 대비가
  // 2:1 도 안 나온다 — 밝은 바탕에는 어두운 글자를 얹는다.
  const background =
    tone === 'accent' ? theme.accent : tone === 'danger' ? palette.coralSoft : theme.accentSoft;
  const color =
    tone === 'accent' ? (isDark ? '#121A22' : '#FFFFFF') : tone === 'danger' ? palette.coral : theme.accent;
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

/** 홈의 빠른 단추 넉 장(§5.2). 그림글자를 크게 둬 멀리서도 눌러야 할 곳이 보인다. */
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
}: {
  label?: string;
  options: { id: T; label: string }[];
  value: T | null;
  onChange: (id: T) => void;
}) {
  const theme = useTheme();
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
              onPress={() => onChange(option.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: on ? theme.accent : 'transparent',
                  borderColor: on ? theme.accent : theme.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <ThemedText
                style={[Type.caption, { color: on ? '#FFFFFF' : theme.textSecondary } as TextStyle]}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * 수량 조절(§4.5). **누르는 자리를 크게** 잡았다 — 창고에서 장갑 낀 손으로도,
 * 눈이 침침한 분도 눌러야 하는 단추다.
 */
export function QtyStepper({
  qty,
  unit,
  onChange,
  disabled,
}: {
  qty: number;
  unit: string;
  onChange: (delta: number) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const palette = useInvPalette();
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(-1)}
        disabled={disabled || qty <= 0}
        style={({ pressed }) => [
          styles.stepButton,
          {
            backgroundColor: palette.coralSoft,
            opacity: disabled || qty <= 0 ? 0.4 : pressed ? 0.7 : 1,
          },
        ]}>
        <ThemedText style={[styles.stepSign, { color: palette.coral } as TextStyle]}>−</ThemedText>
      </Pressable>
      <View style={styles.stepValue}>
        <ThemedText style={styles.stepNumber}>{Number.isInteger(qty) ? qty : qty.toFixed(1)}</ThemedText>
        <ThemedText themeColor="textSecondary" style={Type.caption}>
          {unit || '개'}
        </ThemedText>
      </View>
      <Pressable
        onPress={() => onChange(1)}
        disabled={disabled}
        style={({ pressed }) => [
          styles.stepButton,
          { backgroundColor: theme.accentSoft, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        ]}>
        <ThemedText style={[styles.stepSign, { color: theme.accent } as TextStyle]}>＋</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  hero: {
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  heroText: { flex: 1, gap: Spacing.one },
  heroTitle: { color: '#FFFFFF' },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 40 },
  captionWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  captionText: { color: '#FFFFFF' },
  pin: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    // 핀은 사진 어디에 놓이든 가운데가 그 자리를 가리켜야 한다.
    transform: [{ translateX: -15 }, { translateY: -15 }],
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  emptyEmoji: { fontSize: 32 },
  field: { gap: Spacing.one },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 2 },
  button: {
    borderRadius: 14,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  quick: {
    flex: 1,
    minWidth: 72,
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
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSign: { fontSize: 26, fontWeight: '700', lineHeight: 30 },
  stepValue: { flex: 1, alignItems: 'center' },
  stepNumber: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
});
