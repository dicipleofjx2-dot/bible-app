import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getChapterCount, type Book } from '@/db/bible';

type Props = {
  visible: boolean;
  onClose: () => void;
  books: Book[];
  onSelect: (bookId: number, chapter: number) => void;
};

export function BookChapterPicker({ visible, onClose, books, onSelect }: Props) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [pendingBook, setPendingBook] = useState<Book | null>(null);
  const [pendingChapterCount, setPendingChapterCount] = useState(1);

  const otBooks = useMemo(() => books.filter((b) => b.testament === 'OT'), [books]);
  const ntBooks = useMemo(() => books.filter((b) => b.testament === 'NT'), [books]);

  useEffect(() => {
    if (!pendingBook) return;
    let cancelled = false;
    getChapterCount(db, pendingBook.id).then((count) => {
      if (!cancelled) setPendingChapterCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [db, pendingBook]);

  function handleClose() {
    setPendingBook(null);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} transparent>
      <View style={styles.backdrop}>
        <ThemedView type="background" style={[styles.sheet, { borderColor: theme.backgroundElement }]}>
          <View style={styles.header}>
            <ThemedText type="subtitle">{pendingBook ? pendingBook.name_ko : '책 선택'}</ThemedText>
            <Pressable onPress={pendingBook ? () => setPendingBook(null) : handleClose}>
              <ThemedText type="link" themeColor="textSecondary">
                {pendingBook ? '뒤로' : '닫기'}
              </ThemedText>
            </Pressable>
          </View>

          {!pendingBook && (
            <FlatList
              data={[{ title: '구약', data: otBooks }, { title: '신약', data: ntBooks }]}
              keyExtractor={(section) => section.title}
              renderItem={({ item: section }) => (
                <View>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                    {section.title}
                  </ThemedText>
                  <View style={styles.grid}>
                    {section.data.map((book) => (
                      <Pressable
                        key={book.id}
                        onPress={() => setPendingBook(book)}
                        style={({ pressed }) => [
                          styles.bookChip,
                          { backgroundColor: theme.backgroundElement },
                          pressed && styles.pressed,
                        ]}>
                        <ThemedText type="small">{book.name_ko}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            />
          )}

          {pendingBook && (
            <FlatList
              data={Array.from({ length: pendingChapterCount }, (_, i) => i + 1)}
              keyExtractor={(chapter) => String(chapter)}
              numColumns={6}
              renderItem={({ item: chapter }) => (
                <Pressable
                  onPress={() => {
                    onSelect(pendingBook.id, chapter);
                    handleClose();
                  }}
                  style={({ pressed }) => [
                    styles.chapterCell,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small">{chapter}</ThemedText>
                </Pressable>
              )}
            />
          )}
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
    maxHeight: '80%',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  bookChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  chapterCell: {
    width: 44,
    height: 44,
    margin: Spacing.one,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
