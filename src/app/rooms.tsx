import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AuthForm } from '@/features/auth/AuthForm';
import { getPlans, type ReadingPlan } from '@/db/plans';
import { createRoom, getAllRooms, getMyRooms, getRoomByInviteCode, joinRoom, type Room } from '@/db/rooms';

export default function RoomsScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();

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

  return <RoomsContent userId={session.user.id} theme={theme} />;
}

function RoomsContent({ userId, theme }: { userId: string; theme: ReturnType<typeof useTheme> }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinPromptRoom, setJoinPromptRoom] = useState<Room | null>(null);
  const [joinPromptCode, setJoinPromptCode] = useState('');
  const [joinPromptError, setJoinPromptError] = useState<string | null>(null);
  const [joinPromptSubmitting, setJoinPromptSubmitting] = useState(false);

  const load = useCallback(() => {
    getMyRooms(userId)
      .then(setRooms)
      .catch((e) => {
        setRooms([]);
        setError(e?.message ?? String(e));
      });
    getAllRooms()
      .then(setAllRooms)
      .catch(() => setAllRooms([]));
  }, [userId]);

  useFocusEffect(load);

  function openJoinPrompt(room: Room) {
    setJoinPromptRoom(room);
    setJoinPromptCode('');
    setJoinPromptError(null);
  }

  async function submitJoinPrompt() {
    if (!joinPromptRoom || !joinPromptCode.trim()) return;
    setJoinPromptSubmitting(true);
    setJoinPromptError(null);
    try {
      const found = await getRoomByInviteCode(joinPromptCode.trim());
      if (!found || found.id !== joinPromptRoom.id) {
        setJoinPromptError('코드가 일치하지 않습니다.');
        return;
      }
      await joinRoom(found.id, userId);
      const roomId = found.id;
      setJoinPromptRoom(null);
      load();
      router.push({ pathname: '/rooms/[id]', params: { id: roomId } });
    } catch (e: any) {
      setJoinPromptError(e?.message ?? '참여하지 못했습니다.');
    } finally {
      setJoinPromptSubmitting(false);
    }
  }

  useEffect(() => {
    getPlans().then((loaded) => {
      setPlans(loaded);
      setSelectedPlanId((prev) => prev ?? loaded[0]?.id ?? null);
    });
  }, []);

  async function handleCreate() {
    if (!name.trim() || !selectedPlanId || !inviteCode.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const room = await createRoom(name.trim(), selectedPlanId, userId, inviteCode.trim());
      setName('');
      setInviteCode('');
      load();
      router.push({ pathname: '/rooms/[id]', params: { id: room.id } });
    } catch (e: any) {
      setError(e?.message ?? '방을 만들지 못했습니다. 다시 시도해주세요.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.formsWrapper}>
              <View style={styles.section}>
                <ThemedText type="smallBold">새 읽기방 만들기</ThemedText>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="방 이름 (예: 우리 가족 요한복음방)"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.nameInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
                <TextInput
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  placeholder="참여 코드 만들기 (예: 가족모임2024)"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="characters"
                  style={[styles.nameInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
                <View style={styles.planRow}>
                  {plans.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => setSelectedPlanId(p.id)}
                      style={[
                        styles.planChip,
                        {
                          backgroundColor:
                            selectedPlanId === p.id ? theme.backgroundSelected : theme.backgroundElement,
                        },
                      ]}>
                      <ThemedText type="small">{p.title}</ThemedText>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  onPress={handleCreate}
                  disabled={creating || !name.trim() || !selectedPlanId || !inviteCode.trim()}
                  style={[
                    styles.actionButton,
                    styles.createButton,
                    {
                      backgroundColor: theme.backgroundSelected,
                      opacity: creating || !name.trim() || !selectedPlanId || !inviteCode.trim() ? 0.5 : 1,
                    },
                  ]}>
                  <ThemedText type="smallBold">방 만들기</ThemedText>
                </Pressable>
              </View>

              {error && (
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              )}

              <ThemedText type="smallBold" style={styles.myRoomsLabel}>
                내 읽기방
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              아직 참여한 읽기방이 없습니다.
            </ThemedText>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/rooms/[id]', params: { id: item.id } })}
              style={({ pressed }) => [
                styles.roomRow,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">{item.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.planTitle}
              </ThemedText>
            </Pressable>
          )}
          ListFooterComponent={
            <View style={styles.browseSection}>
              <ThemedText type="smallBold" style={styles.myRoomsLabel}>
                전체 읽기방 둘러보기
              </ThemedText>
              {allRooms.length === 0 ? (
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  아직 만들어진 읽기방이 없습니다.
                </ThemedText>
              ) : (
                allRooms.map((item) => {
                  const alreadyMember = rooms.some((r) => r.id === item.id);
                  return (
                    <View key={item.id} style={[styles.browseRoomRow, { backgroundColor: theme.backgroundElement }]}>
                      <View style={styles.browseRoomInfo}>
                        <ThemedText type="smallBold">{item.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {item.planTitle}
                        </ThemedText>
                      </View>
                      <Pressable
                        onPress={() =>
                          alreadyMember
                            ? router.push({ pathname: '/rooms/[id]', params: { id: item.id } })
                            : openJoinPrompt(item)
                        }
                        style={[styles.actionButton, { backgroundColor: theme.backgroundSelected }]}>
                        <ThemedText type="smallBold">{alreadyMember ? '입장' : '참여'}</ThemedText>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          }
        />
      </SafeAreaView>

      <Modal
        visible={joinPromptRoom != null}
        animationType="slide"
        transparent
        onRequestClose={() => setJoinPromptRoom(null)}>
        <View style={styles.backdrop}>
          <ThemedView type="background" style={[styles.promptSheet, { borderColor: theme.backgroundElement }]}>
            <ThemedText type="subtitle">{joinPromptRoom?.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.promptHint}>
              방장에게 받은 참여 코드를 입력하세요.
            </ThemedText>
            <TextInput
              value={joinPromptCode}
              onChangeText={setJoinPromptCode}
              placeholder="예: AB12CD"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="characters"
              autoFocus
              style={[styles.codeInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            {joinPromptError && (
              <ThemedText type="small" style={styles.errorText}>
                {joinPromptError}
              </ThemedText>
            )}
            <View style={styles.promptActions}>
              <Pressable onPress={() => setJoinPromptRoom(null)} style={styles.actionButton}>
                <ThemedText type="link" themeColor="textSecondary">
                  취소
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={submitJoinPrompt}
                disabled={joinPromptSubmitting || !joinPromptCode.trim()}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: theme.backgroundSelected,
                    opacity: joinPromptSubmitting || !joinPromptCode.trim() ? 0.5 : 1,
                  },
                ]}>
                <ThemedText type="smallBold">참여하기</ThemedText>
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
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  formsWrapper: {
    gap: Spacing.four,
    marginBottom: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  codeInput: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  nameInput: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  planRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  planChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  actionButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    alignSelf: 'flex-start',
  },
  errorText: {
    color: '#e03131',
  },
  myRoomsLabel: {
    marginTop: Spacing.two,
  },
  roomRow: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  browseSection: {
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  browseRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  browseRoomInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  promptSheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  promptHint: {
    marginBottom: Spacing.one,
  },
  promptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
});
