import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { HIGHLIGHT_COLORS, type HighlightColor, type VerseMark } from '@/db/userData';

type Props = {
  visible: boolean;
  verseNumber: number | null;
  verseText: string;
  existingMark: VerseMark | null;
  onClose: () => void;
  onSave: (color: HighlightColor | null, note: string | null) => void;
  onDelete: () => void;
};

export function VerseActionSheet({
  visible,
  verseNumber,
  verseText,
  existingMark,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const theme = useTheme();
  const [color, setColor] = useState<HighlightColor | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setColor(existingMark?.color ?? null);
      setNote(existingMark?.note ?? '');
    }
  }, [visible, existingMark]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ThemedView type="background" style={[styles.sheet, { borderColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {verseNumber}절
          </ThemedText>
          <ThemedText type="small" style={styles.verseText}>
            {verseText}
          </ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            하이라이트
          </ThemedText>
          <View style={styles.colorRow}>
            {HIGHLIGHT_COLORS.map((c) => (
              <Pressable
                key={c.code}
                onPress={() => setColor(color === c.code ? null : c.code)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c.hex },
                  color === c.code && styles.colorSwatchSelected,
                ]}
              />
            ))}
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            노트
          </ThemedText>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="이 구절에 대한 묵상을 남겨보세요"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.noteInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />

          <View style={styles.actionRow}>
            {existingMark && (
              <Pressable onPress={onDelete} style={styles.actionButton}>
                <ThemedText type="link" style={styles.deleteText}>
                  삭제
                </ThemedText>
              </Pressable>
            )}
            <View style={styles.actionRowRight}>
              <Pressable onPress={onClose} style={styles.actionButton}>
                <ThemedText type="link" themeColor="textSecondary">
                  취소
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => onSave(color, note.trim() ? note.trim() : null)}
                style={[styles.actionButton, styles.saveButton, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">저장</ThemedText>
              </Pressable>
            </View>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  verseText: {
    marginBottom: Spacing.two,
  },
  label: {
    marginTop: Spacing.two,
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: '#3c87f7',
  },
  noteInput: {
    minHeight: 80,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginTop: Spacing.one,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  actionRowRight: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  actionButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  saveButton: {},
  deleteText: {
    color: '#e03131',
  },
});
