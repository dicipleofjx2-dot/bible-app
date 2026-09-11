import { Pressable, StyleSheet, TextInput, View, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_META, IMPORTANCE_META, type Importance, type MailCategory } from '@/lib/emailOrganizer';

/**
 * 이메일 정리ON 화면들이 함께 쓰는 조각.
 *
 * 분류 배지와 중요도 배지는 네 화면에 모두 나온다. 화면마다 따로 그리면 색이
 * 조금씩 달라지고, 색이 달라지면 「이 표시가 무슨 뜻이더라」가 된다.
 */

export function MailCard({ children, style }: { children: React.ReactNode; style?: object }) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }, style]}>
      {children}
    </ThemedView>
  );
}

/** 분류 배지. 자동 삭제 금지 분류는 자물쇠를 함께 보여 준다. */
export function CategoryBadge({ category }: { category: MailCategory }) {
  const theme = useTheme();
  const meta = CATEGORY_META[category];
  return (
    <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
      <ThemedText style={[Type.caption, { color: theme.accent } as TextStyle]}>
        {meta.emoji} {meta.label}
        {meta.guarded ? ' 🔒' : ''}
      </ThemedText>
    </View>
  );
}

export function ImportanceBadge({ importance }: { importance: Importance }) {
  const theme = useTheme();
  const meta = IMPORTANCE_META[importance];
  // 긴급만 강조색 바탕으로 띄운다. 넷 다 색을 주면 아무것도 눈에 안 걸린다.
  const strong = importance === 'urgent';
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: strong ? theme.accent : theme.background, borderColor: theme.border, borderWidth: strong ? 0 : 1 },
      ]}>
      <ThemedText
        style={[
          Type.caption,
          { color: strong ? '#FFFFFF' : theme.textSecondary } as TextStyle,
        ]}>
        {meta.emoji} {meta.label}
      </ThemedText>
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
  // 어두운 모드의 accent 는 밝은 살구색이라 흰 글자가 안 읽힌다(사명기록관에서
  // 같은 문제를 고쳤다). 밝은 바탕에는 어두운 글자를 얹는다.
  const isDark = useColorScheme() === 'dark';
  const background = tone === 'accent' ? theme.accent : theme.accentSoft;
  const color = tone === 'accent' ? (isDark ? '#241A16' : '#FFFFFF') : theme.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}>
      <ThemedText style={[Type.itemTitle, { color } as TextStyle]}>{label}</ThemedText>
    </Pressable>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';
  return (
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
                backgroundColor: on ? theme.accent : theme.backgroundElement,
                borderColor: on ? theme.accent : theme.border,
                opacity: pressed ? 0.75 : 1,
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
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const theme = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.input,
        { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
      ]}
    />
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  hint?: string;
  keyboardType?: 'default' | 'number-pad';
  multiline?: boolean;
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
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
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

/** 체험 기간 안내 띠. 실행 단추가 잠겨 있는 이유를 화면마다 같은 말로 알린다. */
export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const theme = useTheme();
  if (daysLeft <= 0) return null;
  return (
    <MailCard style={{ borderColor: theme.accent }}>
      <ThemedText style={Type.itemTitle}>체험 모드 · {daysLeft}일 남음</ThemedText>
      <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
        처음 2주 동안 AI는 분류와 정리를 제안만 합니다. 휴지통으로 옮기는 실행은 잠겨 있고,
        승인·수정한 결과만 규칙으로 쌓입니다. 설정에서 지금 끝낼 수도 있습니다.
      </ThemedText>
    </MailCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  button: {
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  field: { gap: 6 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },
});
