import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getIsAdmin } from '@/db/profile';
import {
  approvePayment,
  getApprovedTotals,
  getPendingPayments,
  rejectPayment,
  type ApprovedTotals,
  type PaymentRequest,
} from '@/db/payments';

const EMPTY_TOTALS: ApprovedTotals = { thisMonth: 0, allTime: 0, paidBookCount: 0, activeSubscribers: 0 };

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

export default function PaymentsAdminScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [totals, setTotals] = useState<ApprovedTotals>(EMPTY_TOTALS);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    getIsAdmin(session.user.id)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
    getPendingPayments()
      .then(setRequests)
      .catch((e) => setError(e instanceof Error ? e.message : '목록을 불러오지 못했어요.'));
    getApprovedTotals()
      .then(setTotals)
      .catch(() => setTotals(EMPTY_TOTALS));
  }, [session]);

  useFocusEffect(load);

  async function handle(request: PaymentRequest, action: 'approve' | 'reject') {
    setError(null);
    setBusyId(request.id);
    const result =
      action === 'approve' ? await approvePayment(request, session!.user.id) : await rejectPayment(request);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    load();
  }

  if (loading) return null;

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">마이페이지에서 로그인해주세요.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (isAdmin === false) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">관리자만 접근할 수 있어요.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">입금확인</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            통장에 실제로 입금된 것을 확인한 뒤 승인해주세요. 승인하는 순간 해당 사용자에게
            콘텐츠가 열립니다.
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">💰 승인 누계</ThemedText>
            <View style={styles.totalsRow}>
              <View style={styles.totalItem}>
                <ThemedText type="small" themeColor="textSecondary">
                  이번 달
                </ThemedText>
                <ThemedText type="subtitle">{totals.thisMonth.toLocaleString()}원</ThemedText>
              </View>
              <View style={styles.totalItem}>
                <ThemedText type="small" themeColor="textSecondary">
                  전체
                </ThemedText>
                <ThemedText type="subtitle">{totals.allTime.toLocaleString()}원</ThemedText>
              </View>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              판매된 책 {totals.paidBookCount}권 · 정기후원자 {totals.activeSubscribers}명
            </ThemedText>
          </View>

          {error && (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          )}

          <ThemedText type="smallBold">확인 대기 {requests.length}건</ThemedText>

          {requests.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              대기 중인 신청이 없어요.
            </ThemedText>
          ) : (
            requests.map((request) => (
              <View key={request.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {request.kind === 'subscription' ? '💝 정기후원' : '📕 책 구매'} ·{' '}
                  {formatDate(request.requestedAt)} 신청
                </ThemedText>
                <ThemedText type="smallBold">{request.title}</ThemedText>
                <ThemedText type="subtitle">{request.amount.toLocaleString()}원</ThemedText>

                <View style={[styles.depositorBox, { backgroundColor: theme.background }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    통장에서 찾을 이름
                  </ThemedText>
                  <ThemedText type="smallBold">{request.depositorName || '(입력 안 함)'}</ThemedText>
                </View>

                <ThemedText type="small" themeColor="textSecondary">
                  신청 계정: {request.userName || '(닉네임 없음)'}
                </ThemedText>

                <View style={styles.actions}>
                  <Pressable
                    disabled={busyId !== null}
                    onPress={() => handle(request, 'approve')}
                    style={[
                      styles.actionButton,
                      { backgroundColor: theme.backgroundSelected, opacity: busyId === request.id ? 0.5 : 1 },
                    ]}>
                    <ThemedText type="smallBold">
                      {busyId === request.id ? '처리 중...' : '입금 확인됨 · 승인'}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    disabled={busyId !== null}
                    onPress={() => handle(request, 'reject')}
                    style={[styles.actionButton, { backgroundColor: theme.background, opacity: busyId === request.id ? 0.5 : 1 }]}>
                    <ThemedText type="smallBold">거절</ThemedText>
                  </Pressable>
                </View>
              </View>
            ))
          )}
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
  safeAreaCentered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  totalsRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  totalItem: {
    gap: Spacing.half,
  },
  depositorBox: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    marginTop: Spacing.one,
    gap: Spacing.half,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  actionButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  errorText: {
    color: '#e03131',
  },
});
