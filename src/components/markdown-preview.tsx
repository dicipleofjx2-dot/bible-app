import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';

/**
 * 마크다운 미리보기.
 *
 * 내보내는 글은 마크다운이다(붙여 넣어 한글·워드에서 쓰라고 그렇게 만든다).
 * 그런데 그 기호를 화면에 그대로 띄우면 `##` 과 `**` 사이에서 글이 읽히지
 * 않는다 — 실제로 띄워 보고 알았다. 복사·내려받기로 나가는 것은 **원문 그대로**
 * 두고, 화면에만 기호를 벗겨 보여 준다.
 *
 * 우리가 만든 마크다운만 다룬다. 일반 마크다운 변환기가 아니다.
 * (사명기록관 `features/mission/ui.tsx` 에서 옮겨 왔다 — 사명기록관은 없앴고,
 * 성장ON 월간보고서·활동 미리보기가 이것을 쓴다.)
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
  preview: { gap: 2 },
  previewGap: { height: Spacing.two },
  previewH1: { marginBottom: Spacing.one },
  previewH2: { marginTop: Spacing.three },
  previewH3: { marginTop: Spacing.two },
  previewQuote: { borderLeftWidth: 3, paddingLeft: Spacing.two, opacity: 0.9 },
  previewRule: { height: 1, marginVertical: Spacing.three },
});
