import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { QUESTION_GROUPS, parseQtAnswers } from '@/constants/qt-questions';
import { getMeditationNoteById, type MeditationNote } from '@/db/userData';

export default function WordNoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [note, setNote] = useState<MeditationNote | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setLoading(true);
        const found = id ? await getMeditationNoteById(Number(id)) : null;
        setNote(found);
        setLoading(false);
      })();
    }, [id])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ActivityIndicator style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (!note) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.container}>
          <ThemedText themeColor="textSecondary" style={styles.emptyText}>
            묵상 노트를 찾을 수 없습니다.
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const qtAnswers = parseQtAnswers(note.qt_answers);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.dateHeader}>
            <ThemedText type="title" style={styles.dateText}>
              {note.date}
            </ThemedText>
            <ThemedText themeColor="textSecondary">{note.label}</ThemedText>
          </View>

          {QUESTION_GROUPS.map((group) => {
            const answers = qtAnswers[group.key];
            const hasAny = answers.some((a) => a.trim());
            if (!hasAny) return null;
            return (
              <ThemedView key={group.key} type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">{group.title}</ThemedText>
                {group.questions.map((q, i) =>
                  answers[i]?.trim() ? (
                    <View key={i} style={styles.qaItem}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {q}
                      </ThemedText>
                      <ThemedText style={styles.answerText}>{answers[i]}</ThemedText>
                    </View>
                  ) : null
                )}
              </ThemedView>
            );
          })}

          {note.note.trim() && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">📝 묵상 정리</ThemedText>
              <ThemedText style={styles.answerText}>{note.note}</ThemedText>
            </ThemedView>
          )}

          {note.application_note?.trim() && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">🌱 적용 정리</ThemedText>
              <ThemedText style={styles.answerText}>{note.application_note}</ThemedText>
            </ThemedView>
          )}

          <Pressable
            onPress={() => router.push({ pathname: '/meditation', params: { date: note.date } })}
            style={({ pressed }) => [
              styles.editButton,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold">수정하기</ThemedText>
          </Pressable>
        </ScrollView>
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
  loading: {
    marginTop: Spacing.six,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  dateHeader: {
    gap: Spacing.half,
    marginBottom: Spacing.one,
  },
  dateText: {
    fontSize: 22,
  },
  card: {
    width: '100%',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  qaItem: {
    gap: Spacing.half,
  },
  answerText: {
    fontSize: 16,
    lineHeight: 24,
  },
  editButton: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
});
