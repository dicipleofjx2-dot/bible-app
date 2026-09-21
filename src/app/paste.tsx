import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Card, ThemedText, ThemedView } from '@/components/themed';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Button, Chip, Row } from '@/features/ui';
import { useTheme } from '@/hooks/use-theme';
import { parseCardMessages, type CardTxn } from '@/lib/cardMessage';
import { CATEGORY_COLORS, guessCategory } from '@/lib/category';
import { dayLabel, formatWon } from '@/lib/money';
import { findExistingKeys, getOverrides, saveTxns, type TxnSource } from '@/db/store';

export default function Paste() {
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ text?: string }>();
  const shared = typeof params.text === 'string' ? params.text : '';
  const [raw, setRaw] = useState(shared);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ added: number; duplicates: number } | null>(null);

  const parsed = useMemo(() => parseCardMessages(raw), [raw]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [keys, saved] = await Promise.all([findExistingKeys(parsed.txns), getOverrides()]);
      if (!alive) return;
      setExisting(keys);
      setOverrides(saved);
    })();
    return () => {
      alive = false;
    };
  }, [parsed]);

  const fresh = parsed.txns.filter((t) => !existing.has(t.key));
  const already = parsed.txns.length - fresh.length;

  const onPasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setRaw((prev) => (prev.trim() === '' ? text : `${prev}\n\n${text}`));
  };

  const onSave = async () => {
    if (fresh.length === 0) return;
    setSaving(true);
    try {
      // 공유로 넘어온 것은 어디서 왔는지 남겨 둔다 — 나중에 「무엇이 자동으로
      // 담겼나」를 되짚을 때 쓴다.
      const source: TxnSource = shared ? 'share' : 'paste';
      const report = await saveTxns(fresh, source);
      setDone(report);
      setRaw('');
    } finally {
      setSaving(false);
    }
  };

  if (done !== null) {
    return (
      <ThemedView style={{ flex: 1, padding: Spacing.lg, gap: Spacing.lg }}>
        <Card style={{ gap: Spacing.sm }}>
          <ThemedText style={{ fontSize: 20, fontWeight: '800' }}>{done.added}건을 담았습니다</ThemedText>
          {done.duplicates > 0 && (
            <ThemedText tone="muted" style={{ fontSize: 14 }}>
              이미 담겨 있던 {done.duplicates}건은 그냥 두었습니다.
            </ThemedText>
          )}
        </Card>
        <Button label="홈으로" onPress={() => router.replace('/')} />
        <Button label="더 넣기" tone="plain" onPress={() => setDone(null)} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Card style={{ gap: Spacing.sm }}>
          <ThemedText style={{ fontWeight: '700' }}>카드 문자를 붙여넣으세요</ThemedText>
          <ThemedText tone="muted" style={{ fontSize: 13, lineHeight: 20 }}>
            카톡 대화를 통째로 붙여넣어도 됩니다. 카드 문자만 골라 읽고, 사이에 낀 이야기는 지나칩니다.
          </ThemedText>
        </Card>

        <TextInput
          multiline
          value={raw}
          onChangeText={setRaw}
          placeholder={'[Web발신]\n삼성카드 승인\n홍*동님\n8,500원 일시불\n09/19 12:10\n김밥천국'}
          placeholderTextColor={palette.textMuted}
          style={{
            minHeight: 160,
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 12,
            backgroundColor: palette.card,
            color: palette.text,
            padding: Spacing.md,
            fontSize: 15,
            textAlignVertical: 'top',
          }}
        />

        <Row style={{ gap: Spacing.md }}>
          <Button label="클립보드에서 붙여넣기" tone="plain" onPress={onPasteFromClipboard} style={{ flex: 1 }} />
          {raw.length > 0 && <Button label="지우기" tone="plain" onPress={() => setRaw('')} />}
        </Row>

        {raw.trim().length > 0 && (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <ThemedText style={{ fontWeight: '700' }}>읽은 내역 {fresh.length}건</ThemedText>
              {already > 0 && (
                <ThemedText tone="muted" style={{ fontSize: 13 }}>
                  이미 담긴 {already}건은 뺐습니다
                </ThemedText>
              )}
            </Row>

            {fresh.map((txn) => (
              <Preview key={txn.key} txn={txn} overrides={overrides} />
            ))}

            {parsed.skipped.length > 0 && (
              <Card style={{ gap: Spacing.sm, backgroundColor: palette.cardMuted }}>
                <ThemedText style={{ fontWeight: '700' }}>못 읽은 것 {parsed.skipped.length}건</ThemedText>
                <ThemedText tone="muted" style={{ fontSize: 12, lineHeight: 18 }}>
                  아래는 카드 문자처럼 보이는데 읽지 못한 것입니다. 형식이 다른 카드사일 수 있습니다.
                </ThemedText>
                {parsed.skipped.slice(0, 5).map((s, i) => (
                  <View key={i} style={{ gap: 2 }}>
                    <ThemedText tone="danger" style={{ fontSize: 12 }}>
                      {s.reason}
                    </ThemedText>
                    <ThemedText tone="muted" style={{ fontSize: 12 }} numberOfLines={2}>
                      {s.text}
                    </ThemedText>
                  </View>
                ))}
              </Card>
            )}

            <Button
              label={saving ? '담는 중…' : `${fresh.length}건 담기`}
              onPress={onSave}
              disabled={saving || fresh.length === 0}
            />
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function Preview({ txn, overrides }: { txn: CardTxn; overrides: Record<string, string> }) {
  const { palette } = useTheme();
  const category = guessCategory(txn.merchant, overrides as never);
  const cancelled = txn.kind === 'cancel';
  return (
    <Card style={{ gap: Spacing.xs, borderLeftWidth: 4, borderLeftColor: CATEGORY_COLORS[category] }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <ThemedText style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>
          {txn.merchant}
        </ThemedText>
        <ThemedText style={{ fontWeight: '800', color: cancelled ? palette.positive : palette.text }}>
          {cancelled ? '−' : ''}
          {txn.amount > 0 ? formatWon(txn.amount) : txn.foreign ? `${txn.foreign.code} ${txn.foreign.value}` : '금액 없음'}
        </ThemedText>
      </Row>
      <Row style={{ gap: Spacing.sm, flexWrap: 'wrap' }}>
        <ThemedText tone="muted" style={{ fontSize: 13 }}>
          {dayLabel(txn.date)} {txn.time ?? ''}
        </ThemedText>
        <Chip label={category} color={CATEGORY_COLORS[category]} selected />
        {txn.installment && txn.installment !== '일시불' && <Chip label={txn.installment} />}
        {cancelled && <Chip label="취소" />}
      </Row>
      {txn.amount === 0 && (
        <ThemedText tone="danger" style={{ fontSize: 12 }}>
          해외 승인이라 원화 금액이 문자에 없습니다. 담은 뒤 내역에서 금액을 적어 주세요.
        </ThemedText>
      )}
    </Card>
  );
}
