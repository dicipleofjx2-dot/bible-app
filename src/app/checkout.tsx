import * as Clipboard from 'expo-clipboard';
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getBookWithContent, type Book } from '@/db/library';
import { getSupportSettings, type SupportSettings } from '@/db/support';
import {
  requestBookPurchase,
  requestSubscription,
  SUBSCRIPTION_PRICE,
  type PaymentKind,
} from '@/db/payments';

const EMPTY_SETTINGS: SupportSettings = { coupangUrl: '', bankName: '', bankAccount: '', bankHolder: '' };

// 계좌 한 줄 + 복사 버튼. support.tsx에도 같은 모양이 있지만 저쪽은 후원 안내용
// 이고 이쪽은 결제 절차의 일부라, 서로 독립적으로 바뀔 수 있게 따로 둔다.
function AccountRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <View style={styles.accountRow}>
      <View style={styles.accountInfo}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="smallBold">{value}</ThemedText>
      </View>
      <Pressable
        onPress={async () => {
          await Clipboard.setStringAsync(value);
          setCopied(true);
        }}
        style={[styles.copyButton, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="small">{copied ? '복사됨' : '복사'}</ThemedText>
      </Pressable>
    </View>
  );
}

export default function CheckoutScreen() {
  const { kind, bookId } = useLocalSearchParams<{ kind?: string; bookId?: string }>();
  const theme = useTheme();
  const { session } = useAuth();

  const [settings, setSettings] = useState<SupportSettings>(EMPTY_SETTINGS);
  const [book, setBook] = useState<Book | null>(null);
  const [depositorName, setDepositorName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const paymentKind: PaymentKind = kind === 'subscription' ? 'subscription' : 'book';

  useEffect(() => {
    getSupportSettings()
      .then(setSettings)
      .catch(() => setSettings(EMPTY_SETTINGS));
  }, []);

  useEffect(() => {
    if (paymentKind !== 'book' || !bookId) return;
    getBookWithContent(bookId)
      .then(setBook)
      .catch(() => setBook(null));
  }, [paymentKind, bookId]);

  // 결제는 계정에 권한을 붙이는 일이라 로그인이 반드시 필요하다.
  if (!session) return <Redirect href="/profile" />;

  const amount = paymentKind === 'subscription' ? SUBSCRIPTION_PRICE : (book?.price ?? 0);
  const itemName = paymentKind === 'subscription' ? '정기후원 (월 구독)' : (book?.title ?? '');
  const hasBankInfo = settings.bankName.trim().length > 0 && settings.bankAccount.trim().length > 0;

  async function submit() {
    setError(null);
    setPending(true);
    const result =
      paymentKind === 'subscription'
        ? await requestSubscription(session!.user.id, depositorName)
        : await requestBookPurchase(session!.user.id, bookId!, amount, depositorName);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: '신청 완료' }} />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.content}>
            <ThemedText type="subtitle">입금확인을 요청했어요</ThemedText>
            <ThemedText themeColor="textSecondary">
              관리자가 통장에서 입금을 확인하면 바로 열립니다. 보통 하루 안에 처리되며, 확인이
              끝나면 별도 안내 없이 해당 콘텐츠가 열려 있어요.
            </ThemedText>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">
                신청 내용
              </ThemedText>
              <ThemedText type="smallBold">
                {itemName} · {amount.toLocaleString()}원
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                입금자명 {depositorName.trim()}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => router.back()}
              style={[styles.primaryButton, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">돌아가기</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: '입금 안내' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {paymentKind === 'subscription' ? '정기후원' : '구매하실 책'}
            </ThemedText>
            <ThemedText type="subtitle">{itemName || '불러오는 중...'}</ThemedText>
            <ThemedText type="subtitle">{amount.toLocaleString()}원</ThemedText>
            {paymentKind === 'subscription' && (
              <ThemedText type="small" themeColor="textSecondary">
                승인일로부터 한 달간 데이빗북스 구독전용 콘텐츠를 모두 보실 수 있어요. 자동
                결제가 아니라서 다음 달에 다시 입금해주셔야 이어집니다.
              </ThemedText>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">1. 아래 계좌로 입금해주세요</ThemedText>
            {hasBankInfo ? (
              <>
                <AccountRow label="은행" value={settings.bankName} />
                <AccountRow label="계좌번호" value={settings.bankAccount} />
                <AccountRow label="예금주" value={settings.bankHolder} />
                <ThemedText type="small" themeColor="textSecondary">
                  정확히 {amount.toLocaleString()}원을 보내주시면 확인이 빠릅니다.
                </ThemedText>
              </>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                후원계좌가 아직 등록되지 않았어요. 관리자에게 문의해주세요.
              </ThemedText>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">2. 입금하신 분의 이름을 알려주세요</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              통장에 찍히는 이름을 그대로 적어주세요. 앱 계정 이름과 달라도 괜찮습니다 — 이
              이름으로 입금 내역을 대조합니다.
            </ThemedText>
            <TextInput
              value={depositorName}
              onChangeText={setDepositorName}
              placeholder="예: 홍길동"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
            />
          </View>

          {error && (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          )}

          <Pressable
            disabled={pending || !hasBankInfo || depositorName.trim().length === 0}
            onPress={submit}
            style={[
              styles.primaryButton,
              {
                backgroundColor: theme.backgroundSelected,
                opacity: pending || !hasBankInfo || depositorName.trim().length === 0 ? 0.5 : 1,
              },
            ]}>
            <ThemedText type="smallBold">{pending ? '보내는 중...' : '입금했어요, 확인 요청하기'}</ThemedText>
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary">
            입금 전에 눌러도 괜찮지만, 실제 입금이 확인되어야 열립니다.
          </ThemedText>
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
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  accountInfo: {
    flexShrink: 1,
  },
  copyButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  primaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  errorText: {
    color: '#e03131',
  },
});
