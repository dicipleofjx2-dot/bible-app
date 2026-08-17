import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getIsAdmin } from '@/db/profile';
import { deleteBoardPost, getBoardPost, type BoardPostWithParagraphs } from '@/db/boards';
import { confirmDestructive } from '@/lib/readingHelper/confirm';

export default function BoardPostScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [post, setPost] = useState<BoardPostWithParagraphs | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      getBoardPost(id)
        .then(setPost)
        .catch(() => setPost(null));
      if (session) {
        getIsAdmin(session.user.id)
          .then(setIsAdmin)
          .catch(() => setIsAdmin(false));
      }
    }, [id, session])
  );

  if (post === undefined) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!post) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">없는 글이에요.</ThemedText>
      </ThemedView>
    );
  }

  const canDelete = !!session && (isAdmin || session.user.id === post.authorId);

  async function remove() {
    if (busy || !post) return;
    const ok = await confirmDestructive('글 지우기', '이 글을 지울까요?');
    if (!ok) return;
    setBusy(true);
    await deleteBoardPost(post.id);
    setBusy(false);
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle" style={styles.title}>
            {post.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {[post.authorName, post.createdAt.slice(0, 10)].filter(Boolean).join(' · ')}
          </ThemedText>

          <View style={styles.body}>
            {post.paragraphs.map((paragraph, i) => (
              <ThemedText key={i} style={styles.paragraph}>
                {paragraph}
              </ThemedText>
            ))}
          </View>

          {canDelete && (
            <Pressable
              disabled={busy}
              onPress={remove}
              style={({ pressed }) => [
                styles.deleteButton,
                { backgroundColor: theme.backgroundElement, opacity: busy ? 0.5 : 1 },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="small" style={styles.deleteText}>
                이 글 지우기
              </ThemedText>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', width: '100%' },
  safeArea: { flex: 1, width: '100%' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  title: { fontSize: 22 },
  body: { gap: Spacing.three, marginTop: Spacing.three },
  paragraph: { fontSize: 17, lineHeight: 30 },
  deleteButton: {
    marginTop: Spacing.five,
    alignSelf: 'flex-start',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  deleteText: { color: '#e03131' },
  pressed: { opacity: 0.85 },
});
