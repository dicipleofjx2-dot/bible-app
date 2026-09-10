import { Pressable, StyleSheet, TextInput, View, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 사명기록관 화면 넷이 함께 쓰는 조각들.
 *
 * 화면마다 같은 카드·입력칸을 따로 두면 간격과 색이 조금씩 어긋난다(HubList 를
 * 만든 것과 같은 이유). 여기 모아 한 번에 손본다.
 *
 * 글자 크기를 앱 기본보다 한 단계 크게 잡았다 — 이 기능을 쓰는 분들이 대개
 * 은퇴를 앞둔 사역자다(기획서 §16 「고령 사역자도 쉽게」).
 */

export function MissionCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const theme = useTheme();
  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.border }, style]}>
      {children}
    </ThemedView>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
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
  // 어두운 모드의 accent(#EC9A70)는 밝은 살구색이다. 거기에 흰 글자를 얹으면
  // 대비가 2:1도 안 된다 — 밝은 바탕에는 어두운 글자를 얹는다(TreeCanvas 의
  // 열매 글자가 같은 방식이다). 밝은 모드의 accent(#BC5C35)는 흰 글자로 4.5:1.
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

/** 하나만 고르는 작은 알약 줄. 공개 범위·사실 확인 상태처럼 값이 정해진 칸에 쓴다. */
export function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { id: T; label: string }[];
  value: T;
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
                  // 고른 것은 강조 바탕, 안 고른 것은 테두리만. 이 테마에서
                  // backgroundSelected 와 accent 가 같은 색이라(HANDOFF 참고)
                  // 두 상태를 색 하나로 가르면 구분이 안 된다.
                  backgroundColor: on ? theme.accent : 'transparent',
                  borderColor: on ? theme.accent : theme.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <ThemedText style={[Type.caption, { color: on ? '#FFFFFF' : theme.textSecondary } as TextStyle]}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** 축별 진행 막대. 숫자만 있으면 「얼마나 남았는지」가 안 읽힌다. */
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const theme = useTheme();
  const ratio = total === 0 ? 0 : done / total;
  return (
    <View style={[styles.barTrack, { backgroundColor: theme.accentSoft }]}>
      <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: theme.accent }]} />
    </View>
  );
}


/**
 * 원고·대본 미리보기.
 *
 * 내보내는 글은 마크다운이다(붙여 넣어 한글·워드에서 쓰라고 그렇게 만든다).
 * 그런데 그 기호를 화면에 그대로 띄우면 `##` 과 `**` 사이에서 글이 읽히지
 * 않는다 — 실제로 띄워 보고 알았다. 복사·내려받기로 나가는 것은 **원문 그대로**
 * 두고, 화면에만 기호를 벗겨 보여 준다.
 *
 * 우리가 만든 마크다운만 다룬다(`manuscriptToHtml` 과 같은 범위). 일반 마크다운
 * 변환기가 아니다.
 */
export function MarkdownPreview({ text }: { text: string }) {
  const theme = useTheme();
  const lines = text.split('\n');

  return (
    <View style={styles.preview}>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        const key = `${i}-${line.slice(0, 12)}`;
        if (!line) return <View key={key} style={styles.previewGap} />;
        if (line === '---') {
          return <View key={key} style={[styles.previewRule, { backgroundColor: theme.border }]} />;
        }
        if (line.startsWith('### ')) {
          return (
            <ThemedText key={key} style={[Type.itemTitle, styles.previewH3]}>
              {line.slice(4)}
            </ThemedText>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <ThemedText key={key} style={[Type.itemTitle, styles.previewH2, { color: theme.accent }]}>
              {line.slice(3)}
            </ThemedText>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <ThemedText key={key} style={[Type.screenTitle, styles.previewH1]}>
              {line.slice(2)}
            </ThemedText>
          );
        }
        if (line.startsWith('> ')) {
          return (
            <ThemedText
              key={key}
              style={[Type.reading, styles.previewQuote, { borderLeftColor: theme.accent }]}>
              {line.slice(2)}
            </ThemedText>
          );
        }
        if (line.startsWith('|')) {
          // 표는 화면에서 줄로 편다 — 좁은 폰에서 칸을 맞춰 봐야 읽히지 않는다.
          const cells = line.slice(1, line.endsWith('|') ? -1 : undefined).split('|').map((c) => c.trim());
          if (cells.every((c) => /^-{2,}$/.test(c))) return null;
          return (
            <ThemedText key={key} themeColor="textSecondary" style={Type.itemDescription}>
              {cells.filter(Boolean).join(' · ')}
            </ThemedText>
          );
        }
        const plain = line.replace(/^- /, '· ').replace(/\*\*(.+?)\*\*/g, '$1');
        // *(근거: …)* 처럼 통째로 기울인 줄은 작은 글씨로 물러세운다.
        const quiet = /^\*.+\*$/.test(plain);
        return (
          <ThemedText
            key={key}
            themeColor={quiet ? 'textSecondary' : 'text'}
            style={quiet ? Type.caption : Type.reading}>
            {quiet ? plain.replace(/^\*|\*$/g, '') : plain.replace(/\*(.+?)\*/g, '$1')}
          </ThemedText>
        );
      })}
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
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 17,
    lineHeight: 26,
  },
  inputMultiline: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  button: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  preview: { gap: 2 },
  previewGap: { height: Spacing.two },
  previewH1: { marginBottom: Spacing.one },
  previewH2: { marginTop: Spacing.three },
  previewH3: { marginTop: Spacing.two },
  previewQuote: { borderLeftWidth: 3, paddingLeft: Spacing.two, opacity: 0.9 },
  previewRule: { height: 1, marginVertical: Spacing.three },
});
