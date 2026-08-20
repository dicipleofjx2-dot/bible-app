import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getMyAccess, toggleSubscription, type AccessState } from '@/db/library';
import { getSupportSettings, type SupportSettings } from '@/db/support';

const EMPTY_SETTINGS: SupportSettings = { coupangUrl: '', bankName: '', bankAccount: '', bankHolder: '' };

// 앱에서 홈 화면에 아이콘을 직접 깔아줄 방법은 없다(iOS는 원천 차단, Android도
// OS 확인 팝업이 필요) — 대신 이 배너를 아이콘/매니페스트로 등록해둔 전용
// 페이지(public/coupang.html)를 열어, 사용자가 브라우저의 "홈 화면에 추가"를 한 번
// 누르면 그 아이콘 그대로 홈 화면에 생기고 탭하면 쿠팡으로 바로 연결된다.
// 경로는 슬래시 없는 /coupang(cleanUrls로 coupang.html에 매핑) — vercel.json의
// trailingSlash:false와 /coupang/ 형태가 충돌해 앱 자체로 라우팅되어버리는
// 문제가 있었다(사이트 전체가 쓰는 확장자 없는 URL 관례를 그대로 따름).
function getCoupangShortcutUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/coupang`;
  }
  return 'https://dicipleofjx-bible.vercel.app/coupang';
}

/**
 * 후원계좌 한 덩어리.
 *
 * 예전에는 은행·계좌번호·예금주를 세 줄로 늘어놓고 줄마다 복사 단추를 붙였다.
 * 그런데 옮겨 적을 것은 계좌번호 하나뿐이다 — 은행 이름과 예금주는 눈으로
 * 확인하는 것이지 복사할 것이 아니다. 단추가 세 개면 어느 것을 눌러야 할지
 * 한 번 더 생각하게 된다.
 *
 * 은행과 계좌번호를 한 줄에 두고 복사는 그 줄에만 붙인다. 예금주는 그 아래
 * 작게. 두 줄이면 충분하다.
 */
function AccountBlock({ settings }: { settings: SupportSettings }) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  const account = settings.bankAccount.trim();
  const bank = settings.bankName.trim();
  const holder = settings.bankHolder.trim();

  async function copy() {
    // 계좌번호만 복사한다. 은행 이름까지 붙이면 이체 화면에 그대로 붙일 수 없다.
    await Clipboard.setStringAsync(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <View style={styles.accountBlock}>
      <View style={styles.accountRow}>
        <View style={styles.accountInfo}>
          <ThemedText type="smallBold">
            {bank ? `${bank} ` : ''}
            {account}
          </ThemedText>
          {holder ? (
            <ThemedText type="small" themeColor="textSecondary">
              예금주 {holder}
            </ThemedText>
          ) : null}
        </View>
        {account ? (
          <Pressable
            onPress={copy}
            accessibilityLabel="계좌번호 복사"
            style={[styles.copyButton, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small">{copied ? '복사됨' : '복사'}</ThemedText>
          </Pressable>
        ) : null}
      </View>
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
              이 배너를 탭하면 쿠팡으로 이동하고, 거기서 구매하시면 데이빗바이블이 쿠팡 파트너스
              활동의 일환으로 일정액의 수수료를 제공받습니다.
            </ThemedText>

            <Pressable
              disabled={!hasCoupangUrl}
              onPress={() => Linking.openURL(settings.coupangUrl)}
              style={({ pressed }) => [styles.coupangBanner, pressed && styles.pressed]}>
              <View style={styles.coupangBannerImageWrap}>
                <Image
                  source={require('@/assets/images/coupang-support-banner.png')}
                  style={styles.coupangBannerImage}
                  resizeMode="cover"
                />
              </View>
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL(getCoupangShortcutUrl())}
              style={[styles.secondaryButton, { borderColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">🏠 홈 화면에 추가하기</ThemedText>
            </Pressable>
            <ThemedText type="small" themeColor="textSecondary">
              전용 페이지가 새로 열리면, 브라우저 메뉴에서 "홈 화면에 추가"를 눌러보세요. 이
              배너 아이콘이 그대로 홈 화면에 생기고, 다음부터는 아이콘만 눌러도 바로 쿠팡으로
              연결됩니다.
            </ThemedText>

            {!hasCoupangUrl && (
              <ThemedText type="small" themeColor="textSecondary">
                링크가 아직 설정되지 않아 배너를 탭해도 이동하지 않아요. 관리자가 링크를 등록하면
                바로 연결됩니다.
              </ThemedText>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">🏦 후원계좌</ThemedText>
            {hasBankInfo ? (
              <AccountBlock settings={settings} />
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
  coupangBanner: {
    width: '100%',
    maxWidth: 280,
    alignSelf: 'center',
  },
  coupangBannerImageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  coupangBannerImage: {
    width: '100%',
    height: '100%',
  },
  pressed: {
    opacity: 0.8,
  },
  errorText: {
    color: '#e03131',
  },
  accountBlock: {
    gap: Spacing.one,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  accountInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  copyButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
});
