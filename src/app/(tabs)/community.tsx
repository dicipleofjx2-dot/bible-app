import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AuthForm } from '@/features/auth/AuthForm';
import { createPost, getPosts, type Post } from '@/db/community';

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
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <AuthForm />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return <Feed userId={session.user.id} theme={theme} />;
}

function Feed({ userId, theme }: { userId: string; theme: ReturnType<typeof useTheme> }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(() => {
    getPosts()
      .then(setPosts)
      .catch(() => setPosts([]));
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">커뮤니티</ThemedText>
          <View style={styles.headerLinks}>
            <Pressable onPress={() => router.push('/rooms')}>
              <ThemedText type="link" themeColor="textSecondary">
                읽기방
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push('/profile')}>
              <ThemedText type="link" themeColor="textSecondary">
                프로필
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
              <ThemedText type="smallBold">{item.author}</ThemedText>
              <ThemedText type="small" style={styles.postBody}>
                {item.body}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {new Date(item.created_at).toLocaleString('ko-KR')}
              </ThemedText>
            </Pressable>
          )}
        />
      </ThemedView>
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
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  postBody: {},
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
