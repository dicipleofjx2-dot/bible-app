import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useCallback, useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

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
  const [savingImage, setSavingImage] = useState(false);
  const coupangViewShotRef = useRef<ViewShotRef>(null);

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

  // 배너를 이미지로 캡처해 기기에 저장/공유한다 — reading-helper/word-card.tsx의
  // 웹(Web Share API 또는 다운로드 링크)/네이티브(expo-sharing) 분기와 동일한 패턴.
  async function handleSaveCoupangImage() {
    if (!coupangViewShotRef.current?.capture) return;
    setSavingImage(true);
    try {
      if (Platform.OS === 'web') {
        const dataUri = await coupangViewShotRef.current.capture();
        const blob = await (await fetch(dataUri)).blob();
        const file = new File([blob], '데이빗바이블쿠팡.png', { type: 'image/png' });
        const nav = navigator as Navigator & {
          canShare?: (data: { files: File[] }) => boolean;
          share?: (data: { files: File[]; title?: string }) => Promise<void>;
        };
        if (nav.canShare?.({ files: [file] }) && nav.share) {
          await nav.share({ files: [file], title: '데이빗바이블쿠팡' });
        } else {
          const link = document.createElement('a');
          link.href = dataUri;
          link.download = '데이빗바이블쿠팡.png';
          document.body.appendChild(link);
          link.click();
          link.remove();
          Alert.alert('이미지 저장 완료', '쿠팡파트너스 배너 이미지가 다운로드되었어요.');
        }
        return;
      }

      const uri = await coupangViewShotRef.current.capture();
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('저장 불가', '이 기기에서는 이미지 저장/공유 기능을 사용할 수 없습니다.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: '데이빗바이블쿠팡 배너 저장' });
    } catch {
      Alert.alert('저장 실패', '잠시 후 다시 시도해주세요.');
    } finally {
      setSavingImage(false);
    }
  }

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
              활동의 일환으로 일정액의 수수료를 제공받습니다. 이미지를 저장해서 따로 공유하실 수도
              있어요.
            </ThemedText>

            <ViewShot ref={coupangViewShotRef} options={{ format: 'png', quality: 1 }}>
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
            </ViewShot>

            <Pressable
              disabled={savingImage}
              onPress={handleSaveCoupangImage}
              style={[styles.secondaryButton, { borderColor: theme.backgroundSelected, opacity: savingImage ? 0.5 : 1 }]}>
              <ThemedText type="smallBold">{savingImage ? '저장 중...' : '📥 이미지 저장'}</ThemedText>
            </Pressable>

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
