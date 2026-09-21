import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Card, ThemedText, ThemedView } from '@/components/themed';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Button, Chip, Row } from '@/features/ui';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORIES, CATEGORY_COLORS, normalizeMerchant, type Category } from '@/lib/category';
import { dayLabel, formatWon, monthLabel, shiftMonth, thisMonth } from '@/lib/money';
import { txnKey } from '@/lib/cardMessage';
import { deleteTxn, loadMonth, setOverride, updateTxn, type StoredTxn } from '@/db/store';

export default function Txns() {
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ category?: string }>();
  const [month, setMonth] = useState(thisMonth());
  const [txns, setTxns] = useState<StoredTxn[]>([]);
  const [filter, setFilter] = useState<Category | null>(
    typeof params.category === 'string' && (CATEGORIES as readonly string[]).includes(params.category)
      ? (params.category as Category)
      : null
  );
  const [editing, setEditing] = useState<StoredTxn | null>(null);

  const reload = useCallback(async () => {
    setTxns(await loadMonth(month));
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const shown = useMemo(() => (filter ? txns.filter((t) => t.category === filter) : txns), [txns, filter]);
  const used = useMemo(() => [...new Set(txns.map((t) => t.category))], [txns]);

  const byDay = useMemo(() => {
    const groups = new Map<string, StoredTxn[]>();
    for (const txn of shown) {
      const list = groups.get(txn.date) ?? [];
      list.push(txn);
      groups.set(txn.date, list);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [shown]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <View style={{ maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', flex: 1 }}>
        <Row style={{ justifyContent: 'space-between', padding: Spacing.lg, paddingBottom: Spacing.sm }}>
          <Pressable onPress={() => setMonth((m) => shiftMonth(m, -1))} hitSlop={12}>
            <ThemedText style={{ fontSize: 20 }}>‹</ThemedText>
          </Pressable>
          <ThemedText style={{ fontWeight: '700', fontSize: 17 }}>{monthLabel(month)}</ThemedText>
          <Pressable onPress={() => setMonth((m) => shiftMonth(m, 1))} hitSlop={12}>
            <ThemedText style={{ fontSize: 20 }}>›</ThemedText>
          </Pressable>
        </Row>

        {used.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md }}>
            <Chip label="전체" selected={filter === null} onPress={() => setFilter(null)} />
            {used.map((category) => (
              <Chip
                key={category}
                label={category}
                color={CATEGORY_COLORS[category]}
                selected={filter === category}
                onPress={() => setFilter(filter === category ? null : category)}
              />
            ))}
          </ScrollView>
        )}

        <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingTop: 0, gap: Spacing.lg }}>
          {byDay.length === 0 && (
            <ThemedText tone="muted" style={{ textAlign: 'center', marginTop: Spacing.xxl }}>
              이 달에 담긴 내역이 없습니다.
            </ThemedText>
          )}
          {byDay.map(([date, list]) => (
            <View key={date} style={{ gap: Spacing.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <ThemedText tone="muted" style={{ fontSize: 13, fontWeight: '600' }}>
                  {dayLabel(date)}
                </ThemedText>
                <ThemedText tone="muted" style={{ fontSize: 13 }}>
                  {formatWon(
                    list.filter((t) => !t.excluded).reduce((sum, t) => sum + (t.kind === 'cancel' ? -t.amount : t.amount), 0)
                  )}
                </ThemedText>
              </Row>
              {list.map((txn) => (
                <Pressable key={txn.key} onPress={() => setEditing(txn)}>
                  <Card style={{ padding: Spacing.md, borderLeftWidth: 4, borderLeftColor: CATEGORY_COLORS[txn.category], opacity: txn.excluded ? 0.5 : 1 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontWeight: '600' }} numberOfLines={1}>
                          {txn.merchant}
                        </ThemedText>
                        <ThemedText tone="muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {txn.time ?? ''} · {txn.category}
                          {txn.installment && txn.installment !== '일시불' ? ` · ${txn.installment}` : ''}
                          {txn.excluded ? ' · 셈에서 뺌' : ''}
                          {txn.source === 'notification' ? ' · 자동' : ''}
                        </ThemedText>
                      </View>
                      <ThemedText
                        style={{ fontWeight: '700', color: txn.kind === 'cancel' ? palette.positive : palette.text }}>
                        {txn.kind === 'cancel' ? '−' : ''}
                        {txn.amount > 0 ? formatWon(txn.amount) : '금액 없음'}
                      </ThemedText>
                    </Row>
                  </Card>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>

      {editing && (
        <EditSheet
          txn={editing}
          month={month}
          onClose={() => setEditing(null)}
          onChanged={async () => {
            await reload();
            setEditing(null);
          }}
        />
      )}
    </ThemedView>
  );
}

function EditSheet({
  txn,
  month,
  onClose,
  onChanged,
}: {
  txn: StoredTxn;
  month: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { palette } = useTheme();
  const [memo, setMemo] = useState(txn.memo ?? '');
  const [amount, setAmount] = useState(txn.amount > 0 ? String(txn.amount) : '');

  const pickCategory = async (category: Category) => {
    // 고친 것을 **가맹점 단위로 기억한다.** 같은 가게가 다음 달에 또 오면
    // 그때는 묻지 않고 이 갈래로 간다.
    await setOverride(normalizeMerchant(txn.merchant), category);
    await updateTxn(txn.key, month, { category });
    onChanged();
  };

  const saveDetails = async () => {
    const parsedAmount = Number(amount.replace(/[^\d]/g, ''));
    const nextAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : txn.amount;
    // 금액이 바뀌면 열쇠도 바뀌어야 한다 — 안 그러면 같은 문자를 다시 넣었을 때
    // 「이미 있다」고 판단하는 기준이 고친 금액과 어긋난다.
    const nextKey =
      nextAmount === txn.amount
        ? txn.key
        : txnKey({ date: txn.date, time: txn.time, kind: txn.kind, amount: nextAmount, merchant: txn.merchant, card: txn.card, foreign: txn.foreign });
    await updateTxn(txn.key, month, { memo: memo.trim() === '' ? null : memo.trim(), amount: nextAmount, key: nextKey });
    onChanged();
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#00000066' }} onPress={onClose} />
      <View style={{ backgroundColor: palette.card, padding: Spacing.lg, gap: Spacing.md, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' }}>
        <ScrollView contentContainerStyle={{ gap: Spacing.md }}>
          <ThemedText style={{ fontSize: 18, fontWeight: '800' }}>{txn.merchant}</ThemedText>
          <ThemedText tone="muted" style={{ fontSize: 13 }}>
            {dayLabel(txn.date)} {txn.time ?? ''} · {txn.issuer}
            {txn.card ? ` ${txn.card}` : ''} · {txn.kind === 'cancel' ? '취소' : '승인'}
          </ThemedText>

          <ThemedText style={{ fontWeight: '700', marginTop: Spacing.sm }}>갈래</ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {CATEGORIES.map((category) => (
              <Chip
                key={category}
                label={category}
                color={CATEGORY_COLORS[category]}
                selected={txn.category === category}
                onPress={() => void pickCategory(category)}
              />
            ))}
          </View>

          <ThemedText style={{ fontWeight: '700', marginTop: Spacing.sm }}>금액</ThemedText>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder={txn.foreign ? `${txn.foreign.code} ${txn.foreign.value} — 원화로 적어 주세요` : '금액'}
            placeholderTextColor={palette.textMuted}
            style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 10, padding: Spacing.md, color: palette.text, backgroundColor: palette.background }}
          />

          <ThemedText style={{ fontWeight: '700' }}>메모</ThemedText>
          <TextInput
            value={memo}
            onChangeText={setMemo}
            placeholder="무엇이었는지 적어 두기"
            placeholderTextColor={palette.textMuted}
            style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 10, padding: Spacing.md, color: palette.text, backgroundColor: palette.background }}
          />

          <Button label="저장" onPress={() => void saveDetails()} />
          <Button
            label={txn.excluded ? '셈에 다시 넣기' : '이 건은 셈에서 빼기'}
            tone="plain"
            onPress={() => void updateTxn(txn.key, month, { excluded: !txn.excluded }).then(onChanged)}
          />
          <Button label="지우기" tone="danger" onPress={() => void deleteTxn(txn.key, month).then(onChanged)} />
          <Button label="닫기" tone="plain" onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}
