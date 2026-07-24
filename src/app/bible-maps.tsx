import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Linking, Pressable, SectionList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { getBooks, type Book } from '@/db/bible';

// OpenBible.info's geography atlas (https://www.openbible.info/geo/), keyed by
// this app's `books.book_order` (1-66, confirmed against the bundled
// bible.db). Philemon/James/1-3 John have no entry there (no geographic
// data for those books), so they're omitted and rendered non-tappable.
const OPENBIBLE_SLUGS: Record<number, string> = {
  1: 'gen', 2: 'exod', 3: 'lev', 4: 'num', 5: 'deut', 6: 'josh', 7: 'judg', 8: 'ruth',
  9: '1sam', 10: '2sam', 11: '1kgs', 12: '2kgs', 13: '1chr', 14: '2chr', 15: 'ezra',
  16: 'neh', 17: 'esth', 18: 'job', 19: 'ps', 20: 'prov', 21: 'eccl', 22: 'song',
  23: 'isa', 24: 'jer', 25: 'lam', 26: 'ezek', 27: 'dan', 28: 'hos', 29: 'joel',
  30: 'amos', 31: 'obad', 32: 'jonah', 33: 'mic', 34: 'nah', 35: 'hab', 36: 'zeph',
  37: 'hag', 38: 'zech', 39: 'mal',
  40: 'matt', 41: 'mark', 42: 'luke', 43: 'john', 44: 'acts', 45: 'rom', 46: '1cor',
  47: '2cor', 48: 'gal', 49: 'eph', 50: 'phil', 51: 'col', 52: '1thess', 53: '2thess',
  54: '1tim', 55: '2tim', 56: 'titus', 58: 'heb', 60: '1pet', 61: '2pet', 65: 'jude',
  66: 'rev',
};

function openBibleUrl(bookOrder: number): string | null {
  const slug = OPENBIBLE_SLUGS[bookOrder];
  return slug ? `https://www.openbible.info/geo/preview/${slug}` : null;
}

export default function BibleMapsScreen() {
  const db = useSQLiteContext();
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    getBooks(db).then(setBooks);
  }, [db]);

  const sections = [
    { title: '구약', data: books.filter((b) => b.testament === 'OT') },
    { title: '신약', data: books.filter((b) => b.testament === 'NT') },
  ].filter((s) => s.data.length > 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.attribution}>
              책을 선택하면 OpenBible.info의 지도 페이지가 열립니다. (지도 데이터 제공:
              OpenBible.info, CC BY)
            </ThemedText>
          }
          renderSectionHeader={({ section }) => (
            <ThemedText type="subtitle" style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item }) => {
            const url = openBibleUrl(item.book_order);
            return (
              <Pressable
                disabled={!url}
                onPress={() => url && Linking.openURL(url)}
                style={({ pressed }) => [styles.row, pressed && url && styles.pressed]}>
                <ThemedView
                  type="backgroundElement"
                  style={[styles.rowInner, !url && styles.rowInnerDisabled]}>
                  <ThemedText type="small">{item.name_ko}</ThemedText>
                  {!url && (
                    <ThemedText type="small" themeColor="textSecondary">
                      지도 없음
                    </ThemedText>
                  )}
                </ThemedView>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.one,
  },
  attribution: {
    marginBottom: Spacing.two,
  },
  sectionHeader: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  row: {
    width: '100%',
  },
  rowInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.one,
  },
  rowInnerDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
