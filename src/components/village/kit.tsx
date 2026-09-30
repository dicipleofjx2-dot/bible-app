import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 목장마을ON 화면 부품.
 *
 * 방이 여섯이고 마을 화면이 넷이라, 같은 카드·단추·입력칸을 열 번 다시 쓰게
 * 된다. 한 곳에 모아 두지 않으면 방마다 조금씩 다른 화면이 되고, 색이나 여백을
 * 고칠 때 열 군데를 고쳐야 한다.
 *
 * 크기는 [[feedback-large-readable-ui]] 를 따른다 — 본문 16px 이상, 누르는
 * 것은 44px 이상. 교회 앱은 눈이 어두운 분들이 함께 쓴다.
 */

export function RoomScreen({
  title,
  subtitle,
  emoji,
  children,
  onBack,
}: {
  title: string;
  subtitle?: string;
  emoji?: string;
  children: ReactNode;
  onBack?: () => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={[styles.head, { borderBottomColor: theme.border }]}>
          <Pressable
            onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/village' as Href)))}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="뒤로">
            <ThemedText style={styles.backIcon} themeColor="accent">
              ‹
            </ThemedText>
          </Pressable>
          <View style={styles.flex}>
            <ThemedText style={styles.headTitle}>
              {emoji ? `${emoji} ` : ''}
              {title}
            </ThemedText>
            {subtitle ? (
              <ThemedText type="small" themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
        </View>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View style={styles.inner}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const body = (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        style,
      ]}>
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <ThemedText style={styles.sectionTitleText}>{children}</ThemedText>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function Btn({
  label,
  onPress,
  tone = 'primary',
  disabled,
  small,
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'ghost' | 'quiet';
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const bg =
    tone === 'primary' ? theme.backgroundSelected : tone === 'ghost' ? 'transparent' : theme.accentSoft;
  const fg = tone === 'primary' ? '#FFFFFF' : theme.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.btn,
        small && styles.btnSmall,
        {
          backgroundColor: bg,
          borderColor: tone === 'ghost' ? theme.border : 'transparent',
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      <ThemedText style={[styles.btnText, small && styles.btnTextSmall, { color: fg }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
        ]}
      />
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** 고르는 줄 — 참석 답, 공개 범위, 분류처럼 서넛 중 하나를 고를 때. */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.chipRow}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              styles.chip,
              {
                backgroundColor: on ? theme.backgroundSelected : theme.accentSoft,
                borderColor: on ? theme.backgroundSelected : theme.border,
              },
            ]}>
            <ThemedText type="smallBold" style={{ color: on ? '#FFFFFF' : theme.accent }}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 표시만 하는 배지. 상태·분류를 글자 한 마디로. */
export function Tag({ label, tone = 'soft' }: { label: string; tone?: 'soft' | 'done' | 'warn' }) {
  const theme = useTheme();
  const bg = tone === 'done' ? theme.done : tone === 'warn' ? theme.support : theme.accentSoft;
  const fg = tone === 'soft' ? theme.accent : '#FFFFFF';
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <ThemedText type="small" style={{ color: fg, fontWeight: '700' }}>
        {label}
      </ThemedText>
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <Card>
      <ThemedText themeColor="textSecondary" style={styles.empty}>
        {text}
      </ThemedText>
    </Card>
  );
}


/**
 * 「9월 25일 (목)」.
 *
 * new Date(iso) 로 파싱하지 않는다 — 'YYYY-MM-DD' 는 UTC 로 읽혀서 한국에서는
 * 하루 앞의 요일이 나온다([[date-toisostring-shifts-a-day]]와 같은 함정).
 */
export function formatMeetDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const day = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${day})`;
}

export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 34, lineHeight: 38, fontWeight: '700' },
  headTitle: { fontSize: 22, lineHeight: 30, fontWeight: '700' },
  scroll: { paddingBottom: 96, paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    boxShadow: '0 2px 8px rgba(74,55,48,0.06)',
  },
  sectionTitle: { gap: 2, marginTop: Spacing.two },
  sectionTitleText: { fontSize: 19, lineHeight: 27, fontWeight: '700' },
  btn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  btnSmall: { minHeight: 40, borderRadius: 12, paddingHorizontal: Spacing.two },
  btnText: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  btnTextSmall: { fontSize: 15, lineHeight: 20 },
  field: { gap: Spacing.one },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 24,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  empty: { textAlign: 'center', paddingVertical: Spacing.three },
});
