import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, TextInput, View } from 'react-native';

import { Card, ThemedText, ThemedView } from '@/components/themed';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Button, Row } from '@/features/ui';
import { useTheme } from '@/hooks/use-theme';
import { captureSupported, isListenerEnabled, openListenerSettings } from '@/lib/capture';
import { formatWon } from '@/lib/money';
import { clearAll, getSettings, listMonths, loadMonth, saveSettings, toCsv, type StoredTxn } from '@/db/store';

export default function SettingsScreen() {
  const { palette } = useTheme();
  const [budget, setBudget] = useState('');
  const [listenerOn, setListenerOn] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void getSettings().then((saved) => {
        if (!alive) return;
        setBudget(saved.monthlyBudget === null ? '' : String(saved.monthlyBudget));
        setListenerOn(isListenerEnabled());
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  const onSaveBudget = async () => {
    const digits = budget.replace(/[^\d]/g, '');
    // 빈 칸은 0이 아니라 「안 정함」이다. 0으로 저장하면 예산을 0원으로 잡은
    // 사람처럼 홈 화면이 언제나 빨갛게 된다.
    await saveSettings({ monthlyBudget: digits === '' ? null : Number(digits) });
    setNote(digits === '' ? '예산을 지웠습니다.' : `한 달 예산을 ${formatWon(Number(digits))}으로 정했습니다.`);
  };

  const onExport = async () => {
    const months = await listMonths();
    const all: StoredTxn[] = [];
    for (const month of months) all.push(...(await loadMonth(month)));
    if (all.length === 0) {
      setNote('내보낼 내역이 없습니다.');
      return;
    }
    const csv = toCsv(all.sort((a, b) => a.date.localeCompare(b.date)));

    if (Platform.OS === 'web') {
      // 웹에서는 파일로 내려받는다.
      const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `카드가계부-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setNote(`${all.length}건을 내려받았습니다.`);
      return;
    }
    // 앱에서는 클립보드로. 파일 공유를 붙이려면 expo-file-system 이 더 필요한데,
    // 지금 쓰임(메일로 보내기·메모에 붙이기)에는 이것으로 충분하다.
    await Clipboard.setStringAsync(csv);
    setNote(`${all.length}건을 클립보드에 담았습니다. 메일이나 메모에 붙여넣으세요.`);
  };

  const onClear = () => {
    const wipe = async () => {
      await clearAll();
      setNote('담긴 내역을 모두 지웠습니다.');
    };
    if (Platform.OS === 'web') {
      // 웹의 Alert 은 단추가 하나뿐이라 되물을 수 없다.
      if (typeof window !== 'undefined' && window.confirm('담긴 내역을 모두 지웁니다. 되돌릴 수 없습니다.')) void wipe();
      return;
    }
    Alert.alert('모두 지울까요?', '담긴 내역이 전부 사라집니다. 되돌릴 수 없습니다.', [
      { text: '그만두기', style: 'cancel' },
      { text: '지우기', style: 'destructive', onPress: () => void wipe() },
    ]);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Card style={{ gap: Spacing.sm }}>
          <ThemedText style={{ fontWeight: '700' }}>한 달 예산</ThemedText>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            keyboardType="number-pad"
            placeholder="정하지 않음"
            placeholderTextColor={palette.textMuted}
            style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 10, padding: Spacing.md, color: palette.text, backgroundColor: palette.background }}
          />
          <Button label="저장" onPress={() => void onSaveBudget()} />
        </Card>

        <Card style={{ gap: Spacing.sm }}>
          <ThemedText style={{ fontWeight: '700' }}>자동으로 담기</ThemedText>
          {captureSupported ? (
            <>
              <ThemedText tone="muted" style={{ fontSize: 13, lineHeight: 20 }}>
                알림 접근을 켜 두면 카톡·문자로 카드 문자가 올 때마다 손대지 않아도 담깁니다. 지금{' '}
                <ThemedText style={{ fontWeight: '700' }} tone={listenerOn ? 'accent' : 'danger'}>
                  {listenerOn ? '켜져 있습니다' : '꺼져 있습니다'}
                </ThemedText>
                .
              </ThemedText>
              <ThemedText tone="muted" style={{ fontSize: 12, lineHeight: 18 }}>
                읽은 알림 가운데 「승인/취소」와 금액이 같이 있는 것만 담고, 나머지는 읽는 즉시 버립니다. 담은 것은
                이 기기 안에만 있고 어디로도 보내지 않습니다.
              </ThemedText>
              <Button label={listenerOn ? '알림 접근 설정 열기' : '알림 접근 켜기'} onPress={openListenerSettings} />
            </>
          ) : (
            <ThemedText tone="muted" style={{ fontSize: 13, lineHeight: 20 }}>
              {Platform.OS === 'web'
                ? '웹에서는 자동으로 담을 수 없습니다. 안드로이드 앱에서만 됩니다 — 웹에서는 문자를 붙여넣어 담으세요.'
                : '이 기기에서는 자동으로 담을 수 없습니다. 안드로이드 앱에서만 됩니다.'}
            </ThemedText>
          )}
        </Card>

        <Card style={{ gap: Spacing.sm }}>
          <ThemedText style={{ fontWeight: '700' }}>내보내기</ThemedText>
          <ThemedText tone="muted" style={{ fontSize: 13, lineHeight: 20 }}>
            담긴 내역을 CSV 한 장으로 꺼냅니다. 이 앱은 내역을 이 기기에만 두기 때문에, 기기를 바꿀 때는 이것으로 옮깁니다.
          </ThemedText>
          <Button label="CSV 로 내보내기" tone="plain" onPress={() => void onExport()} />
        </Card>

        <Card style={{ gap: Spacing.sm }}>
          <ThemedText style={{ fontWeight: '700' }}>이 앱이 정보를 다루는 방식</ThemedText>
          <ThemedText tone="muted" style={{ fontSize: 13, lineHeight: 20 }}>
            카드 내역은 언제 어디서 무엇을 했는지가 통째로 드러나는 기록입니다. 그래서 이 앱에는 로그인도 서버도 없고,
            담긴 것은 모두 이 기기 안에만 있습니다. 앱을 지우면 내역도 같이 사라집니다.
          </ThemedText>
        </Card>

        <View style={{ gap: Spacing.sm }}>
          <Button label="담긴 내역 모두 지우기" tone="danger" onPress={onClear} />
        </View>

        {note !== null && (
          <Row style={{ justifyContent: 'center' }}>
            <ThemedText tone="accent" style={{ fontSize: 13 }}>
              {note}
            </ThemedText>
          </Row>
        )}
      </ScrollView>
    </ThemedView>
  );
}
