import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteMeditationNote, getAllMeditationNotes, type MeditationNote } from '@/db/userData';

export default function WordNotesScreen() {
  const theme = useTheme();
  const [notes, setNotes] = useState<MeditationNote[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setNotes(await getAllMeditationNotes());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.header}>
          말씀노트
        </ThemedText>

        <FlatList
          style={styles.list}
          data={notes}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !loading ? (
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                말씀묵상 화면에서 묵상을 기록하면 여기에 모아서 볼 수 있습니다.
              </ThemedText>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/meditation', params: { date: item.date } })}
              style={({ pressed }) => [
                styles.noteRow,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <View style={styles.noteHeader}>
                <View>
                  <ThemedText type="smallBold">{item.date}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.label}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={async (e) => {
                    e.stopPropagation();
                    await deleteMeditationNote(item.id);
                    load();
                  }}
                  hitSlop={10}>
                  <ThemedText type="small" style={styles.deleteText}>
                    삭제
                  </ThemedText>
                </Pressable>
              </View>
              <ThemedText type="small" numberOfLines={3} style={styles.noteText}>
                {item.note}
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
  },
  list: {
    width: '100%',
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  noteRow: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  deleteText: {
    color: '#e03131',
  },
  noteText: {
    marginTop: Spacing.one,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
