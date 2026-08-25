import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import {
  enrollInCourse,
  getCourseById,
  getCourseWeeks,
  getMyEnrollmentForCourse,
  pickText,
  type Course,
  type CourseWeek,
} from '@/db/r2m';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { lang, t } = useI18n();
  const { session } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [weeks, setWeeks] = useState<CourseWeek[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    getCourseById(id).then(setCourse).catch(() => setCourse(null));
    getCourseWeeks(id)
      .then(setWeeks)
      .catch(() => setWeeks([]));
    if (session) {
      getMyEnrollmentForCourse(session.user.id, id)
        .then(setEnrolled)
        .catch(() => setEnrolled(false));
    }
  }, [id, session]);

  useFocusEffect(load);

  async function handleEnroll() {
    if (!session) {
      router.push('/profile');
      return;
    }
    if (!id) return;
    setError(null);
    setEnrolling(true);
    const result = await enrollInCourse(session.user.id, id);
    setEnrolling(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEnrolled(true);
  }

  if (!course) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">{t('r2m.course.notFound')}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: pickText(course.title, course.titleEn, lang) }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">{pickText(course.title, course.titleEn, lang)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('r2m.courses.weeks', { n: course.totalWeeks })}
          </ThemedText>
          {course.description ? (
            <ThemedText>{pickText(course.description, course.descriptionEn, lang)}</ThemedText>
          ) : null}

          {error && (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          )}

          <Pressable
            disabled={enrolled || enrolling}
            onPress={handleEnroll}
            style={[
              styles.enrollButton,
              { backgroundColor: theme.accent, opacity: enrolled || enrolling ? 0.5 : 1 },
            ]}>
            <ThemedText type="smallBold" style={styles.enrollButtonText}>
              {enrolled
                ? t('r2m.course.enrolled')
                : enrolling
                  ? t('r2m.course.enrolling')
                  : t('r2m.course.enroll')}
            </ThemedText>
          </Pressable>

          <View style={styles.weeksSection}>
            <ThemedText type="smallBold">{t('r2m.course.curriculum')}</ThemedText>
            {weeks.map((w) => (
              <View key={w.id} style={[styles.weekRow, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">
                  {t('r2m.course.week', {
                    n: w.weekNumber,
                    title: pickText(w.title, w.titleEn, lang),
                  })}
                </ThemedText>
                {w.theme ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {w.theme}
                  </ThemedText>
                ) : null}
                {w.description ? (
                  <ThemedText type="small">
                    {pickText(w.description, w.descriptionEn, lang)}
                  </ThemedText>
                ) : null}
              </View>
            ))}
            {weeks.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {t('r2m.course.noWeeks')}
              </ThemedText>
            )}
          </View>
        </ScrollView>
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
  safeAreaCentered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  errorText: {
    color: '#e03131',
  },
  enrollButton: {
    marginTop: Spacing.two,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  enrollButtonText: {
    color: '#ffffff',
  },
  weeksSection: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  weekRow: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
});
