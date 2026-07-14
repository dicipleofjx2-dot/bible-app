import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
import { getMeditationNote, upsertMeditationNote } from '@/db/userData';

function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MeditationScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();

  const [passage, setPassage] = useState<Verse[]>([]);
  const [referenceLabel, setReferenceLabel] = useState('');
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  async function showQtEntry(qt: QtEntry) {
    const verses = await getVersesForRange(db, qt.bookId, qt.chapter, qt.startVerse, qt.endVerse, 'open_ko');
    setPassage(verses);
    setReferenceLabel(qt.label);
    setCurrentDate(qt.date);

    const existing = await getMeditationNote(qt.date);
    setNote(existing?.note ?? '');
    setSaved(false);
  }

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const target = params.date ?? todayDateString();
        let qt = await getQtEntryForDate(db, target);
        if (!qt) {
          const first = await getFirstQtEntry(db);
          qt = first && target < first.date ? first : await getLastQtEntry(db);
        }
        if (qt) await showQtEntry(qt);
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, params.date])
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

  async function saveNote() {
    const first = passage[0];
    const last = passage[passage.length - 1];
    if (!first || !last || !currentDate) return;
    await upsertMeditationNote({
      date: currentDate,
      bookId: first.book_id,
      chapter: first.chapter,
      startVerse: first.verse,
      endVerse: last.verse,
      label: referenceLabel,
      note,
    });
    setSaved(true);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            말씀묵상
          </ThemedText>

          <Pressable
            onPress={() => router.push('/word-notes')}
            style={({ pressed }) => [styles.wordNotesLink, pressed && styles.pressed]}>
            <ThemedText type="link" themeColor="textSecondary">
              말씀노트 보기
            </ThemedText>
          </Pressable>

          <ThemedView type="backgroundElement" style={styles.verseCard}>
            <View style={styles.verseCardHeader}>
              <ThemedText type="small" themeColor="textSecondary">
                본문
              </ThemedText>
              {passage.length > 0 && (
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {referenceLabel}
                </ThemedText>
              )}
            </View>

            {passage.length > 0 && (
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
            )}

            <View style={styles.navRow}>
              <Pressable
                onPress={goToPrevDay}
                disabled={navigating}
                hitSlop={10}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  ◀ 어제 본문
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={goToNextDay}
                disabled={navigating}
                hitSlop={10}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  다음날 본문 ▶
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>

          <View style={styles.noteSection}>
            <ThemedText type="smallBold">묵상 노트</ThemedText>
            <TextInput
              value={note}
              onChangeText={(t) => {
                setNote(t);
                setSaved(false);
              }}
              placeholder="이 본문을 통해 느낀 은혜와 묵상을 기록해보세요."
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.noteInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <Pressable
              onPress={saveNote}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">{saved ? '저장됨' : '묵상 저장하기'}</ThemedText>
            </Pressable>
          </View>
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
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  wordNotesLink: {
    alignSelf: 'center',
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
  noteSection: {
    width: '100%',
    gap: Spacing.two,
  },
  noteInput: {
    minHeight: 160,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  saveButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
