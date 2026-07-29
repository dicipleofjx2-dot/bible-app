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
  purchaseBookDevApprove,
  toggleSubscription,
  type AccessState,
  type BookWithContent,
} from '@/db/library';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { session } = useAuth();
  const [book, setBook] = useState<BookWithContent | null>(null);
  const [access, setAccess] = useState<AccessState>({ purchasedBookIds: [], hasActiveSubscription: false });
  const [pending, setPending] = useState<'buy' | 'subscribe' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    getBookWithContent(id).then(setBook).catch(() => setBook(null));
    if (session) getMyAccess(session.user.id).then(setAccess).catch(() => {});
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

  const runAction = async (kind: 'buy' | 'subscribe', run: () => Promise<{ error?: string }>) => {
    if (!session) {
      router.push('/profile');
      return;
    }
    setError(null);
    setPending(kind);
    const { error } = await run();
    setPending(null);
    if (error) setError(error);
    else load();
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
                {canBuy && (
                  <Pressable
                    disabled={pending !== null}
                    onPress={() => runAction('buy', () => purchaseBookDevApprove(session!.user.id, book))}
                    style={[styles.actionButton, { backgroundColor: theme.backgroundSelected, opacity: pending ? 0.5 : 1 }]}>
                    <ThemedText type="smallBold">
                      {pending === 'buy' ? '처리 중...' : `구매하기 · ${book.price.toLocaleString()}원`}
                    </ThemedText>
                  </Pressable>
                )}
                {canSubscribe && (
                  <Pressable
                    disabled={pending !== null}
                    onPress={() =>
                      runAction('subscribe', () => toggleSubscription(session!.user.id, access.hasActiveSubscription))
                    }
                    style={[styles.actionButton, { backgroundColor: theme.backgroundElement, opacity: pending ? 0.5 : 1 }]}>
                    <ThemedText type="smallBold">
                      {pending === 'subscribe' ? '처리 중...' : access.hasActiveSubscription ? '구독 해지' : '구독하기'}
                    </ThemedText>
                  </Pressable>
                )}
              </>
            )}
          </View>

          {error && (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          )}

          {!session && (
            <ThemedText type="small" themeColor="textSecondary">
              구매/구독하려면 먼저 마이페이지에서 로그인해주세요.
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
  errorText: {
    color: '#e03131',
  },
});
