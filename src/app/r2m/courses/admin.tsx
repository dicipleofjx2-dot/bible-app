import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getIsAdmin } from '@/db/profile';
import {
  deleteCourse,
  deleteCourseWeek,
  deleteMission,
  getAllCoursesForAdmin,
  getAllMissionsForCourse,
  getCourseWeeks,
  insertCourse,
  insertMission,
  updateCourse,
  upsertCourseWeek,
  type Course,
  type CourseWeek,
  type Mission,
} from '@/db/r2m';

// 영어 칸은 비워 두어도 된다. 비워 두면 영어로 보는 분에게도 한글이 그대로 나온다.
const EMPTY_COURSE_FORM = {
  title: '',
  description: '',
  titleEn: '',
  descriptionEn: '',
  totalWeeks: '6',
  leaderMessage: '',
};
const EMPTY_WEEK_FORM = {
  weekNumber: '1',
  title: '',
  theme: '',
  description: '',
  titleEn: '',
  descriptionEn: '',
};
const EMPTY_MISSION_FORM = { weekNumber: '1', body: '' };

export default function R2MCoursesAdminScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE_FORM);
  const [submittingCourse, setSubmittingCourse] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);

  const [managingCourse, setManagingCourse] = useState<Course | null>(null);
  const [weeks, setWeeks] = useState<CourseWeek[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [weekForm, setWeekForm] = useState(EMPTY_WEEK_FORM);
  const [missionForm, setMissionForm] = useState(EMPTY_MISSION_FORM);
  const [weekError, setWeekError] = useState<string | null>(null);
  const [missionError, setMissionError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    getIsAdmin(session.user.id)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
    getAllCoursesForAdmin()
      .then(setCourses)
      .catch(() => setCourses([]));
  }, [session]);

  useFocusEffect(load);

  function loadCourseDetail(course: Course) {
    setManagingCourse(course);
    getCourseWeeks(course.id)
      .then(setWeeks)
      .catch(() => setWeeks([]));
    getAllMissionsForCourse(course.id)
      .then(setMissions)
      .catch(() => setMissions([]));
  }

  async function handleCreateCourse() {
    if (!courseForm.title.trim()) {
      setCourseError('제목은 필수 항목입니다.');
      return;
    }
    const totalWeeks = Number(courseForm.totalWeeks);
    if (!totalWeeks || totalWeeks < 1) {
      setCourseError('총 주차는 1 이상의 숫자여야 합니다.');
      return;
    }
    setCourseError(null);
    setSubmittingCourse(true);
    const result = await insertCourse({
      title: courseForm.title.trim(),
      description: courseForm.description,
      titleEn: courseForm.titleEn.trim(),
      descriptionEn: courseForm.descriptionEn.trim(),
      totalWeeks,
      leaderMessage: courseForm.leaderMessage,
    });
    setSubmittingCourse(false);
    if (result.error) {
      setCourseError(result.error);
      return;
    }
    setCourseForm(EMPTY_COURSE_FORM);
    load();
  }

  async function handleTogglePublish(course: Course) {
    await updateCourse(course.id, { isPublished: !course.isPublished });
    load();
  }

  async function handleDeleteCourse(course: Course) {
    await deleteCourse(course.id);
    if (managingCourse?.id === course.id) setManagingCourse(null);
    load();
  }

  async function handleSaveWeek() {
    if (!managingCourse) return;
    const weekNumber = Number(weekForm.weekNumber);
    if (!weekNumber || !weekForm.title.trim()) {
      setWeekError('주차 번호와 제목은 필수입니다.');
      return;
    }
    setWeekError(null);
    const result = await upsertCourseWeek({
      courseId: managingCourse.id,
      weekNumber,
      title: weekForm.title.trim(),
      theme: weekForm.theme,
      description: weekForm.description,
      titleEn: weekForm.titleEn.trim(),
      descriptionEn: weekForm.descriptionEn.trim(),
    });
    if (result.error) {
      setWeekError(result.error);
      return;
    }
    setWeekForm(EMPTY_WEEK_FORM);
    loadCourseDetail(managingCourse);
  }

  async function handleDeleteWeek(weekId: string) {
    if (!managingCourse) return;
    await deleteCourseWeek(weekId);
    loadCourseDetail(managingCourse);
  }

  async function handleAddMission() {
    if (!managingCourse) return;
    const weekNumber = Number(missionForm.weekNumber);
    if (!weekNumber || !missionForm.body.trim()) {
      setMissionError('주차 번호와 미션 내용은 필수입니다.');
      return;
    }
    setMissionError(null);
    const result = await insertMission({ courseId: managingCourse.id, weekNumber, body: missionForm.body.trim() });
    if (result.error) {
      setMissionError(result.error);
      return;
    }
    setMissionForm(EMPTY_MISSION_FORM);
    loadCourseDetail(managingCourse);
  }

  async function handleDeleteMission(missionId: string) {
    if (!managingCourse) return;
    await deleteMission(missionId);
    loadCourseDetail(managingCourse);
  }

  if (loading) return null;

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">마이페이지에서 로그인해주세요.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (isAdmin === false) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">관리자만 접근할 수 있어요.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            R2M 훈련과정 관리
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="smallBold">새 과정 만들기</ThemedText>
            <TextInput
              value={courseForm.title}
              onChangeText={(v) => setCourseForm((p) => ({ ...p, title: v }))}
              placeholder="과정명 (예: R2M BASIC)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <TextInput
              value={courseForm.description}
              onChangeText={(v) => setCourseForm((p) => ({ ...p, description: v }))}
              placeholder="소개"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.input, styles.multiline, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            {/* 영어로 보는 분에게 나갈 말. 비워 두면 위의 한글이 그대로 나간다. */}
            <TextInput
              value={courseForm.titleEn}
              onChangeText={(v) => setCourseForm((p) => ({ ...p, titleEn: v }))}
              placeholder="과정명 영어 (비워 두면 한글이 그대로 나옵니다)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <TextInput
              value={courseForm.descriptionEn}
              onChangeText={(v) => setCourseForm((p) => ({ ...p, descriptionEn: v }))}
              placeholder="소개 영어 (비워 두어도 됩니다)"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.input, styles.multiline, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <TextInput
              value={courseForm.totalWeeks}
              onChangeText={(v) => setCourseForm((p) => ({ ...p, totalWeeks: v.replace(/[^0-9]/g, '') }))}
              placeholder="총 주차 (예: 6)"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <TextInput
              value={courseForm.leaderMessage}
              onChangeText={(v) => setCourseForm((p) => ({ ...p, leaderMessage: v }))}
              placeholder="리더 메시지 (R2M 홈에 표시됨)"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.input, styles.multiline, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            {courseError && (
              <ThemedText type="small" style={styles.errorText}>
                {courseError}
              </ThemedText>
            )}
            <Pressable
              disabled={submittingCourse}
              onPress={handleCreateCourse}
              style={[styles.actionButton, { backgroundColor: theme.accent, opacity: submittingCourse ? 0.5 : 1 }]}>
              <ThemedText type="smallBold" style={styles.actionButtonText}>
                {submittingCourse ? '만드는 중...' : '+ 과정 만들기'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">등록된 과정 ({courses.length})</ThemedText>
            {courses.map((course) => (
              <View key={course.id} style={[styles.courseRow, { backgroundColor: theme.backgroundElement }]}>
                <Pressable onPress={() => loadCourseDetail(course)} style={styles.courseRowMain}>
                  <ThemedText type="smallBold">{course.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {course.totalWeeks}주 · {course.isPublished ? '공개' : '비공개'}
                  </ThemedText>
                </Pressable>
                <Pressable onPress={() => handleTogglePublish(course)} hitSlop={8}>
                  <ThemedText type="small">{course.isPublished ? '비공개로' : '공개로'}</ThemedText>
                </Pressable>
                <Pressable onPress={() => handleDeleteCourse(course)} hitSlop={8}>
                  <ThemedText type="small" style={styles.errorText}>
                    삭제
                  </ThemedText>
                </Pressable>
              </View>
            ))}
          </View>

          {managingCourse && (
            <View style={styles.section}>
              <ThemedText type="smallBold">
                {managingCourse.title} — 주차/미션 관리
              </ThemedText>

              {weeks.map((w) => (
                <View key={w.id} style={[styles.weekRow, { backgroundColor: theme.backgroundElement }]}>
                  <View style={styles.weekRowText}>
                    <ThemedText type="smallBold">
                      {w.weekNumber}주 · {w.title}
                    </ThemedText>
                    {w.theme ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {w.theme}
                      </ThemedText>
                    ) : null}
                    {/* 영어를 적어 두었는지 여기서 바로 보이게 한다. 같은 주차 번호로
                        다시 저장하면 아래 칸에 적은 것으로 덮이므로, 무엇이 들어 있는지
                        모르면 영어를 실수로 지우게 된다. */}
                    <ThemedText type="small" themeColor="textSecondary">
                      EN: {w.titleEn || '(없음)'}
                    </ThemedText>
                  </View>
                  <Pressable onPress={() => handleDeleteWeek(w.id)} hitSlop={8}>
                    <ThemedText type="small" style={styles.errorText}>
                      삭제
                    </ThemedText>
                  </Pressable>
                </View>
              ))}

              <View style={styles.subForm}>
                <ThemedText type="small" themeColor="textSecondary">
                  주차 추가/수정 (같은 주차 번호로 다시 저장하면 수정됩니다)
                </ThemedText>
                <TextInput
                  value={weekForm.weekNumber}
                  onChangeText={(v) => setWeekForm((p) => ({ ...p, weekNumber: v.replace(/[^0-9]/g, '') }))}
                  placeholder="주차 번호"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
                <TextInput
                  value={weekForm.title}
                  onChangeText={(v) => setWeekForm((p) => ({ ...p, title: v }))}
                  placeholder="주차 제목 (예: 말씀)"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
                <TextInput
                  value={weekForm.theme}
                  onChangeText={(v) => setWeekForm((p) => ({ ...p, theme: v }))}
                  placeholder="주제 한 줄"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
                <TextInput
                  value={weekForm.description}
                  onChangeText={(v) => setWeekForm((p) => ({ ...p, description: v }))}
                  placeholder="설명"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  style={[styles.input, styles.multiline, { color: theme.text, backgroundColor: theme.background }]}
                />
                <TextInput
                  value={weekForm.titleEn}
                  onChangeText={(v) => setWeekForm((p) => ({ ...p, titleEn: v }))}
                  placeholder="주차 제목 영어 (비워 두면 한글이 그대로 나옵니다)"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
                <TextInput
                  value={weekForm.descriptionEn}
                  onChangeText={(v) => setWeekForm((p) => ({ ...p, descriptionEn: v }))}
                  placeholder="설명 영어 (비워 두어도 됩니다)"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  style={[styles.input, styles.multiline, { color: theme.text, backgroundColor: theme.background }]}
                />
                {weekError && (
                  <ThemedText type="small" style={styles.errorText}>
                    {weekError}
                  </ThemedText>
                )}
                <Pressable onPress={handleSaveWeek} style={[styles.actionButton, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold">주차 저장</ThemedText>
                </Pressable>
              </View>

              <ThemedText type="smallBold" style={styles.missionsHeading}>
                미션 목록
              </ThemedText>
              {missions.map((m) => (
                <View key={m.id} style={[styles.missionRow, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="small" style={styles.missionBody}>
                    {m.weekNumber}주 · {m.body}
                  </ThemedText>
                  <Pressable onPress={() => handleDeleteMission(m.id)} hitSlop={8}>
                    <ThemedText type="small" style={styles.errorText}>
                      삭제
                    </ThemedText>
                  </Pressable>
                </View>
              ))}

              <View style={styles.subForm}>
                <TextInput
                  value={missionForm.weekNumber}
                  onChangeText={(v) => setMissionForm((p) => ({ ...p, weekNumber: v.replace(/[^0-9]/g, '') }))}
                  placeholder="주차 번호"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
                <TextInput
                  value={missionForm.body}
                  onChangeText={(v) => setMissionForm((p) => ({ ...p, body: v }))}
                  placeholder="미션 내용 (예: 가족을 축복하세요)"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
                {missionError && (
                  <ThemedText type="small" style={styles.errorText}>
                    {missionError}
                  </ThemedText>
                )}
                <Pressable onPress={handleAddMission} style={[styles.actionButton, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold">+ 미션 추가</ThemedText>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
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
  safeAreaCentered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.four,
  },
  title: {
    fontSize: 24,
  },
  section: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#e03131',
  },
  actionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  actionButtonText: {
    color: '#ffffff',
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  courseRowMain: {
    flex: 1,
    gap: Spacing.half,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  weekRowText: {
    flex: 1,
    gap: Spacing.half,
  },
  subForm: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  missionsHeading: {
    marginTop: Spacing.two,
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  missionBody: {
    flex: 1,
  },
});
