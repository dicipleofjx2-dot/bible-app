import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getBooks, getVerse, type Book } from '@/db/bible';
import {
  deleteMark,
  getAllMarks,
  COMMENTARY_HIGHLIGHT_COLORS,
  HIGHLIGHT_COLORS,
  type VerseMark,
} from '@/db/userData';

type EnrichedMark = VerseMark & { bookName: string; verseText: string };

export default function NotesScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [marks, setMarks] = useState<EnrichedMark[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [rawMarks, books] = await Promise.all([getAllMarks(), getBooks(db)]);
    const bookById = new Map<number, Book>(books.map((b) => [b.id, b]));
    const enriched = await Promise.all(
      rawMarks.map(async (m) => {
        const verse = await getVerse(db, m.book_id, m.chapter, m.verse, m.translation);
        return {
          ...m,
          bookName: bookById.get(m.book_id)?.name_ko ?? '',
          verseText: verse?.text ?? '',
        };
      })
    );
    setMarks(enriched);
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.header}>
          암송구절
        </ThemedText>

        <FlatList
          data={marks}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !loading ? (
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                읽기 화면에서 구절 옆 연필 아이콘을 눌러 하이라이트하거나 노트를 남겨보세요.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => {
            const colorHex = [...HIGHLIGHT_COLORS, ...COMMENTARY_HIGHLIGHT_COLORS].find(
              (c) => c.code === item.color
            )?.hex;
            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/read',
                    params: { bookId: String(item.book_id), chapter: String(item.chapter) },
                  })
                }
                style={({ pressed }) => [
                  styles.markRow,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.markHeader}>
                  <View style={styles.markHeaderLeft}>
                    <ThemedText type="smallBold">
                      {item.bookName} {item.chapter}:{item.verse}
                    </ThemedText>
                    {colorHex && <View style={[styles.colorDot, { backgroundColor: colorHex }]} />}
                  </View>
                  <Pressable
                    onPress={async (e) => {
                      e.stopPropagation();
                      await deleteMark(item.id);
                      load();
                    }}
                    hitSlop={10}>
                    <ThemedText type="small" style={styles.deleteText}>
                      삭제
                    </ThemedText>
                  </Pressable>
                </View>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {item.verseText}
                </ThemedText>
                {item.note ? (
                  <ThemedText type="small" style={styles.noteText}>
                    {item.note}
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          }}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.two,
  },
  markRow: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  markHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  deleteText: {
    color: '#e03131',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  noteText: {
    marginTop: Spacing.one,
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
