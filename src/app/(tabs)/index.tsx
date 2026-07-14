import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useGradient } from '@/hooks/use-theme';
import {
  getFirstQtEntry,
  getLastQtEntry,
  getNextQtEntry,
  getPrevQtEntry,
  getQtEntryForDate,
  getVersesForRange,
  type QtEntry,
  type Verse,
} from '@/db/bible';
import { prefetchPlans } from '@/db/plans';

function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function HomeScreen() {
  const db = useSQLiteContext();
  const gradient = useGradient();
  const [passage, setPassage] = useState<Verse[]>([]);
  const [referenceLabel, setReferenceLabel] = useState('');
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  async function showQtEntry(qt: QtEntry) {
    const verses = await getVersesForRange(db, qt.bookId, qt.chapter, qt.startVerse, qt.endVerse, 'open_ko');
    setPassage(verses);
    setReferenceLabel(qt.label);
    setCurrentDate(qt.date);
  }

  useFocusEffect(
    useCallback(() => {
      prefetchPlans();
      (async () => {
        const today = todayDateString();
        let qt = await getQtEntryForDate(db, today);
        if (!qt) {
          const first = await getFirstQtEntry(db);
          qt = first && today < first.date ? first : await getLastQtEntry(db);
        }
        if (qt) await showQtEntry(qt);
      })();
      // Only re-run when the screen (re)gains focus — e.g. coming back from
      // another tab — so a day boundary crossed while the app stayed open
      // (or just revisiting later the same day) always shows the right QT
      // entry instead of whatever was loaded at the very first mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db])
  );

  async function goToPrevDay() {
    if (!currentDate || navigating) return;
    setNavigating(true);
    try {
      const prev = await getPrevQtEntry(db, currentDate);
      if (prev) await showQtEntry(prev);
    } finally {
      setNavigating(false);
    }
  }

  async function goToNextDay() {
    if (!currentDate || navigating) return;
    setNavigating(true);
    try {
      const next = await getNextQtEntry(db, currentDate);
      if (next) await showQtEntry(next);
    } finally {
      setNavigating(false);
    }
  }

  const isToday = currentDate === todayDateString();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeAreaOuter}>
      <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          말씀과 함께
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.verseCard}>
          <View style={styles.verseCardHeader}>
            <ThemedText type="small" themeColor="textSecondary">
              {isToday ? '오늘의 큐티' : '말씀 묵상'}
            </ThemedText>
            {passage.length > 0 && (
              <ThemedText type="smallBold" themeColor="textSecondary">
                {referenceLabel}
              </ThemedText>
            )}
          </View>

          {passage.length > 0 && (
            <>
              <ScrollView style={styles.passageScroll} showsVerticalScrollIndicator>
                <View style={styles.passageText}>
                  {passage.map((v) => (
                    <ThemedText key={v.id} style={styles.verseText}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        {v.verse}{' '}
                      </ThemedText>
                      {v.text}
                    </ThemedText>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          <View style={styles.navRow}>
            <Pressable
              onPress={goToPrevDay}
              disabled={navigating}
              hitSlop={10}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                ◀ 어제 큐티
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={goToNextDay}
              disabled={navigating}
              hitSlop={10}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                다음날 큐티 ▶
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>

        <Pressable
          onPress={() =>
            currentDate &&
            router.push({
              pathname: '/meditation',
              params: { date: currentDate },
            })
          }
          style={({ pressed }) => [pressed && styles.pressed]}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.readButton}>
            <ThemedText type="smallBold" style={styles.readButtonText}>
              말씀묵상
            </ThemedText>
          </LinearGradient>
        </Pressable>
      </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeAreaOuter: {
    flex: 1,
    width: '100%',
  },
  scrollOuter: {
    flex: 1,
    width: '100%',
  },
  safeArea: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    textAlign: 'center',
  },
  verseCard: {
    width: '100%',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  verseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  passageScroll: {
    maxHeight: 420,
  },
  passageText: {
    gap: Spacing.one,
  },
  verseText: {
    fontSize: 17,
    lineHeight: 26,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  readButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
  readButtonText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
});
