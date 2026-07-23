import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InlineCalendar } from '@/components/inline-calendar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  addPriorityTask,
  deletePriorityTask,
  getPriorityTaskDates,
  getPriorityTasks,
  updatePriorityTask,
  type PriorityLevel,
  type PriorityTask,
} from '@/db/userData';

function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const PRIORITY_LEVELS: PriorityLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** 1(최우선, 빨강) → 10(최저, 초록) 그라데이션. */
function priorityColor(level: PriorityLevel): string {
  const hue = ((level - 1) / (PRIORITY_LEVELS.length - 1)) * 120;
  return `hsl(${hue}, 70%, 45%)`;
}

export default function PrioritiesScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const [date, setDate] = useState(params.date ?? todayDateString());

  const [tasks, setTasks] = useState<PriorityTask[]>([]);
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>(5);

  const load = useCallback(() => {
    getPriorityTasks(date).then(setTasks);
    getPriorityTaskDates().then((dates) => setMarkedDates(new Set(dates)));
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function addTask() {
    if (!title.trim()) return;
    await addPriorityTask({ date, title, priority });
    setTitle('');
    load();
  }

  async function toggleDone(task: PriorityTask) {
    await updatePriorityTask(task.id, { done: !task.done });
    load();
  }

  async function removeTask(id: number) {
    await deletePriorityTask(id);
    load();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <InlineCalendar selectedDate={date} onSelectDate={setDate} markedDates={markedDates} />

          <View style={styles.titleRow}>
            <ThemedText type="subtitle" style={styles.title}>
              📊 우선순위
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {date}
            </ThemedText>
          </View>

          <View style={styles.composer}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="오늘 할 일을 입력하세요"
              placeholderTextColor={theme.textSecondary}
              onSubmitEditing={addTask}
              style={[styles.titleInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              우선순위 (1 = 가장 급함, 10 = 가장 낮음)
            </ThemedText>
            <View style={styles.priorityGrid}>
              {PRIORITY_LEVELS.map((level) => {
                const color = priorityColor(level);
                const active = priority === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() => setPriority(level)}
                    style={({ pressed }) => [
                      styles.priorityChip,
                      { borderColor: color },
                      active && { backgroundColor: color },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold" style={active ? styles.priorityChipTextActive : { color }}>
                      {level}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={addTask}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">추가</ThemedText>
            </Pressable>
          </View>

          <View style={styles.taskList}>
            {tasks.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                이 날짜에 등록된 할 일이 없어요.
              </ThemedText>
            ) : (
              tasks.map((task) => {
                const color = priorityColor(task.priority);
                return (
                  <View
                    key={task.id}
                    style={[styles.taskRow, { backgroundColor: theme.backgroundElement }]}>
                    <Pressable
                      onPress={() => toggleDone(task)}
                      hitSlop={10}
                      style={[styles.checkbox, { borderColor: color }, !!task.done && { backgroundColor: color }]}>
                      {!!task.done && <ThemedText style={styles.checkMark}>✓</ThemedText>}
                    </Pressable>
                    <View style={styles.taskBody}>
                      <ThemedText
                        type="small"
                        style={!!task.done && styles.taskDone}
                        themeColor={task.done ? 'textSecondary' : 'text'}>
                        {task.title}
                      </ThemedText>
                      <View style={[styles.priorityBadge, { borderColor: color }]}>
                        <ThemedText type="small" style={{ color }}>
                          {task.priority}
                        </ThemedText>
                      </View>
                    </View>
                    <Pressable onPress={() => removeTask(task.id)} hitSlop={10}>
                      <ThemedText type="small" style={styles.deleteText}>
                        삭제
                      </ThemedText>
                    </Pressable>
                  </View>
                );
              })
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
    minHeight: '100%',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.four,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
  },
  composer: {
    width: '100%',
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  titleInput: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    fontSize: 16,
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  priorityChip: {
    minWidth: 44,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
  },
  priorityChipTextActive: {
    color: '#ffffff',
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.five,
  },
  taskList: {
    width: '100%',
    gap: Spacing.three,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 14,
  },
  taskBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  taskDone: {
    textDecorationLine: 'line-through',
  },
  priorityBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
  },
  deleteText: {
    color: '#e03131',
  },
  pressed: {
    opacity: 0.7,
  },
});
