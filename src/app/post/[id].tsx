import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { addComment, getComments, getPost, type Comment, type Post } from '@/db/community';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { session } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    getPost(id)
      .then(setPost)
      .catch(() => setPost(null));
    getComments(id)
      .then(setComments)
      .catch(() => setComments([]));
  }, [id]);

  useFocusEffect(load);

  async function submitComment() {
    if (!id || !session || !body.trim()) return;
    setPosting(true);
    try {
      await addComment(id, session.user.id, body.trim());
      setBody('');
      load();
    } finally {
      setPosting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            post ? (
              <View style={[styles.postCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">{post.author}</ThemedText>
                <ThemedText style={styles.postBody}>{post.body}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {new Date(post.created_at).toLocaleString('ko-KR')}
                </ThemedText>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              아직 댓글이 없습니다.
            </ThemedText>
          }
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <ThemedText type="smallBold">{item.author}</ThemedText>
              <ThemedText type="small">{item.body}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {new Date(item.created_at).toLocaleString('ko-KR')}
              </ThemedText>
            </View>
          )}
        />

        {session ? (
          <View style={styles.composer}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="댓글을 남겨보세요"
              placeholderTextColor={theme.textSecondary}
              style={[styles.composerInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <Pressable
              onPress={submitComment}
              disabled={posting || !body.trim()}
              style={[
                styles.sendButton,
                { backgroundColor: theme.backgroundSelected, opacity: posting || !body.trim() ? 0.5 : 1 },
              ]}>
              <ThemedText type="smallBold">등록</ThemedText>
            </Pressable>
          </View>
        ) : (
          <ThemedText themeColor="textSecondary" style={styles.signInHint}>
            댓글을 남기려면 커뮤니티 탭에서 로그인해주세요.
          </ThemedText>
        )}
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
    gap: Spacing.two,
  },
  postCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  postBody: {
    fontSize: 17,
    lineHeight: 25,
  },
  commentRow: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    gap: Spacing.half,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  composer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  composerInput: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  sendButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  signInHint: {
    textAlign: 'center',
    padding: Spacing.three,
  },
});
