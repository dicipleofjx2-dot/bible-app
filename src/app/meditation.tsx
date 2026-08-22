import { useLocalSearchParams, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { bskoreaReadUrl } from '@/lib/bskorea';
import {
  getFirstQtEntry,
  getLastQtEntry,
  getNextQtEntry,
  getPrevQtEntry,
  getQtEntryForDate,
  getVersesForRange,
  type QtEntry,
  type Verse,
  DEFAULT_TRANSLATION,
} from '@/db/bible';
import { getMeditationNote, upsertMeditationNote, type QtAnswers } from '@/db/userData';
import { getIsAdmin } from '@/db/profile';
import { getPublicShepherdQt, getShepherdQtForAdmin, upsertShepherdQt, type ShepherdQt } from '@/db/shepherdQt';
import { pingCheckin } from '@/db/r2m';
import { EMPTY_QT_ANSWERS, QUESTION_GROUPS, parseQtAnswers } from '@/constants/qt-questions';

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
  const { session } = useAuth();

  // 본문 절을 담지 않는다. 개역개정은 대한성서공회 저작물이라 앱에 담아 두지
  // 않고, 그 사이트로 보내 거기서 읽게 한다. 저장에 필요한 범위는 큐티 일정이
  // 이미 들고 있으므로 그것을 그대로 쓴다.
  const [entry, setEntry] = useState<QtEntry | null>(null);
  const [referenceLabel, setReferenceLabel] = useState('');
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [qtAnswers, setQtAnswers] = useState<QtAnswers>(EMPTY_QT_ANSWERS);
  const [note, setNote] = useState('');
  const [applicationNote, setApplicationNote] = useState('');
  const [saved, setSaved] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [publicQt, setPublicQt] = useState<ShepherdQt | null>(null);

  async function showQtEntry(qt: QtEntry) {
    setEntry(qt);
    setReferenceLabel(qt.label);
    setCurrentDate(qt.date);

    const existing = await getMeditationNote(qt.date);
    setQtAnswers(parseQtAnswers(existing?.qt_answers));
    setNote(existing?.note ?? '');
    setApplicationNote(existing?.application_note ?? '');
    setSaved(false);

    getPublicShepherdQt(qt.date)
      .then(setPublicQt)
      .catch(() => setPublicQt(null));

    if (session) {
      getIsAdmin(session.user.id)
        .then((admin) => {
          setIsAdmin(admin);
          if (!admin) return;
          getShepherdQtForAdmin(qt.date)
            .then((mine) => setIsPublic(mine?.isPublic ?? false))
            .catch(() => setIsPublic(false));
        })
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
      setIsPublic(false);
    }
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
    }, [db, params.date, session])
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

  function setAnswer(group: keyof QtAnswers, index: number, value: string) {
    setQtAnswers((prev) => {
      const next = { ...prev, [group]: [...prev[group]] as string[] };
      next[group][index] = value;
      return next;
    });
    setSaved(false);
  }

  async function saveNote() {
    if (!entry || !currentDate) return;
    await upsertMeditationNote({
      date: currentDate,
      bookId: entry.bookId,
      chapter: entry.chapter,
      startVerse: entry.startVerse,
      endVerse: entry.endVerse,
      label: referenceLabel,
      note,
      qtAnswers,
      applicationNote,
    });

    if (isAdmin && session) {
      await upsertShepherdQt({
        date: currentDate,
        bookId: entry.bookId,
        chapter: entry.chapter,
        startVerse: entry.startVerse,
        endVerse: entry.endVerse,
        label: referenceLabel,
        qtAnswers,
        reflection: note,
        applicationNote,
        isPublic,
      }).catch(() => {});
    }

    setSaved(true);
    if (session) pingCheckin(session.user.id, currentDate, { qt: true }).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            오늘의 말씀
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.verseCard}>
            <View style={styles.verseCardHeader}>
              <ThemedText type="small" themeColor="textSecondary">
                본문
              </ThemedText>
              {entry && (
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {referenceLabel}
                </ThemedText>
              )}
            </View>

            {/*
              본문을 앱에 싣지 않는다. 개역개정은 대한성서공회 저작물이라,
              복제해 두는 대신 저작권자가 직접 제공하는 자리로 보낸다. 눌렀을 때
              그 장의 그 절로 바로 맞춰지도록 주소에 장·절을 실어 보낸다.
            */}
            {entry && (
              <View style={styles.passageText}>
                <ThemedText type="title" style={styles.referenceBig}>
                  {referenceLabel}
                </ThemedText>
                <Pressable
                  onPress={() => {
                    const url = bskoreaReadUrl(entry.bookId, entry.chapter, entry.startVerse);
                    if (url) Linking.openURL(url);
                  }}
                  style={[styles.readButton, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold">📖 대한성서공회에서 본문 읽기</ThemedText>
                </Pressable>
                <ThemedText type="small" themeColor="textSecondary">
                  개역개정 본문은 대한성서공회 성경읽기에서 보실 수 있습니다.
                </ThemedText>
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

          {QUESTION_GROUPS.map((group) => (
            <View key={group.key} style={styles.questionGroup}>
              <ThemedText type="smallBold">{group.title}</ThemedText>
              {group.questions.map((q, i) => (
                <View key={i} style={styles.questionItem}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {q}
                  </ThemedText>
                  <TextInput
                    value={qtAnswers[group.key][i] ?? ''}
                    onChangeText={(t) => setAnswer(group.key, i, t)}
                    placeholder="답변을 기록해보세요."
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    style={[styles.answerInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                  />
                </View>
              ))}
            </View>
          ))}

          <View style={styles.noteSection}>
            <ThemedText type="smallBold">묵상 정리</ThemedText>
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
          </View>

          <View style={styles.noteSection}>
            <ThemedText type="smallBold">적용 정리</ThemedText>
            <TextInput
              value={applicationNote}
              onChangeText={(t) => {
                setApplicationNote(t);
                setSaved(false);
              }}
              placeholder="말씀을 삶에 어떻게 적용할지 정리해보세요."
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.noteInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>

          {isAdmin && (
            <View style={[styles.adminRow, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">이 큐티를 다른 분들에게 공개</ThemedText>
              <Switch
                value={isPublic}
                onValueChange={(v) => {
                  setIsPublic(v);
                  setSaved(false);
                }}
                trackColor={{ true: theme.backgroundSelected }}
              />
            </View>
          )}

          <View style={styles.noteActions}>
            <Pressable
              onPress={() => router.push('/word-notes')}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">말씀노트 보기</ThemedText>
            </Pressable>
            <Pressable
              onPress={saveNote}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">{saved ? '저장됨' : '묵상 저장하기'}</ThemedText>
            </Pressable>
          </View>

          {publicQt && (
            <ThemedView type="backgroundElement" style={styles.publicCard}>
              <ThemedText type="smallBold">💌 목자의 큐티 나눔</ThemedText>
              {QUESTION_GROUPS.map((group) => (
                <View key={group.key} style={styles.publicGroup}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {group.title}
                  </ThemedText>
                  {group.questions.map((q, i) =>
                    publicQt.qtAnswers[group.key][i]?.trim() ? (
                      <View key={i} style={styles.publicItem}>
                        <ThemedText type="small" themeColor="textSecondary">
                          {q}
                        </ThemedText>
                        <ThemedText>{publicQt.qtAnswers[group.key][i]}</ThemedText>
                      </View>
                    ) : null
                  )}
                </View>
              ))}
              {publicQt.reflection.trim() && (
                <View style={styles.publicItem}>
                  <ThemedText type="small" themeColor="textSecondary">
                    묵상 정리
                  </ThemedText>
                  <ThemedText>{publicQt.reflection}</ThemedText>
                </View>
              )}
              {publicQt.applicationNote.trim() && (
                <View style={styles.publicItem}>
                  <ThemedText type="small" themeColor="textSecondary">
                    적용 정리
                  </ThemedText>
                  <ThemedText>{publicQt.applicationNote}</ThemedText>
                </View>
              )}
            </ThemedView>
          )}
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
  referenceBig: { textAlign: 'center' },
  readButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  passageText: {
    gap: Spacing.one,
  },
  verseText: {
    // QT 본문 — 오래 읽는 글이라 명조를 쓴다.
    
    fontSize: 18,
    lineHeight: 33,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  questionGroup: {
    width: '100%',
    gap: Spacing.two,
  },
  questionItem: {
    gap: Spacing.one,
  },
  answerInput: {
    minHeight: 60,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  noteSection: {
    width: '100%',
    gap: Spacing.two,
  },
  noteInput: {
    minHeight: 120,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  adminRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  noteActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
  publicCard: {
    width: '100%',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  publicGroup: {
    gap: Spacing.two,
  },
  publicItem: {
    gap: Spacing.half,
  },
});
