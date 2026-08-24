import { useCallback, useState } from 'react';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createPost, deletePost, getPosts, markCommunitySeen, type Post } from '@/db/community';

export default function CommunityScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText type="subtitle">커뮤니티</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            Supabase가 아직 설정되지 않았습니다. .env에 EXPO_PUBLIC_SUPABASE_URL /
            EXPO_PUBLIC_SUPABASE_ANON_KEY를 설정해주세요.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (loading) return null;

  if (!session) {
    return <Redirect href="/profile" />;
  }

  return <Feed userId={session.user.id} theme={theme} />;
}

function Feed({ userId, theme }: { userId: string; theme: ReturnType<typeof useTheme> }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    getPosts()
      .then(setPosts)
      .catch(() => setPosts([]));
    // 이 화면을 봤다고 적는다 — 홈의 안 읽은 글 수가 여기서 0이 된다.
    // 실패해도 아무 말 하지 않는다. 숫자가 안 지워졌다고 커뮤니티에 오류를
    // 띄울 일은 아니다.
    markCommunitySeen().catch(() => {});
  }, []);

  useFocusEffect(load);

  async function submitPost() {
    if (!body.trim()) return;
    setPosting(true);
    try {
      await createPost(userId, body.trim());
      setBody('');
      load();
    } finally {
      setPosting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePost(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">커뮤니티</ThemedText>
          <View style={styles.headerLinks}>
            <Pressable onPress={() => router.push('/profile')}>
              <ThemedText type="link" themeColor="textSecondary">
                마이페이지
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.composer}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="묵상을 나눠보세요"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.composerInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <Pressable
            onPress={submitPost}
            disabled={posting || !body.trim()}
            style={[
              styles.postButton,
              { backgroundColor: theme.backgroundSelected, opacity: posting || !body.trim() ? 0.5 : 1 },
            ]}>
            <ThemedText type="smallBold">나누기</ThemedText>
          </Pressable>
        </View>

        <FlatList
          style={styles.list}
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              아직 나눈 글이 없습니다. 첫 글을 남겨보세요!
            </ThemedText>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/post/${item.id}`)}
              style={({ pressed }) => [
                styles.postRow,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <View style={styles.postRowHeader}>
                <ThemedText type="smallBold">{item.author}</ThemedText>
                {item.user_id === userId && (
                  <Pressable onPress={() => setDeleteTarget(item)} hitSlop={8}>
                    <ThemedText type="small" style={styles.deleteText}>
                      삭제
                    </ThemedText>
                  </Pressable>
                )}
              </View>
              <ThemedText type="small" style={styles.postBody}>
                {item.body}
              </ThemedText>
              <View style={styles.postRowFooter}>
                <ThemedText type="small" themeColor="textSecondary">
                  {new Date(item.created_at).toLocaleString('ko-KR')}
                </ThemedText>
                {item.commentCount > 0 && (
                  <View style={[styles.commentBadge, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="small" style={styles.commentBadgeText}>
                      💬 답글 {item.commentCount}개
                    </ThemedText>
                  </View>
                )}
              </View>
            </Pressable>
          )}
        />
      </ThemedView>

      <Modal
        visible={deleteTarget != null}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.backdrop}>
          <ThemedView type="background" style={[styles.confirmSheet, { borderColor: theme.backgroundElement }]}>
            <ThemedText type="subtitle">글을 삭제할까요?</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              댓글도 함께 삭제되며 되돌릴 수 없습니다.
            </ThemedText>
            <View style={styles.confirmActions}>
              <Pressable onPress={() => setDeleteTarget(null)} style={styles.confirmActionButton}>
                <ThemedText type="link" themeColor="textSecondary">
                  취소
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                disabled={deleting}
                style={[styles.confirmActionButton, styles.confirmDeleteButton, { opacity: deleting ? 0.5 : 1 }]}>
                <ThemedText type="smallBold" style={styles.confirmDeleteText}>
                  삭제
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  safeAreaCentered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  centerText: {
    textAlign: 'center',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  headerLinks: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  composer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  composerInput: {
    minHeight: 60,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  postButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  list: {
    width: '100%',
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.two,
  },
  postRow: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  postRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteText: {
    color: '#e03131',
  },
  postBody: {},
  postRowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
  },
  commentBadgeText: {
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  confirmSheet: {
    width: '100%',
    maxWidth: 420,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    borderRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
    alignSelf: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  confirmActionButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
  confirmDeleteButton: {
    backgroundColor: '#e03131',
  },
  confirmDeleteText: {
    color: '#fff',
  },
});
