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
  addFinanceEntry,
  deleteFinanceEntry,
  getAllFinanceEntries,
  getFinanceEntries,
  type FinanceEntry,
  type FinanceType,
} from '@/db/userData';

function todayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

const INCOME_CATEGORIES = ['월급', '용돈', '투자소득', '이자배당', '사업소득', '후원금'];
const EXPENSE_CATEGORIES = [
  '십일조',
  '헌금',
  '저축',
  '투자',
  '관리비',
  '식비',
  '외식비',
  '생필품비',
  '의료비',
  '의류비',
  '보험비',
  '교육비',
];

export default function KingdomFinanceScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  const [date, setDate] = useState(params.date ?? todayDateString());

  const [dayEntries, setDayEntries] = useState<FinanceEntry[]>([]);
  const [allEntries, setAllEntries] = useState<FinanceEntry[]>([]);
  const [type, setType] = useState<FinanceType>('expense');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  const load = useCallback(() => {
    getFinanceEntries(date).then(setDayEntries);
    getAllFinanceEntries().then(setAllEntries);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totals = useMemo(() => {
    const income = allEntries.filter((e) => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const expense = allEntries.filter((e) => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    return { income, expense, balance: income - expense };
  }, [allEntries]);

  const markedDates = useMemo(() => new Set(allEntries.map((e) => e.date)), [allEntries]);

  async function addEntry() {
    const parsed = Number(amount.replace(/[^0-9]/g, ''));
    if (!category.trim() || !parsed) return;
    await addFinanceEntry({ date, type, category, amount: parsed, memo });
    setCategory('');
    setAmount('');
    setMemo('');
    load();
  }

  async function removeEntry(id: number) {
    await deleteFinanceEntry(id);
    load();
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <InlineCalendar selectedDate={date} onSelectDate={setDate} markedDates={markedDates} />

          <View style={styles.titleRow}>
            <ThemedText type="subtitle" style={styles.title}>
              🪙 천국재정
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {date}
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <ThemedText type="small" themeColor="textSecondary">
                총 수입
              </ThemedText>
              <ThemedText type="smallBold" style={styles.incomeText}>
                +{formatWon(totals.income)}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText type="small" themeColor="textSecondary">
                총 지출
              </ThemedText>
              <ThemedText type="smallBold" style={styles.expenseText}>
                -{formatWon(totals.expense)}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText type="smallBold">잔액</ThemedText>
              <ThemedText type="smallBold">{formatWon(totals.balance)}</ThemedText>
            </View>
          </ThemedView>

          <View style={styles.composer}>
            <View style={styles.typeRow}>
              <Pressable
                onPress={() => {
                  setType('income');
                  setCategory('');
                }}
                style={({ pressed }) => [
                  styles.typeChip,
                  type === 'income' && styles.typeChipIncomeActive,
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="small" style={type === 'income' ? styles.typeChipTextActive : undefined}>
                  수입
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setType('expense');
                  setCategory('');
                }}
                style={({ pressed }) => [
                  styles.typeChip,
                  type === 'expense' && styles.typeChipExpenseActive,
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="small" style={type === 'expense' ? styles.typeChipTextActive : undefined}>
                  지출
                </ThemedText>
              </Pressable>
            </View>
            <View style={styles.categoryChipRow}>
              {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={({ pressed }) => [
                    styles.categoryChip,
                    { backgroundColor: c === category ? theme.backgroundSelected : theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="small">{c}</ThemedText>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="분류 (직접 입력하거나 위 버튼을 선택하세요)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="금액"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholder="메모 (선택)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <Pressable
              onPress={addEntry}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">내역 추가</ThemedText>
            </Pressable>
          </View>

          <View style={styles.entryList}>
            <ThemedText type="smallBold">{date} 내역</ThemedText>
            {dayEntries.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                이 날짜에 등록된 내역이 없어요.
              </ThemedText>
            ) : (
              dayEntries.map((entry) => (
                <View key={entry.id} style={[styles.entryRow, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.entryBody}>
                    <ThemedText type="small">{entry.category}</ThemedText>
                    {entry.memo ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {entry.memo}
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText
                    type="smallBold"
                    style={entry.type === 'income' ? styles.incomeText : styles.expenseText}>
                    {entry.type === 'income' ? '+' : '-'}
                    {formatWon(entry.amount)}
                  </ThemedText>
                  <Pressable onPress={() => removeEntry(entry.id)} hitSlop={10}>
                    <ThemedText type="small" style={styles.deleteText}>
                      삭제
                    </ThemedText>
                  </Pressable>
                </View>
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
  },
  summaryCard: {
    width: '100%',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incomeText: {
    color: '#2f9e44',
  },
  expenseText: {
    color: '#e03131',
  },
  composer: {
    width: '100%',
    gap: Spacing.two,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  typeChip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    borderWidth: 1.5,
    borderColor: '#adb5bd',
  },
  typeChipIncomeActive: {
    backgroundColor: '#2f9e44',
    borderColor: '#2f9e44',
  },
  typeChipExpenseActive: {
    backgroundColor: '#e03131',
    borderColor: '#e03131',
  },
  typeChipTextActive: {
    color: '#ffffff',
  },
  categoryChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  categoryChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  input: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  entryList: {
    width: '100%',
    gap: Spacing.two,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  entryBody: {
    flex: 1,
    gap: Spacing.half,
  },
  deleteText: {
    color: '#e03131',
  },
  pressed: {
    opacity: 0.7,
  },
});
