import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  addDayPhoto,
  createSchool,
  growthMediaUrl,
  listAttendance,
  listDayPhotos,
  listNotices,
  listRecords,
  listStudents,
  redeemInvite,
  removeDayPhoto,
  setAttendance as saveAttendance,
  setDayPhotoCaption,
  uploadGrowthMedia,
  type GrowthAttendanceRow,
  type GrowthDailyPhoto,
  type GrowthNotice,
  type GrowthRecordRow,
  type GrowthStudent,
} from '@/db/growth';
import { Bar, Field, GrowthCard, PrimaryButton, SectionTitle } from '@/features/growth/ui';
import { useSchool } from '@/features/growth/useSchool';
import { useTheme } from '@/hooks/use-theme';
import {
  ATTENDANCE,
  areaLabel,
  dayProgress,
  formatKoreanDate,
  kstToday,
  levelLabel,
  studentDayState,
} from '@/lib/growth';

/**
 * 오늘의 학교 — 성장ON 의 첫 화면(기획서 §5.1).
 *
 * 한 화면이 세 사람을 맞는다.
 *   - 아직 어느 학교에도 안 든 사람 → 학교를 만들거나 초대 코드를 넣는다
 *   - 교직원 → 오늘 출결·기록 진행도와 학생 스무 명의 카드
 *   - 보호자·학생 → 자기(자녀) 카드 하나
 * 화면을 셋으로 가르지 않은 것은, 한 사람이 교사이면서 보호자일 수 있어서다.
 *
 * **출결을 여기서 바로 찍는다.** 기획서 §13 이 교사 1인당 하루 10분을 못박았다.
 * 출결만 따로 화면을 두면 매일 두 번 들어가야 한다.
 */
