import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AuthForm } from '@/features/auth/AuthForm';
import {
  addPrayerComment,
  createPrayerRequest,
  deletePrayerComment,
  deletePrayerRequest,
  getIsAdmin,
  getPrayerComments,
  getPrayerRequests,
  setPrayerCommentHidden,
  type PrayerComment,
  type PrayerRequest,
} from '@/db/prayer';

export default function PrayerGroupScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText type="subtitle">샬롬기도단</ThemedText>
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
          <ThemedText type="subtitle" style={styles.centerText}>
            🙏 샬롬기도단
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            중보기도제목을 나누려면 로그인해주세요.
          </ThemedText>
          <AuthForm />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return <Feed userId={session.user.id} theme={theme} />;
}

function Feed({ userId, theme }: { userId: string; theme: ReturnType<typeof useTheme> }) {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [commentsByRequest, setCommentsByRequest] = useState<Record<string, PrayerComment[]>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PrayerRequest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentPosting, setCommentPosting] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    let list: PrayerRequest[];
    try {
      list = await getPrayerRequests();
    } catch {
      setErrorMessage('기도제목 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    setRequests(list);
    getIsAdmin(userId)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
    const entries = await Promise.all(
      list.map(async (r) => [r.id, await getPrayerComments(r.id).catch(() => [])] as const)
    );
    setCommentsByRequest(Object.fromEntries(entries));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function submitRequest() {
    if (!body.trim()) return;
    setPosting(true);
    setErrorMessage(null);
    try {
      await createPrayerRequest(userId, body.trim());
      setBody('');
      await load();
    } catch {
      setErrorMessage('기도제목 등록에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setPosting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePrayerRequest(deleteTarget.id);
      setRequests((rs) => rs.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function refreshComments(requestId: string) {
    const comments = await getPrayerComments(requestId).catch(() => []);
    setCommentsByRequest((m) => ({ ...m, [requestId]: comments }));
  }

  async function submitComment(requestId: string) {
    const draft = (commentDrafts[requestId] ?? '').trim();
    if (!draft) return;
    setCommentPosting((p) => ({ ...p, [requestId]: true }));
    setErrorMessage(null);
    try {
      await addPrayerComment(requestId, userId, draft);
      setCommentDrafts((d) => ({ ...d, [requestId]: '' }));
      await refreshComments(requestId);
    } catch {
      setErrorMessage('댓글 등록에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setCommentPosting((p) => ({ ...p, [requestId]: false }));
    }
  }

  async function toggleHidden(requestId: string, comment: PrayerComment) {
    await setPrayerCommentHidden(comment.id, !comment.hidden);
    await refreshComments(requestId);
  }

  async function removeComment(requestId: string, commentId: string) {
    await deletePrayerComment(commentId);
    await refreshComments(requestId);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ThemedView style={styles.container}>
        <View style={styles.topSection}>
          <ThemedText type="subtitle">🙏 샬롬기도단</ThemedText>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <ThemedText type="small" style={styles.errorText}>
                {errorMessage}
              </ThemedText>
            </View>
          )}

          <View style={styles.composer}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="중보기도제목을 나눠주세요"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.composerInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <Pressable
              onPress={submitRequest}
              disabled={posting || !body.trim()}
              style={[
                styles.postButton,
                { backgroundColor: theme.backgroundSelected, opacity: posting || !body.trim() ? 0.5 : 1 },
              ]}>
              <ThemedText type="smallBold">기도제목 올리기</ThemedText>
            </Pressable>
          </View>
        </View>

        <FlatList
          style={styles.feedList}
          contentContainerStyle={styles.feedListContent}
          data={requests}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              아직 나눈 기도제목이 없습니다. 첫 기도제목을 올려보세요!
            </ThemedText>
          }
          renderItem={({ item }) => {
            const isOwner = item.user_id === userId;
            const comments = commentsByRequest[item.id] ?? [];
            return (
              <View style={[styles.requestCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.requestRowHeader}>
                  <ThemedText type="smallBold">{item.author}</ThemedText>
                  {isOwner && (
                    <Pressable onPress={() => setDeleteTarget(item)} hitSlop={8}>
                      <ThemedText type="small" style={styles.deleteText}>
                        삭제
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
                <ThemedText type="small" style={styles.requestBody}>
                  {item.body}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {new Date(item.created_at).toLocaleString('ko-KR')}
                </ThemedText>

                <View style={[styles.commentsSection, { borderTopColor: theme.background }]}>
                  {comments.map((comment) => {
                    const canModerate = comment.user_id === userId || isOwner || isAdmin;
                    return (
                      <View
                        key={comment.id}
                        style={[
                          styles.commentRow,
                          { backgroundColor: theme.background },
                          comment.hidden && styles.commentRowHidden,
                        ]}>
                        <View style={styles.commentRowHeader}>
                          <View style={styles.commentRowHeaderLeft}>
                            <ThemedText type="smallBold">{comment.author}</ThemedText>
                            {comment.hidden && (
                              <ThemedText type="small" themeColor="textSecondary" style={styles.hiddenBadge}>
                                숨김
                              </ThemedText>
                            )}
                          </View>
                          {canModerate && (
                            <View style={styles.commentActions}>
                              <Pressable onPress={() => toggleHidden(item.id, comment)} hitSlop={8}>
                                <ThemedText type="small" themeColor="textSecondary">
                                  {comment.hidden ? '숨김 해제' : '숨기기'}
                                </ThemedText>
                              </Pressable>
                              <Pressable onPress={() => removeComment(item.id, comment.id)} hitSlop={8}>
                                <ThemedText type="small" style={styles.deleteText}>
                                  삭제
                                </ThemedText>
                              </Pressable>
                            </View>
                          )}
                        </View>
                        <ThemedText type="small">{comment.body}</ThemedText>
                      </View>
                    );
                  })}

                  <View style={styles.commentComposer}>
                    <TextInput
                      value={commentDrafts[item.id] ?? ''}
                      onChangeText={(t) => setCommentDrafts((d) => ({ ...d, [item.id]: t }))}
                      placeholder="중보 댓글을 남겨보세요"
                      placeholderTextColor={theme.textSecondary}
                      style={[styles.commentInput, { color: theme.text, backgroundColor: theme.background }]}
                    />
                    <Pressable
                      onPress={() => submitComment(item.id)}
                      disabled={commentPosting[item.id] || !(commentDrafts[item.id] ?? '').trim()}
                      style={[
                        styles.commentSendButton,
                        {
                          backgroundColor: theme.backgroundSelected,
                          opacity: commentPosting[item.id] || !(commentDrafts[item.id] ?? '').trim() ? 0.5 : 1,
                        },
                      ]}>
                      <ThemedText type="small">등록</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }}
        />
      </ThemedView>

      <Modal
        visible={deleteTarget != null}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.backdrop}>
          <ThemedView type="background" style={[styles.confirmSheet, { borderColor: theme.backgroundElement }]}>
            <ThemedText type="subtitle">기도제목을 삭제할까요?</ThemedText>
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
  topSection: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  errorBanner: {
    backgroundColor: '#ffe3e3',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  errorText: {
    color: '#c92a2a',
  },
  composer: {
    width: '100%',
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
  // The feed fills all remaining vertical space below the fixed
  // title/composer section (chat-room style, matching rooms/[id].tsx),
  // instead of only being as tall as its own content inside a page-level
  // ScrollView.
  feedList: {
    width: '100%',
    flex: 1,
  },
  feedListContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  requestCard: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  requestRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteText: {
    color: '#e03131',
  },
  requestBody: {},
  commentsSection: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  // A distinct background from requestCard's so comments read as their own
  // nested bubble, not a continuation of the request text (user-requested).
  commentRow: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    gap: Spacing.half,
  },
  commentRowHidden: {
    opacity: 0.55,
  },
  commentRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentRowHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  hiddenBadge: {
    fontStyle: 'italic',
  },
  commentActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  commentComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  commentInput: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  commentSendButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
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
