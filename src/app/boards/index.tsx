import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getIsAdmin } from '@/db/profile';
import { getBoards, type Board } from '@/db/boards';

export default function BoardsScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getBoards()
        .then((all) => setBoards(all.filter((b) => b.isActive)))
        .catch(() => setBoards([]));
      if (session) {
        getIsAdmin(session.user.id)
          .then(setIsAdmin)
          .catch(() => setIsAdmin(false));
      } else {
        setIsAdmin(false);
      }
    }, [session])
  );

  if (boards === null) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            게시판
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            성도 누구나 글을 쓸 수 있습니다. 여기에 쓴 글은 교회 홈페이지 게시판에도 함께
            올라갑니다.
          </ThemedText>

          {isAdmin && (
            <Pressable
              onPress={() => router.push('/boards/settings')}
              style={({ pressed }) => [styles.manageLink, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                ⚙️ 게시판 관리
              </ThemedText>
            </Pressable>
          )}

          {boards.map((board) => (
            <Pressable
              key={board.id}
              onPress={() => router.push({ pathname: '/boards/[slug]', params: { slug: board.slug } })}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">
                {board.name}
                {board.writeAccess === 'admin' ? ' · 관리자만 씀' : ''}
              </ThemedText>
              {board.description ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {board.description}
                </ThemedText>
              ) : null}
            </Pressable>
          ))}

          {boards.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              아직 만들어진 게시판이 없어요.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', width: '100%' },
  safeArea: { flex: 1, width: '100%' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: { fontSize: 26 },
  manageLink: { alignSelf: 'flex-end' },
  card: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.one },
  pressed: { opacity: 0.85 },
  empty: { textAlign: 'center', marginTop: Spacing.four },
});
