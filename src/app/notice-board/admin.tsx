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
import { deleteNotice, getAllNoticesForAdmin, insertNotice, type Notice, type NoticeEntry } from '@/db/notices';

const EMPTY_ENTRY: NoticeEntry = { title: '', bodyText: '' };

export default function NoticeBoardAdminScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [entry, setEntry] = useState<NoticeEntry>(EMPTY_ENTRY);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    getIsAdmin(session.user.id)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
    getAllNoticesForAdmin()
      .then(setNotices)
      .catch(() => setNotices([]));
  }, [session]);

  useFocusEffect(load);

  async function handleSubmit() {
    if (!entry.title.trim()) {
      setFormError('제목은 필수 항목입니다.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    const result = await insertNotice(entry);
    setSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setEntry(EMPTY_ENTRY);
    load();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteNotice(id);
    setDeletingId(null);
    load();
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
            알림마당 관리
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="smallBold">새 소식 등록</ThemedText>

            <TextInput
              value={entry.title}
              onChangeText={(v) => setEntry((prev) => ({ ...prev, title: v }))}
              placeholder="제목"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <TextInput
              value={entry.bodyText}
              onChangeText={(v) => setEntry((prev) => ({ ...prev, bodyText: v }))}
              placeholder="내용 (선택)"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.input, styles.bodyTextarea, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />

            {formError && (
              <ThemedText type="small" style={styles.errorText}>
                {formError}
              </ThemedText>
            )}

            <Pressable
              disabled={submitting}
              onPress={handleSubmit}
              style={[styles.actionButton, { backgroundColor: theme.backgroundSelected, opacity: submitting ? 0.5 : 1 }]}>
              <ThemedText type="smallBold">{submitting ? '등록 중...' : '+ 소식 등록'}</ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">등록된 소식 ({notices.length})</ThemedText>
            {notices.map((notice) => (
              <View key={notice.id} style={[styles.noticeRow, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.noticeInfo}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {notice.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {new Date(notice.createdAt).toLocaleDateString('ko-KR')}
                  </ThemedText>
                </View>
                <Pressable disabled={deletingId === notice.id} onPress={() => handleDelete(notice.id)} style={styles.deleteButton}>
                  <ThemedText type="small" style={styles.errorText}>
                    {deletingId === notice.id ? '삭제 중...' : '삭제'}
                  </ThemedText>
                </Pressable>
              </View>
            ))}
          </View>
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
  bodyTextarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  errorText: {
    color: '#e03131',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  noticeInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  deleteButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
