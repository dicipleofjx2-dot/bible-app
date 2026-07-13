import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { searchVerses, TRANSLATIONS, type SearchResult, type Translation } from '@/db/bible';

export default function SearchScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [translation, setTranslation] = useState<Translation>('open_ko');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  async function runSearch(text: string, lang: Translation) {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    const rows = await searchVerses(db, text, lang);
    setResults(rows);
    setSearched(true);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TextInput
            value={query}
            onChangeText={(text) => runSearch(text, translation)}
            placeholder="구절 검색 (예: 사랑, 은혜)"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <View style={styles.translationRow}>
            {TRANSLATIONS.map((t) => (
              <Pressable
                key={t.code}
                onPress={() => {
                  setTranslation(t.code);
                  runSearch(query, t.code);
                }}
                style={[
                  styles.translationChip,
                  {
                    backgroundColor:
                      translation === t.code ? theme.backgroundSelected : theme.backgroundElement,
                  },
                ]}>
                <ThemedText type="small">{t.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => `${item.translation}-${item.id}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            searched ? (
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                검색 결과가 없습니다.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/read',
                  params: { bookId: String(item.book_id), chapter: String(item.chapter) },
                })
              }
              style={({ pressed }) => [
                styles.resultRow,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">
                {item.book_name_ko} {item.chapter}:{item.verse}
              </ThemedText>
              <ThemedText type="small" style={styles.resultText}>
                {item.text}
              </ThemedText>
            </Pressable>
          )}
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
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  translationRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  translationChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
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
  resultRow: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  resultText: {},
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
