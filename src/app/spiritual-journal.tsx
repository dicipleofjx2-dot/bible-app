import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InlineCalendar } from '@/components/inline-calendar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  deleteDiaryEntry,
  getAllDiaryEntries,
  getDiaryEntry,
  upsertDiaryEntry,
  HIGHLIGHT_COLORS,
  type DiaryEntry,
  type TagColor,
} from '@/db/userData';

function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const TAG_COLORS = HIGHLIGHT_COLORS as { code: TagColor; hex: string }[];

function ColorDots({
  value,
  onChange,
  small,
}: {
  value: TagColor | null;
  onChange: (c: TagColor | null) => void;
  small?: boolean;
}) {
  const size = small ? 12 : 16;
  return (
    <View style={styles.colorDotsRow}>
      {TAG_COLORS.map((c) => (
        <Pressable
          key={c.code}
          onPress={(e) => {
            e.stopPropagation();
            onChange(value === c.code ? null : c.code);
          }}
          hitSlop={6}
          style={[
            styles.colorDot,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: c.hex },
            value === c.code && styles.colorDotActive,
          ]}
        />
      ))}
    </View>
  );
}

export default function SpiritualJournalScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const [date, setDate] = useState(params.date ?? todayDateString());

  const [content, setContent] = useState('');
  const [color, setColor] = useState<TagColor | null>(null);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<DiaryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      getDiaryEntry(date).then((entry) => {
        setContent(entry?.content ?? '');
        setColor(entry?.color ?? null);
        setSaved(false);
      });
      getAllDiaryEntries().then(setHistory);
    }, [date])
  );

  const markedDates = useMemo(() => new Set(history.map((e) => e.date)), [history]);

  async function save() {
    await upsertDiaryEntry({ date, content, color });
    setSaved(true);
    getAllDiaryEntries().then(setHistory);
  }

  async function removeEntry(id: number) {
    await deleteDiaryEntry(id);
    getAllDiaryEntries().then(setHistory);
  }

  async function setHistoryColor(entry: DiaryEntry, next: TagColor | null) {
    await upsertDiaryEntry({ date: entry.date, content: entry.content, color: next });
    if (entry.date === date) setColor(next);
    getAllDiaryEntries().then(setHistory);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <InlineCalendar selectedDate={date} onSelectDate={setDate} markedDates={markedDates} />

          <View style={styles.editorSection}>
            <View style={styles.editorHeader}>
              <ThemedText type="smallBold">❤️‍🔥 영성일기</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {date}
              </ThemedText>
            </View>
            <View style={styles.editorBox}>
              <TextInput
                value={content}
                onChangeText={(t) => {
                  setContent(t);
                  setSaved(false);
                }}
                placeholder="오늘 주님과 동행하며 느낀 은혜를 기록해보세요."
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[styles.editorInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />
              <View style={styles.editorColorDots} pointerEvents="box-none">
                <ColorDots
                  value={color}
                  onChange={(c) => {
                    setColor(c);
                    setSaved(false);
                  }}
                />
              </View>
            </View>
            <Pressable
              onPress={save}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">{saved ? '저장됨' : '저장하기'}</ThemedText>
            </Pressable>
          </View>

          <View style={styles.historySection}>
            <ThemedText type="smallBold">지난 기록</ThemedText>
            {history.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                아직 작성한 일기가 없어요.
              </ThemedText>
            ) : (
              history.map((entry) => (
                <Pressable
                  key={entry.id}
                  onPress={() => setDate(entry.date)}
                  style={({ pressed }) => [
                    styles.historyRow,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.historyRowHeader}>
                    <View style={styles.historyRowHeaderLeft}>
                      <ThemedText type="smallBold">{entry.date}</ThemedText>
                      <ColorDots
                        value={entry.color}
                        onChange={(c) => setHistoryColor(entry, c)}
                        small
                      />
                    </View>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        removeEntry(entry.id);
                      }}
                      hitSlop={10}>
                      <ThemedText type="small" style={styles.deleteText}>
                        삭제
                      </ThemedText>
                    </Pressable>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                    {entry.content}
                  </ThemedText>
                </Pressable>
              ))
            )}
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
  editorSection: {
    width: '100%',
    gap: Spacing.two,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editorBox: {
    width: '100%',
    position: 'relative',
  },
  editorInput: {
    // Fixed height (not minHeight) so the box doesn't grow with content —
    // long entries scroll inside the box instead of pushing the rest of the
    // page down. Extra paddingTop leaves room for the color-dot row overlaid
    // at the top-left so it doesn't sit on top of the first line of text.
    height: 200,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    paddingTop: Spacing.six,
    textAlignVertical: 'top',
  },
  editorColorDots: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
  },
  colorDotsRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  colorDot: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: '#495057',
  },
  saveButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  historySection: {
    width: '100%',
    gap: Spacing.two,
  },
  historyRow: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  historyRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyRowHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  deleteText: {
    color: '#e03131',
  },
  pressed: {
    opacity: 0.7,
  },
});
