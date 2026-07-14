import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AuthForm } from '@/features/auth/AuthForm';
import { BookChapterPicker } from '@/features/bible/BookChapterPicker';
import { getBooks, getChapterCount, type Book } from '@/db/bible';
import { addDays, createPlan, deletePlan, getPlans, todayDateString, type ReadingPlan } from '@/db/plans';
import { createRoom, getAllRooms, getMyRooms, getRoomByInviteCode, joinRoom, type Room } from '@/db/rooms';

const DURATION_PRESETS = [
  { code: '1w', label: '1주', days: 7 },
  { code: '1m', label: '1달', days: 30 },
  { code: '3m', label: '3달', days: 90 },
  { code: '6m', label: '6달', days: 180 },
  { code: '1y', label: '1년', days: 365 },
  { code: 'custom', label: '직접 설정', days: null },
] as const;
type DurationCode = (typeof DURATION_PRESETS)[number]['code'];

type ChapterPoint = { bookId: number; chapter: number };

/** Flattens a book/chapter range (inclusive) into reading order, crossing
 * book boundaries as needed, using each book's real chapter count. */
async function enumerateChapters(
  db: ReturnType<typeof useSQLiteContext>,
  books: Book[],
  start: ChapterPoint,
  end: ChapterPoint
): Promise<ChapterPoint[]> {
  const result: ChapterPoint[] = [];
  let bookIndex = books.findIndex((b) => b.id === start.bookId);
  let chapter = start.chapter;
  if (bookIndex === -1) return result;

  while (bookIndex < books.length) {
    const book = books[bookIndex];
    result.push({ bookId: book.id, chapter });
    if (book.id === end.bookId && chapter === end.chapter) break;

    const maxChapter = await getChapterCount(db, book.id);
    if (chapter < maxChapter) {
      chapter++;
    } else {
      bookIndex++;
      chapter = 1;
    }
    if (result.length > 2000) break; // safety cap against a backwards/invalid range
  }
  return result;
}

export default function BibleReadingScreen() {
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

  return <BibleReadingContent userId={session.user.id} />;
}

