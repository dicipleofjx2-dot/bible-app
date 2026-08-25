import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/lib/i18n';
import { getPublishedCourses, pickText, type Course } from '@/db/r2m';

export default function R2MCoursesScreen() {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getPublishedCourses()
        .then(setCourses)
        .catch((e) => setError(e?.message ?? String(e)));
    }, []),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <ThemedText type="title" style={styles.title}>
              {t('nav.courses')}
            </ThemedText>
          }
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              {error ?? t('r2m.courses.empty')}
            </ThemedText>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/r2m/courses/[id]', params: { id: item.id } })}
              style={({ pressed }) => [styles.card, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
              <ThemedText type="smallBold">{pickText(item.title, item.titleEn, lang)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('r2m.courses.weeks', { n: item.totalWeeks })}
              </ThemedText>
              {item.description ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {pickText(item.description, item.descriptionEn, lang)}
                </ThemedText>
              ) : null}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
    marginBottom: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
