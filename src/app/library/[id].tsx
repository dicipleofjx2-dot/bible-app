import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  getBookWithContent,
  getMyAccess,
  hasBookAccess,
  PREVIEW_PARAGRAPH_LIMIT,
  type AccessState,
  type BookWithContent,
} from '@/db/library';
import { getMyPaymentStatus, SUBSCRIPTION_PRICE, type MyPaymentStatus } from '@/db/payments';

const NO_PAYMENTS: MyPaymentStatus = { pendingBookIds: [], hasPendingSubscription: false };

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { session } = useAuth();
  const [book, setBook] = useState<BookWithContent | null>(null);
  const [access, setAccess] = useState<AccessState>({ purchasedBookIds: [], hasActiveSubscription: false });
  const [payments, setPayments] = useState<MyPaymentStatus>(NO_PAYMENTS);

  const load = useCallback(() => {
    if (!id) return;
    getBookWithContent(id).then(setBook).catch(() => setBook(null));
    if (session) {
      getMyAccess(session.user.id).then(setAccess).catch(() => {});
      getMyPaymentStatus(session.user.id).then(setPayments).catch(() => setPayments(NO_PAYMENTS));
    } else {
      setAccess({ purchasedBookIds: [], hasActiveSubscription: false });
      setPayments(NO_PAYMENTS);
    }
  }, [id, session]);

  useFocusEffect(load);

  if (!book) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">책을 찾을 수 없어요.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const hasAccess = hasBookAccess(book, access);
  const canBuy = book.accessTier === 'purchase_only' || book.accessTier === 'both';
  const canSubscribe = book.accessTier === 'subscription_included' || book.accessTier === 'both';
  const awaitingPurchase = payments.pendingBookIds.includes(book.id);
  const awaitingSubscription = payments.hasPendingSubscription;

  // 결제는 계정에 권한을 붙이는 일이라 로그인이 먼저다. 로그인 상태면 입금 안내
  // 화면(checkout)으로 넘겨서 계좌번호와 입금자명을 받는다.
  const goToCheckout = (kind: 'book' | 'subscription') => {
    if (!session) {
      router.push('/profile');
      return;
    }
    router.push(
      kind === 'subscription'
        ? { pathname: '/checkout', params: { kind: 'subscription' } }
        : { pathname: '/checkout', params: { kind: 'book', bookId: book.id } },
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: book.title }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.content}>
          {book.coverUrl ? (
            <Image source={{ uri: book.coverUrl }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={[styles.cover, { backgroundColor: theme.backgroundSelected }]} />
          )}

          <ThemedText type="subtitle">{book.title}</ThemedText>
          <ThemedText themeColor="textSecondary">{book.author}</ThemedText>
          <ThemedText style={styles.description}>{book.description}</ThemedText>

          <View style={styles.actions}>
            {/* 파일(EPUB/PDF) 기반 책은 문단 단위 미리보기가 없어서 이 버튼을 숨긴다 */}
            {!book.filePath && (
              <Pressable
                onPress={() => router.push({ pathname: '/library/[id]/read', params: { id: book.id } })}
                style={[styles.actionButton, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">무료 미리보기</ThemedText>
              </Pressable>
            )}

            {hasAccess ? (
              <Pressable
                onPress={() => router.push({ pathname: '/library/[id]/read', params: { id: book.id } })}
                style={[styles.actionButton, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">읽기 시작</ThemedText>
              </Pressable>
            ) : (
              <>
                {canBuy &&
                  (awaitingPurchase ? (
                    <View style={[styles.actionButton, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="smallBold">⏳ 입금확인 중</ThemedText>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => goToCheckout('book')}
                      style={[styles.actionButton, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText type="smallBold">구매하기 · {book.price.toLocaleString()}원</ThemedText>
                    </Pressable>
                  ))}
                {canSubscribe &&
                  (awaitingSubscription ? (
                    <View style={[styles.actionButton, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="smallBold">⏳ 정기후원 확인 중</ThemedText>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => goToCheckout('subscription')}
                      style={[styles.actionButton, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="smallBold">
                        정기후원으로 보기 · 월 {SUBSCRIPTION_PRICE.toLocaleString()}원
                      </ThemedText>
                    </Pressable>
                  ))}
              </>
            )}
          </View>

          {/* 잠긴 책이면 "무엇을 얻는지"를 먼저 보여준다 — 가격만 붙여두면
              구매 버튼을 누를 이유가 생기지 않는다. */}
          {!hasAccess && (
            <View style={[styles.lockCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">🔒 지금은 앞부분만 보실 수 있어요</ThemedText>
              {book.filePath ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {canBuy ? `${book.price.toLocaleString()}원에 구매하시면 ` : '정기후원을 시작하시면 '}
                  전체 내용을 언제든 다시 열어보실 수 있어요.
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  전체 {book.paragraphs.length.toLocaleString()}개 문단 중 앞 {PREVIEW_PARAGRAPH_LIMIT}개까지
                  무료로 읽으실 수 있고, 나머지{' '}
                  {Math.max(book.paragraphs.length - PREVIEW_PARAGRAPH_LIMIT, 0).toLocaleString()}개 문단은
                  {canBuy ? ` ${book.price.toLocaleString()}원에 구매하시면 ` : ' 정기후원을 시작하시면 '}
                  바로 열립니다.
                </ThemedText>
              )}
              {(awaitingPurchase || awaitingSubscription) && (
                <ThemedText type="small" themeColor="textSecondary">
                  입금확인을 요청하셨어요. 관리자가 통장에서 확인하면 바로 열립니다.
                </ThemedText>
              )}
            </View>
          )}

          {!session && (
            <ThemedText type="small" themeColor="textSecondary">
              구매/후원하려면 먼저 마이페이지에서 로그인해주세요.
            </ThemedText>
          )}
        </View>
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
  cover: {
    width: 160,
    aspectRatio: 3 / 4,
    borderRadius: Spacing.three,
    alignSelf: 'center',
    marginBottom: Spacing.two,
  },
  description: {
    marginTop: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  actionButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  lockCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
});
