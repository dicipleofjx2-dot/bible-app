import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getIsAdmin, getProfile } from '@/db/profile';
import {
  createBoardPost,
  getBoardBySlug,
  getBoardPosts,
  type Board,
  type BoardPost,
} from '@/db/boards';

export default function BoardScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [board, setBoard] = useState<Board | null | undefined>(undefined);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myName, setMyName] = useState('');

  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!slug) return;
    getBoardBySlug(slug)
      .then(async (found) => {
        setBoard(found);
        if (found) setPosts(await getBoardPosts(found.id).catch(() => []));
      })
      .catch(() => setBoard(null));

    if (session) {
      getIsAdmin(session.user.id)
        .then(setIsAdmin)
        .catch(() => setIsAdmin(false));
      getProfile(session.user.id)
        .then((p) => setMyName(p?.username ?? ''))
        .catch(() => setMyName(''));
    }
  }, [slug, session]);

  useFocusEffect(load);

  if (board === undefined) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!board) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">없는 게시판이에요.</ThemedText>
      </ThemedView>
    );
  }

  // 글을 쓸 수 있는지는 서버가 최종 판단하지만(RLS), 쓸 수 없는 사람에게 굳이
  // 버튼을 보여 주고 나중에 막는 것보다 미리 감추는 편이 낫다.
  const canWrite = !!session && (isAdmin || board.writeAccess === 'member');

  async function submit() {
    if (!session || busy) return;
    setError(null);
    setBusy(true);
    const result = await createBoardPost({
      boardId: (board as Board).id,
      authorId: session.user.id,
      authorName: myName,
      title,
      bodyText: body,
      imageUrls: [],
    });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setTitle('');
    setBody('');
    setWriting(false);
    load();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            {board.name}
          </ThemedText>
          {board.description ? (
            <ThemedText type="small" themeColor="textSecondary">
              {board.description}
            </ThemedText>
          ) : null}

          {canWrite ? (
            <Pressable
              onPress={() => setWriting((v) => !v)}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                {writing ? '닫기' : '글쓰기'}
              </ThemedText>
            </Pressable>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {session ? '이 게시판은 관리자만 글을 씁니다.' : '글을 쓰시려면 마이페이지에서 로그인해주세요.'}
            </ThemedText>
          )}

          {writing && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="제목"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
              />
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="내용을 적어주세요. 빈 줄로 문단을 나눌 수 있어요."
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[styles.textarea, { color: theme.text, backgroundColor: theme.background }]}
              />
              {error && (
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              )}
              <Pressable
                disabled={busy}
                onPress={submit}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected, opacity: busy ? 0.5 : 1 },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {busy ? '올리는 중...' : '올리기'}
                </ThemedText>
              </Pressable>
            </View>
          )}

          {posts.map((post) => (
            <Pressable
              key={post.id}
              onPress={() => router.push({ pathname: '/boards/post/[id]', params: { id: post.id } })}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">{post.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {post.bodyText.replace(/\s+/g, ' ').trim()}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {[post.authorName, post.createdAt.slice(0, 10)].filter(Boolean).join(' · ')}
              </ThemedText>
            </Pressable>
          ))}

          {posts.length === 0 && !writing && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              아직 올라온 글이 없어요. 첫 글을 써보세요.
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: { fontSize: 26 },
  card: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.two },
  input: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  textarea: {
    minHeight: 140,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  primaryButton: { borderRadius: Spacing.three, paddingVertical: Spacing.three, alignItems: 'center' },
  primaryButtonText: { color: '#fff' },
  pressed: { opacity: 0.85 },
  errorText: { color: '#e03131' },
  empty: { textAlign: 'center', marginTop: Spacing.four },
});
