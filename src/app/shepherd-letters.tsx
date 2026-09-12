import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getPublishedLetters, type ShepherdLetter } from '@/db/shepherdLetters';
import { markLettersSeen } from '@/lib/shepherdLetterBadge';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function ShepherdLettersScreen() {
  const theme = useTheme();
  // 편지는 교회로 갈린다. 로그인해야 어느 교회인지 알 수 있어서, 로그아웃
  // 상태에서는 목록이 빈다(→ `@/lib/churchScope`). 빈 까닭을 「편지가 없다」로
  // 적으면 거짓말이 되므로 로그인 안내로 바꿔 준다.
  const { session } = useAuth();
  const [letters, setLetters] = useState<ShepherdLetter[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getPublishedLetters()
        .then(setLetters)
        .catch((e) => setError(e?.message ?? String(e)));
      markLettersSeen();
    }, [session]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <FlatList
          data={letters}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <ThemedText type="title" style={styles.title}>
              목자의 편지
            </ThemedText>
          }
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              {error ?? (session ? '아직 등록된 편지가 없어요.' : '로그인하면 우리 교회 목자의 편지를 볼 수 있어요.')}
            </ThemedText>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/shepherd-letters/[id]', params: { id: item.id } })}
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
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDate(item.createdAt)}
                </ThemedText>
              </View>
            </Pressable>
          )}
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
  card: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    overflow: 'hidden',
    gap: Spacing.three,
  },
  cover: {
    width: 96,
    height: 96,
  },
  cardBody: {
    flex: 1,
    padding: Spacing.two,
    gap: Spacing.half,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
