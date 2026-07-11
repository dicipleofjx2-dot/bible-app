import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getBooks, type Book } from '@/db/bible';
import {
  deleteRoom,
  getAllProfiles,
  getRoomActivity,
  getRoomDetail,
  getRoomMembers,
  getRoomMessages,
  joinRoom,
  postRoomMessage,
  type Profile,
  type Room,
  type RoomActivityEntry,
  type RoomMember,
  type RoomMessage,
} from '@/db/rooms';

type TimelineItem =
  | ({ kind: 'activity' } & RoomActivityEntry)
  | ({ kind: 'message' } & RoomMessage);

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const { session, loading } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [activity, setActivity] = useState<RoomActivityEntry[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chatBody, setChatBody] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [inviteQuery, setInviteQuery] = useState('');
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoadError(null);
    try {
      const [detail, activityRows, messageRows, memberRows, bookList] = await Promise.all([
        getRoomDetail(id),
        getRoomActivity(id),
        getRoomMessages(id),
        getRoomMembers(id),
        getBooks(db),
      ]);
      if (detail) {
        setRoom(detail.room);
        setMemberCount(detail.memberCount);
      } else {
        setLoadError('방을 찾을 수 없습니다.');
      }
      setActivity(activityRows);
      setMessages(messageRows);
      setMembers(memberRows);
      setBooks(bookList);
    } catch (e: any) {
      setLoadError(e?.message ?? String(e));
    }
  }, [id, db]);

  useFocusEffect(
    useCallback(() => {
      if (session) load();
    }, [load, session])
  );

  async function copyInviteCode() {
    if (!room) return;
    await Clipboard.setStringAsync(room.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendMessage() {
    if (!id || !session || !chatBody.trim()) return;
    setSending(true);
    try {
      await postRoomMessage(id, session.user.id, chatBody.trim());
      setChatBody('');
      load();
    } finally {
      setSending(false);
    }
  }

  function openInvite() {
    setInviteVisible(true);
    setInviteQuery('');
    getAllProfiles()
      .then(setAllProfiles)
      .catch(() => setAllProfiles([]));
  }

  async function invite(targetUserId: string) {
    if (!id) return;
    setInvitingUserId(targetUserId);
    try {
      await joinRoom(id, targetUserId);
      load();
    } finally {
      setInvitingUserId(null);
    }
  }

  async function confirmDelete() {
    if (!id) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteRoom(id);
      setDeleteConfirmVisible(false);
      router.replace('/rooms');
    } catch (e: any) {
      setDeleteError(e?.message ?? '방을 삭제하지 못했습니다.');
    } finally {
      setDeleting(false);
    }
  }

  const bookName = (bookId: number) => books.find((b) => b.id === bookId)?.name_ko ?? '';

  const timeline: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [
      ...activity.map((a) => ({ kind: 'activity' as const, ...a })),
      ...messages.map((m) => ({ kind: 'message' as const, ...m })),
    ];
    return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [activity, messages]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.userId)), [members]);
  const inviteCandidates = allProfiles.filter(
    (p) => !memberIds.has(p.id) && p.username.toLowerCase().includes(inviteQuery.toLowerCase())
  );

  if (loading) return null;

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            읽기방을 보려면 커뮤니티 탭에서 로그인해주세요.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const isOwner = room != null && room.ownerId === session.user.id;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: room?.name ?? '읽기방' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {loadError && (
          <ThemedText type="small" style={styles.errorText}>
            {loadError}
          </ThemedText>
        )}

        {room && (
          <View style={styles.header}>
            <ThemedText type="subtitle">{room.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {room.planTitle} · 멤버 {memberCount}명
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {members.map((m) => m.username).join(', ')}
            </ThemedText>
            <View style={styles.headerRow}>
              <Pressable
                onPress={copyInviteCode}
                style={[styles.inviteRow, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  초대 코드
                </ThemedText>
                <ThemedText type="smallBold">{room.inviteCode}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {copied ? '복사됨!' : '눌러서 복사'}
                </ThemedText>
              </Pressable>
              {isOwner && (
                <Pressable
                  onPress={openInvite}
                  style={[styles.inviteButton, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold">초대하기</ThemedText>
                </Pressable>
              )}
              {isOwner && (
                <Pressable
                  onPress={() => {
                    setDeleteError(null);
                    setDeleteConfirmVisible(true);
                  }}
                  style={styles.deleteButton}>
                  <ThemedText type="small" style={styles.deleteButtonText}>
                    방 삭제
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </View>
        )}

        <FlatList
          data={timeline}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              아직 활동이나 대화가 없어요. 계획의 오늘 분량을 읽거나 메시지를 남겨보세요.
            </ThemedText>
          }
          renderItem={({ item }) =>
            item.kind === 'activity' ? (
              <View style={styles.activityRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                  {item.author}님이 {bookName(item.bookId)} {item.chapter}장을 읽었어요 · {item.dayNumber}
                  일차
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.messageRow, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small">
                  <ThemedText type="smallBold">{item.author}</ThemedText>
                  {'  '}
                  {item.body}
                </ThemedText>
              </View>
            )
          }
        />

        <View style={styles.composer}>
          <TextInput
            value={chatBody}
            onChangeText={setChatBody}
            placeholder="메시지를 입력하세요"
            placeholderTextColor={theme.textSecondary}
            style={[styles.composerInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <Pressable
            onPress={sendMessage}
            disabled={sending || !chatBody.trim()}
            style={[
              styles.sendButton,
              { backgroundColor: theme.backgroundSelected, opacity: sending || !chatBody.trim() ? 0.5 : 1 },
            ]}>
            <ThemedText type="smallBold">전송</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal
        visible={inviteVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setInviteVisible(false)}>
        <View style={styles.backdrop}>
          <ThemedView type="background" style={[styles.inviteSheet, { borderColor: theme.backgroundElement }]}>
            <View style={styles.inviteSheetHeader}>
              <ThemedText type="subtitle">초대하기</ThemedText>
              <Pressable onPress={() => setInviteVisible(false)}>
                <ThemedText type="link" themeColor="textSecondary">
                  닫기
                </ThemedText>
              </Pressable>
            </View>
            <TextInput
              value={inviteQuery}
              onChangeText={setInviteQuery}
              placeholder="닉네임 검색"
              placeholderTextColor={theme.textSecondary}
              style={[styles.nameInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <FlatList
              data={inviteCandidates}
              keyExtractor={(item) => item.id}
              style={styles.inviteList}
              ListEmptyComponent={
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  초대할 수 있는 가입자가 없습니다.
                </ThemedText>
              }
              renderItem={({ item }) => (
                <View style={styles.inviteCandidateRow}>
                  <ThemedText type="small">{item.username}</ThemedText>
                  <Pressable
                    onPress={() => invite(item.id)}
                    disabled={invitingUserId === item.id}
                    style={[
                      styles.actionButton,
                      { backgroundColor: theme.backgroundSelected, opacity: invitingUserId === item.id ? 0.5 : 1 },
                    ]}>
                    <ThemedText type="smallBold">초대</ThemedText>
                  </Pressable>
                </View>
              )}
            />
          </ThemedView>
        </View>
      </Modal>

      <Modal
        visible={deleteConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteConfirmVisible(false)}>
        <View style={styles.backdrop}>
          <ThemedView type="background" style={[styles.confirmSheet, { borderColor: theme.backgroundElement }]}>
            <ThemedText type="subtitle">방을 삭제할까요?</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {room?.name} 방의 멤버, 채팅, 활동 기록이 모두 삭제되며 되돌릴 수 없습니다.
            </ThemedText>
            {deleteError && (
              <ThemedText type="small" style={styles.errorText}>
                {deleteError}
              </ThemedText>
            )}
            <View style={styles.promptActions}>
              <Pressable onPress={() => setDeleteConfirmVisible(false)} style={styles.actionButton}>
                <ThemedText type="link" themeColor="textSecondary">
                  취소
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                disabled={deleting}
                style={[styles.actionButton, styles.confirmDeleteButton, { opacity: deleting ? 0.5 : 1 }]}>
                <ThemedText type="smallBold" style={styles.confirmDeleteText}>
                  삭제
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
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
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.one,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  inviteRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  inviteButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  deleteButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
  },
  deleteButtonText: {
    color: '#e03131',
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  activityRow: {
    paddingVertical: Spacing.one,
  },
  messageRow: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  errorText: {
    color: '#e03131',
    textAlign: 'center',
    marginTop: Spacing.three,
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
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  inviteSheet: {
    maxHeight: '80%',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  inviteSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameInput: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  inviteList: {
    marginTop: Spacing.two,
  },
  inviteCandidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  actionButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
  promptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    marginTop: Spacing.two,
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
  confirmDeleteButton: {
    backgroundColor: '#e03131',
  },
  confirmDeleteText: {
    color: '#fff',
  },
});