function BibleReadingContent({ userId }: { userId: string }) {
  const db = useSQLiteContext();
  const theme = useTheme();

  const [books, setBooks] = useState<Book[]>([]);
  useEffect(() => {
    getBooks(db).then(setBooks);
  }, [db]);

  // ── plan creation ──────────────────────────────────────────────────────
  const [planTitle, setPlanTitle] = useState('');
  const [startPoint, setStartPoint] = useState<ChapterPoint | null>(null);
  const [endPoint, setEndPoint] = useState<ChapterPoint | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const [durationCode, setDurationCode] = useState<DurationCode>('1m');
  const [startDate, setStartDate] = useState(todayDateString());
  const [customEndDate, setCustomEndDate] = useState('');
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const loadPlans = useCallback(() => {
    getPlans()
      .then(setPlans)
      .catch(() => {});
  }, []);
  useFocusEffect(loadPlans);

  const [deleteTarget, setDeleteTarget] = useState<ReadingPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [deletePlanError, setDeletePlanError] = useState<string | null>(null);

  function bookName(bookId: number): string {
    return books.find((b) => b.id === bookId)?.name_ko ?? '';
  }

  function resolvedEndDate(): string {
    if (durationCode === 'custom') return customEndDate;
    const preset = DURATION_PRESETS.find((p) => p.code === durationCode);
    return preset?.days ? addDays(startDate, preset.days - 1) : '';
  }

  async function handleCreatePlan() {
    const endDate = resolvedEndDate();
    if (!planTitle.trim() || !startPoint || !endPoint || !startDate || !endDate) return;
    setCreatingPlan(true);
    setPlanError(null);
    try {
      const chapters = await enumerateChapters(db, books, startPoint, endPoint);
      if (chapters.length === 0) throw new Error('올바른 범위를 선택해주세요.');
      const plan = await createPlan({
        title: planTitle.trim(),
        createdBy: userId,
        chapters,
        startDate,
        endDate,
      });
      setPlanTitle('');
      setStartPoint(null);
      setEndPoint(null);
      setDurationCode('1m');
      setStartDate(todayDateString());
      setCustomEndDate('');
      loadPlans();
      router.push(`/plans/${plan.slug}`);
    } catch (e: any) {
      setPlanError(e?.message ?? '계획을 만들지 못했습니다. 다시 시도해주세요.');
    } finally {
      setCreatingPlan(false);
    }
  }

  // ── rooms (성경통독방) ──────────────────────────────────────────────────
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [roomName, setRoomName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [joinPromptRoom, setJoinPromptRoom] = useState<Room | null>(null);
  const [joinPromptCode, setJoinPromptCode] = useState('');
  const [joinPromptError, setJoinPromptError] = useState<string | null>(null);
  const [joinPromptSubmitting, setJoinPromptSubmitting] = useState(false);

  const loadRooms = useCallback(() => {
    getMyRooms(userId)
      .then(setRooms)
      .catch(() => setRooms([]));
    getAllRooms()
      .then(setAllRooms)
      .catch(() => setAllRooms([]));
  }, [userId]);
  useFocusEffect(loadRooms);

  useEffect(() => {
    setSelectedPlanId((prev) => prev ?? plans[0]?.id ?? null);
  }, [plans]);

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
      loadRooms();
      router.push({ pathname: '/rooms/[id]', params: { id: roomId } });
    } catch (e: any) {
      setJoinPromptError(e?.message ?? '참여하지 못했습니다.');
    } finally {
      setJoinPromptSubmitting(false);
    }
  }

  async function handleCreateRoom() {
    if (!roomName.trim() || !selectedPlanId || !inviteCode.trim()) return;
    setCreatingRoom(true);
    setRoomError(null);
    try {
      const room = await createRoom(roomName.trim(), selectedPlanId, userId, inviteCode.trim());
      setRoomName('');
      setInviteCode('');
      loadRooms();
      router.push({ pathname: '/rooms/[id]', params: { id: room.id } });
    } catch (e: any) {
      setRoomError(e?.message ?? '방을 만들지 못했습니다. 다시 시도해주세요.');
    } finally {
      setCreatingRoom(false);
    }
  }

  async function confirmDeletePlan() {
    if (!deleteTarget) return;
    setDeletingPlan(true);
    setDeletePlanError(null);
    try {
      await deletePlan(deleteTarget.id);
      setPlans((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      loadPlans();
      loadRooms();
    } catch (e: any) {
      setDeletePlanError(e?.message ?? '계획을 삭제하지 못했습니다.');
    } finally {
      setDeletingPlan(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="subtitle" style={styles.header}>
            성경통독
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="smallBold">새 읽기계획 만들기</ThemedText>
            <TextInput
              value={planTitle}
              onChangeText={setPlanTitle}
              placeholder="계획 이름 (예: 신약 3개월 통독)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <View style={styles.rangeRow}>
              <Pressable
                onPress={() => setPickerTarget('start')}
                style={[styles.rangeButton, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small">
                  {startPoint ? `${bookName(startPoint.bookId)} ${startPoint.chapter}장` : '시작 지점 선택'}
                </ThemedText>
              </Pressable>
              <ThemedText type="small" themeColor="textSecondary">
                ~
              </ThemedText>
              <Pressable
                onPress={() => setPickerTarget('end')}
                style={[styles.rangeButton, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small">
                  {endPoint ? `${bookName(endPoint.bookId)} ${endPoint.chapter}장` : '끝 지점 선택'}
                </ThemedText>
              </Pressable>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              기간
            </ThemedText>
            <View style={styles.planRow}>
              {DURATION_PRESETS.map((p) => (
                <Pressable
                  key={p.code}
                  onPress={() => setDurationCode(p.code)}
                  style={[
                    styles.planChip,
                    { backgroundColor: durationCode === p.code ? theme.backgroundSelected : theme.backgroundElement },
                  ]}>
                  <ThemedText type="small">{p.label}</ThemedText>
                </Pressable>
              ))}
            </View>
            <View style={styles.dailyRow}>
              <ThemedText type="small" themeColor="textSecondary">
                시작일
              </ThemedText>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
                style={[styles.dateInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />
            </View>
            {durationCode === 'custom' ? (
              <View style={styles.dailyRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  종료일
                </ThemedText>
                <TextInput
                  value={customEndDate}
                  onChangeText={setCustomEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.dateInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
              </View>
            ) : (
              resolvedEndDate() && (
                <ThemedText type="small" themeColor="textSecondary">
                  종료일: {resolvedEndDate()}
                </ThemedText>
              )
            )}
            {planError && (
              <ThemedText type="small" style={styles.errorText}>
                {planError}
              </ThemedText>
            )}
            <Pressable
              onPress={handleCreatePlan}
              disabled={creatingPlan || !planTitle.trim() || !startPoint || !endPoint || !resolvedEndDate()}
              style={[
                styles.actionButton,
                styles.startButton,
                {
                  backgroundColor: theme.backgroundSelected,
                  opacity:
                    creatingPlan || !planTitle.trim() || !startPoint || !endPoint || !resolvedEndDate() ? 0.5 : 1,
                },
              ]}>
              <ThemedText type="smallBold">계획 만들기</ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">읽기계획 목록</ThemedText>
            {plans.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                아직 등록된 읽기 계획이 없습니다.
              </ThemedText>
            ) : (
              plans.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/plans/${p.slug}`)}
                  style={({ pressed }) => [
                    styles.row,
                    styles.planListRow,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.planListInfo}>
                    <ThemedText type="smallBold">{p.title}</ThemedText>
                    {p.description && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {p.description}
                      </ThemedText>
                    )}
                  </View>
                  {p.created_by === userId && (
                    <Pressable onPress={() => setDeleteTarget(p)} hitSlop={8}>
                      <ThemedText type="small" style={styles.errorText}>
                        삭제
                      </ThemedText>
                    </Pressable>
                  )}
                </Pressable>
              ))
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">새 성경통독방 만들기</ThemedText>
            <TextInput
              value={roomName}
              onChangeText={setRoomName}
              placeholder="방 이름 (예: 우리 가족 요한복음방)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <TextInput
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="참여 코드 만들기 (예: 가족모임2024)"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="characters"
              style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
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
            {roomError && (
              <ThemedText type="small" style={styles.errorText}>
                {roomError}
              </ThemedText>
            )}
            <Pressable
              onPress={handleCreateRoom}
              disabled={creatingRoom || !roomName.trim() || !selectedPlanId || !inviteCode.trim()}
              style={[
                styles.actionButton,
                styles.startButton,
                {
                  backgroundColor: theme.backgroundSelected,
                  opacity:
                    creatingRoom || !roomName.trim() || !selectedPlanId || !inviteCode.trim() ? 0.5 : 1,
                },
              ]}>
              <ThemedText type="smallBold">방 만들기</ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">내 성경통독방</ThemedText>
            {rooms.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                아직 참여한 성경통독방이 없습니다.
              </ThemedText>
            ) : (
              rooms.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push({ pathname: '/rooms/[id]', params: { id: item.id } })}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold">{item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.planTitle}
                  </ThemedText>
                </Pressable>
              ))
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">전체 성경통독방 둘러보기</ThemedText>
            {allRooms.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                아직 만들어진 성경통독방이 없습니다.
              </ThemedText>
            ) : (
              allRooms.map((item) => {
                const alreadyMember = rooms.some((r) => r.id === item.id);
                return (
                  <View key={item.id} style={[styles.browseRow, { backgroundColor: theme.backgroundElement }]}>
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
        </ScrollView>
      </SafeAreaView>

      <BookChapterPicker
        visible={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        books={books}
        onSelect={(bookId, chapter) => {
          if (pickerTarget === 'start') setStartPoint({ bookId, chapter });
          else if (pickerTarget === 'end') setEndPoint({ bookId, chapter });
        }}
      />

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
              style={[styles.textInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
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

      <Modal
        visible={deleteTarget != null}
        animationType="slide"
        transparent
        onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.backdrop}>
          <ThemedView type="background" style={[styles.promptSheet, { borderColor: theme.backgroundElement }]}>
            <ThemedText type="subtitle">'{deleteTarget?.title}' 계획을 삭제할까요?</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.promptHint}>
              이 계획으로 만든 성경통독방과 참여자들의 진행 기록도 함께 삭제되며 되돌릴 수 없습니다.
            </ThemedText>
            {deletePlanError && (
              <ThemedText type="small" style={styles.errorText}>
                {deletePlanError}
              </ThemedText>
            )}
            <View style={styles.promptActions}>
              <Pressable onPress={() => setDeleteTarget(null)} style={styles.actionButton}>
                <ThemedText type="link" themeColor="textSecondary">
                  취소
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={confirmDeletePlan}
                disabled={deletingPlan}
                style={[styles.actionButton, styles.deleteConfirmButton, { opacity: deletingPlan ? 0.5 : 1 }]}>
                <ThemedText type="smallBold" style={styles.deleteConfirmText}>
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
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.four,
  },
  header: {
    marginBottom: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  textInput: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rangeButton: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInput: {
    width: 130,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    textAlign: 'center',
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
  startButton: {
    alignSelf: 'flex-start',
  },
  errorText: {
    color: '#e03131',
  },
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  planListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  planListInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  browseRow: {
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
  deleteConfirmButton: {
    backgroundColor: '#e03131',
  },
  deleteConfirmText: {
    color: '#fff',
  },
  promptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
});
