import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getMyAccess, getPublishedBooks, hasBookAccess, type AccessState, type Book } from '@/db/library';

const TIER_LABEL: Record<Book['accessTier'], string> = {
  free: '무료',
  purchase_only: '개별구매',
  subscription_included: '구독포함',
  both: '구매/구독',
};

export default function LibraryScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [access, setAccess] = useState<AccessState>({ purchasedBookIds: [], hasActiveSubscription: false });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getPublishedBooks()
      .then(setBooks)
      .catch((e) => setError(e?.message ?? String(e)));
    if (session) {
      getMyAccess(session.user.id).then(setAccess).catch(() => {});
    } else {
      setAccess({ purchasedBookIds: [], hasActiveSubscription: false });
    }
  }, [session]);

  useFocusEffect(load);

  if (!isSupabaseConfigured) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            Supabase가 아직 설정되지 않았습니다.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <ThemedText type="title" style={styles.title}>
              데이빗북스
            </ThemedText>
          }
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              {error ?? '아직 등록된 책이 없어요.'}
            </ThemedText>
          }
          renderItem={({ item }) => {
            const locked = !hasBookAccess(item, access);
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/library/[id]', params: { id: item.id } })}
                style={({ pressed }) => [styles.card, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={styles.cover} resizeMode="cover" />
                ) : (
                  <View style={[styles.cover, { backgroundColor: theme.backgroundSelected }]} />
                )}
                <View style={styles.cardBody}>
                  <ThemedText type="smallBold" numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {item.author}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {locked ? `🔒 ${TIER_LABEL[item.accessTier]}` : '✓ 열람 가능'}
                  </ThemedText>
                </View>
              </Pressable>
            );
          }}
        />
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
  centerText: {
    textAlign: 'center',
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
    marginBottom: Spacing.two,
  },
  row: {
    gap: Spacing.three,
  },
  card: {
    flex: 1,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  cardBody: {
    padding: Spacing.two,
    gap: Spacing.half,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
