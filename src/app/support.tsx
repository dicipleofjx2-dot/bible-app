import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getMyAccess, toggleSubscription, type AccessState } from '@/db/library';
import { getSupportSettings, type SupportSettings } from '@/db/support';

const EMPTY_SETTINGS: SupportSettings = { coupangUrl: '', bankName: '', bankAccount: '', bankHolder: '' };

function AccountRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <View style={styles.accountRow}>
      <View style={styles.accountInfo}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="smallBold">{value}</ThemedText>
      </View>
      <Pressable onPress={copy} style={[styles.copyButton, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="small">{copied ? '복사됨' : '복사'}</ThemedText>
      </Pressable>
    </View>
  );
}

export default function SupportScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const [settings, setSettings] = useState<SupportSettings>(EMPTY_SETTINGS);
  const [access, setAccess] = useState<AccessState>({ purchasedBookIds: [], hasActiveSubscription: false });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getSupportSettings()
      .then(setSettings)
      .catch(() => setSettings(EMPTY_SETTINGS));
    if (session) {
      getMyAccess(session.user.id).then(setAccess).catch(() => {});
    } else {
      setAccess({ purchasedBookIds: [], hasActiveSubscription: false });
    }
  }, [session]);

  useFocusEffect(load);

  async function handleToggleSubscription() {
    if (!session) {
      router.push('/profile');
      return;
    }
    setError(null);
    setPending(true);
    const result = await toggleSubscription(session.user.id, access.hasActiveSubscription);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    load();
  }

  const hasCoupangUrl = settings.coupangUrl.trim().length > 0;
  const hasBankInfo = settings.bankName.trim() || settings.bankAccount.trim();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            후원
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            여러분의 후원이 데이빗바이블이 계속 성장하는 데 큰 힘이 됩니다.
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">💝 정기후원 (월 5,000원)</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              정기후원을 시작하면 데이빗북스 구독전용 콘텐츠도 함께 이용하실 수 있어요. 정식 결제
              연동(카드 자동결제) 준비 중이라, 지금은 체험용으로 구독 상태만 활성화됩니다.
            </ThemedText>
            {error && (
              <ThemedText type="small" style={styles.errorText}>
                {error}
              </ThemedText>
            )}
            <Pressable
              disabled={pending}
              onPress={handleToggleSubscription}
              style={[styles.primaryButton, { backgroundColor: theme.backgroundSelected, opacity: pending ? 0.5 : 1 }]}>
              <ThemedText type="smallBold">
                {pending ? '처리 중...' : access.hasActiveSubscription ? '구독 해지하기' : '정기후원 시작하기'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">🛒 쿠팡파트너스로 응원하기</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              이 링크를 통해 쿠팡에서 구매하시면, 데이빗바이블은 쿠팡 파트너스 활동의 일환으로 일정액의
              수수료를 제공받습니다.
            </ThemedText>
            <Pressable
              disabled={!hasCoupangUrl}
              onPress={() => Linking.openURL(settings.coupangUrl)}
              style={[styles.secondaryButton, { borderColor: theme.backgroundSelected, opacity: hasCoupangUrl ? 1 : 0.4 }]}>
              <ThemedText type="smallBold">{hasCoupangUrl ? '쿠팡에서 응원하기' : '링크 준비 중'}</ThemedText>
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">🏦 후원계좌</ThemedText>
            {hasBankInfo ? (
              <>
                <AccountRow label="은행" value={settings.bankName} />
                <AccountRow label="계좌번호" value={settings.bankAccount} />
                <AccountRow label="예금주" value={settings.bankHolder} />
              </>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                계좌 정보 준비 중입니다.
              </ThemedText>
            )}
          </View>
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
  title: {
    fontSize: 28,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    marginTop: Spacing.one,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1,
    marginTop: Spacing.one,
  },
  errorText: {
    color: '#e03131',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountInfo: {
    gap: Spacing.half,
  },
  copyButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
});