export default function GrowthSchoolScreen() {
  const theme = useTheme();
  const { loading, userId, memberships, schoolId, school, isStaff, reload } = useSchool();

  const [students, setStudents] = useState<GrowthStudent[]>([]);
  const [records, setRecords] = useState<GrowthRecordRow[]>([]);
  const [attendance, setAttendance] = useState<GrowthAttendanceRow[]>([]);
  const [notices, setNotices] = useState<GrowthNotice[]>([]);
  const [photos, setPhotos] = useState<GrowthDailyPhoto[]>([]);
  // 서명 주소는 한 시간짜리라 담아 두지 않고 화면을 열 때마다 받는다.
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [shownPhoto, setShownPhoto] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [code, setCode] = useState('');

  const today = kstToday();

  const loadDay = useCallback(async () => {
    if (!schoolId) return;
    try {
      const rows = await listStudents(schoolId);
      setStudents(rows);
      const ids = rows.map((s) => s.id);
      const [recs, atts, nots, pics] = await Promise.all([
        listRecords(ids, today, today),
        listAttendance(ids, today, today),
        listNotices(schoolId),
        listDayPhotos(schoolId, today),
      ]);
      setRecords(recs);
      setAttendance(atts);
      setNotices(nots);
      setPhotos(pics);
      // 통이 비공개라 주소를 그대로 못 쓴다. 오늘 것만 몇 장이라 한 번에 받는다.
      const urls = await Promise.all(pics.map((p) => growthMediaUrl(p.photo_path)));
      setPhotoUrls(Object.fromEntries(pics.map((p, i) => [p.id, urls[i] ?? '']).filter(([, u]) => u)));
      setShownPhoto((prev) => (prev && pics.some((p) => p.id === prev) ? prev : pics[0]?.id ?? null));
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '오늘 기록을 불러오지 못했어요.');
    }
  }, [schoolId, today]);

  useFocusEffect(
    useCallback(() => {
      loadDay();
    }, [loadDay]),
  );

  async function makeSchool() {
    if (!userId || !schoolName.trim()) return;
    setBusy(true);
    try {
      await createSchool(schoolName.trim(), userId);
      setSchoolName('');
      await reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '학교를 만들지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    if (!code.trim()) return;
    setBusy(true);
    try {
      await redeemInvite(code, '');
      setCode('');
      await reload();
      setMessage('학교에 들어왔습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '들어가지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * 오늘의 사진 올리기.
   *
   * 고르자마자 올리고 바로 대문에 건다. 「고르기 → 설명 쓰기 → 저장」 세 걸음을
   * 두면 쉬는 시간에 한 장 올리려던 선생님이 두 번째 걸음에서 멈춘다. 한 줄
   * 설명은 올린 뒤에 덧붙인다.
   */
  async function pickDayPhoto() {
    if (!userId || !schoolId) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (picked.canceled || !picked.assets[0]) return;
    setUploading(true);
    try {
      const file = picked.assets[0];
      const path = await uploadGrowthMedia(file.uri, `daily/${schoolId}`, file.mimeType);
      await addDayPhoto(schoolId, today, path, userId);
      await loadDay();
      setMessage('오늘의 사진을 올렸습니다.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '사진을 올리지 못했어요.');
    } finally {
      setUploading(false);
    }
  }

  async function saveCaption(id: string) {
    if (captionDraft === null) return;
    try {
      await setDayPhotoCaption(id, captionDraft.trim());
      setCaptionDraft(null);
      await loadDay();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '한 줄을 저장하지 못했어요.');
    }
  }

  async function dropPhoto(id: string) {
    try {
      await removeDayPhoto(id);
      await loadDay();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '사진을 내리지 못했어요.');
    }
  }

  async function mark(studentId: string, status: (typeof ATTENDANCE)[number]['id']) {
    if (!userId) return;
    // 화면을 먼저 바꾸고 보낸다 — 스무 명을 찍는 동안 한 번씩 멈추면 못 쓴다.
    setAttendance((prev) => {
      const rest = prev.filter((a) => !(a.student_id === studentId && a.on_date === today));
      return [...rest, { id: `local-${studentId}`, student_id: studentId, on_date: today, status, reason: '', note: '' }];
    });
    try {
      await setAttendanceRow(studentId, status);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '출결을 저장하지 못했어요.');
      loadDay();
    }
  }

  async function setAttendanceRow(studentId: string, status: (typeof ATTENDANCE)[number]['id']) {
    if (!userId) return;
    await saveAttendance(studentId, today, status, userId);
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </ThemedView>
    );
  }

  if (!userId) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={Type.body}>로그인하고 이용해 주세요.</ThemedText>
        <Pressable onPress={() => router.push('/profile')}>
          <ThemedText style={[Type.itemTitle, { color: theme.accent }]}>마이페이지로 가기</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  // ── 아직 어느 학교에도 들지 않은 사람 ──
  if (!memberships.length) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.list}>
          <ThemedText style={Type.screenTitle}>데이빗스톤 성장ON</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.body}>
            오늘의 배움이 믿음의 사람을 세웁니다.
          </ThemedText>

          <GrowthCard>
            <SectionTitle hint="교사·보호자에게 받은 코드를 넣으면 그 학교로 들어갑니다.">
              초대 코드로 들어가기
            </SectionTitle>
            <Field label="초대 코드" value={code} onChangeText={setCode} placeholder="ABCD-2345" />
            <PrimaryButton label="들어가기" onPress={join} disabled={busy || !code.trim()} />
          </GrowthCard>

          <GrowthCard>
            <SectionTitle hint="학교를 여는 사람만 하면 됩니다. 만든 사람이 최고관리자가 됩니다.">
              학교 새로 만들기
            </SectionTitle>
            <Field label="학교 이름" value={schoolName} onChangeText={setSchoolName} placeholder="데이빗스톤" />
            <PrimaryButton
              label="학교 만들기"
              tone="quiet"
              onPress={makeSchool}
              disabled={busy || !schoolName.trim()}
            />
          </GrowthCard>

          {message ? (
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              {message}
            </ThemedText>
          ) : null}
        </ScrollView>
      </ThemedView>
    );
  }

  const ids = students.map((s) => s.id);
  const progress = dayProgress(ids, records, attendance, today);
  const shownPhotoRow = photos.find((p) => p.id === shownPhoto) ?? photos[0] ?? null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <View>
            <ThemedText style={Type.screenTitle}>{school?.name ?? '우리 학교'}</ThemedText>
            <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
              {formatKoreanDate(today)} · {school?.motto ?? '오늘의 배움이 믿음의 사람을 세웁니다'}
            </ThemedText>
          </View>

          {/*
            대문 — 오늘의 사진 (기획서 §4.1).

            학교 이름 바로 아래, 다른 무엇보다 위에 둔다. 보호자가 앱을 여는
            까닭은 대개 「오늘 우리 아이가 어떻게 지냈나」이고, 그 답을 가장
            빨리 주는 것이 사진 한 장이다.

            선생님이면 누구라도 올린다. 사진이 없는 날은 **선생님에게만** 빈
            자리를 보여 준다 — 보호자에게 「오늘은 사진이 없습니다」를 띄우면
            없는 날마다 서운한 자리가 된다.
          */}
          {shownPhotoRow ? (
            <GrowthCard style={styles.photoCard}>
              {photoUrls[shownPhotoRow.id] ? (
                <Image
                  source={{ uri: photoUrls[shownPhotoRow.id] }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.photo, styles.photoLoading, { backgroundColor: theme.accentSoft }]}>
                  <ActivityIndicator color={theme.accent} />
                </View>
              )}

              {photos.length > 1 ? (
                <View style={styles.thumbRow}>
                  {photos.map((p) => (
                    <Pressable key={p.id} onPress={() => setShownPhoto(p.id)}>
                      {photoUrls[p.id] ? (
                        <Image
                          source={{ uri: photoUrls[p.id] }}
                          style={[
                            styles.thumb,
                            {
                              borderColor: p.id === shownPhotoRow.id ? theme.accent : 'transparent',
                            },
                          ]}
                        />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {captionDraft !== null && isStaff ? (
                <>
                  <Field
                    label="한 줄 기록"
                    value={captionDraft}
                    onChangeText={setCaptionDraft}
                    placeholder="오늘 이 장면에 대해 한 줄"
                  />
                  <View style={styles.photoButtons}>
                    <PrimaryButton label="저장" onPress={() => saveCaption(shownPhotoRow.id)} />
                    <PrimaryButton label="취소" tone="quiet" onPress={() => setCaptionDraft(null)} />
                  </View>
                </>
              ) : shownPhotoRow.caption ? (
                <ThemedText style={Type.body}>{shownPhotoRow.caption}</ThemedText>
              ) : null}

              {isStaff && captionDraft === null ? (
                <View style={styles.photoButtons}>
                  <QuickButton label={uploading ? '올리는 중…' : '📷 사진 더하기'} onPress={pickDayPhoto} />
                  <QuickButton
                    label={shownPhotoRow.caption ? '✏️ 한 줄 고치기' : '✏️ 한 줄 쓰기'}
                    onPress={() => setCaptionDraft(shownPhotoRow.caption)}
                  />
                  <QuickButton label="🗑️ 이 사진 내리기" onPress={() => dropPhoto(shownPhotoRow.id)} />
                </View>
              ) : null}
            </GrowthCard>
          ) : isStaff ? (
            <Pressable onPress={pickDayPhoto} disabled={uploading}>
              <View
                style={[
                  styles.photoEmpty,
                  { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                ]}>
                <ThemedText style={Type.itemTitle}>
                  {uploading ? '올리는 중…' : '📷 오늘의 사진 올리기'}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  선생님이면 누구라도 올릴 수 있습니다. 학교 안에서만 보입니다.
                </ThemedText>
              </View>
            </Pressable>
          ) : null}

          {isStaff ? (
            <GrowthCard>
              <SectionTitle hint="한 영역이라도 적으면 기록한 것으로 봅니다.">오늘 진행</SectionTitle>
              <ThemedText style={Type.body}>
                출결 {progress.attendanceDone}/{progress.total} · 기록 {progress.recorded}/{progress.total}
              </ThemedText>
              <Bar value={progress.recorded} max={Math.max(1, progress.total)} />
              {progress.needHelp.length ? (
                <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                  도움이 필요하다고 적힌 학생 {progress.needHelp.length}명 —{' '}
                  {progress.needHelp
                    .map((id) => students.find((s) => s.id === id)?.name)
                    .filter(Boolean)
                    .join(', ')}
                </ThemedText>
              ) : null}
              <View style={styles.quickRow}>
                <QuickButton label="✍️ 기록하기" onPress={() => router.push('/growth-school/record')} />
                <QuickButton label="🚌 체험활동" onPress={() => router.push('/growth-school/activities')} />
                <QuickButton label="📄 월말 마감" onPress={() => router.push('/growth-school/reports')} />
                <QuickButton label="⚙️ 학교 설정" onPress={() => router.push('/growth-school/setup')} />
              </View>
            </GrowthCard>
          ) : null}

          {notices.length ? (
            <GrowthCard>
              <SectionTitle>공지</SectionTitle>
              {notices.slice(0, 4).map((n) => (
                <View key={n.id} style={styles.noticeRow}>
                  <ThemedText style={Type.itemTitle}>
                    {n.pinned ? '📌 ' : ''}
                    {n.title}
                  </ThemedText>
                  {n.body ? (
                    <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                      {n.body}
                    </ThemedText>
                  ) : null}
                </View>
              ))}
            </GrowthCard>
          ) : null}

          <SectionTitle hint={isStaff ? '이름을 누르면 성장 기록으로 갑니다.' : undefined}>
            {isStaff ? `학생 ${students.length}명` : '우리 아이'}
          </SectionTitle>

          {students.map((s) => {
            const state = studentDayState(records, s.id, today);
            const att = attendance.find((a) => a.student_id === s.id && a.on_date === today);
            return (
              <GrowthCard key={s.id}>
                <Pressable onPress={() => router.push(`/growth-school/student/${s.id}`)}>
                  <View style={styles.studentHead}>
                    <ThemedText style={Type.itemTitle}>
                      {s.name}
                      {s.grade ? ` · ${s.grade}` : ''}
                    </ThemedText>
                    <ThemedText
                      themeColor={state.recorded ? 'accent' : 'textSecondary'}
                      style={Type.caption}>
                      {state.recorded ? `오늘 기록 ${state.areas.length}영역` : '오늘 기록 없음'}
                    </ThemedText>
                  </View>

                  {/*
                    오늘 적은 것을 카드에서 바로 읽힌다.

                    「오늘 기록 2영역」만으로는 **무엇을** 적었는지 알 수 없어서,
                    확인하려면 아이마다 상세로 들어가야 했다. 스무 명이면 스무
                    번이다. 두 줄까지만 보여 주고 나머지는 상세에서 본다.
                  */}
                  {records
                    .filter((r) => r.student_id === s.id && r.on_date === today)
                    .slice(0, 2)
                    .map((r) => (
                      <ThemedText
                        key={r.id}
                        themeColor="textSecondary"
                        style={Type.itemDescription}
                        numberOfLines={1}>
                        · {areaLabel(r.area)}
                        {r.level ? ` (${levelLabel(r.level)})` : ''}
                        {r.body ? ` — ${r.body}` : ''}
                      </ThemedText>
                    ))}
                </Pressable>

                {isStaff ? (
                  <View style={styles.attRow}>
                    {ATTENDANCE.map((a) => {
                      const on = att?.status === a.id;
                      return (
                        <Pressable
                          key={a.id}
                          onPress={() => mark(s.id, a.id)}
                          style={({ pressed }) => [
                            styles.attChip,
                            {
                              backgroundColor: on ? theme.accent : 'transparent',
                              borderColor: on ? theme.accent : theme.border,
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}>
                          <ThemedText
                            style={[Type.caption, { color: on ? '#FFFFFF' : theme.textSecondary }]}>
                            {a.label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </GrowthCard>
            );
          })}

          {isStaff && !students.length ? (
            <GrowthCard>
              <ThemedText style={Type.body}>아직 등록된 학생이 없습니다.</ThemedText>
              <PrimaryButton label="학생 등록하러 가기" onPress={() => router.push('/growth-school/setup')} />
            </GrowthCard>
          ) : null}

          {message ? (
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              {message}
            </ThemedText>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function QuickButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickButton,
        { borderColor: theme.border, backgroundColor: theme.background, opacity: pressed ? 0.7 : 1 },
      ]}>
      <ThemedText style={Type.caption}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  list: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  photoCard: { padding: Spacing.two, gap: Spacing.two },
  // 16:9. 폰을 세로로 들고 볼 때 대문이 화면의 반을 넘지 않는 비율이다.
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12 },
  photoLoading: { alignItems: 'center', justifyContent: 'center' },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  thumb: { width: 52, height: 52, borderRadius: 8, borderWidth: 2 },
  photoButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  photoEmpty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    gap: 4,
  },
  quickButton: { borderWidth: 1, borderRadius: 12, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  noticeRow: { gap: 2 },
  studentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  attRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  attChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
