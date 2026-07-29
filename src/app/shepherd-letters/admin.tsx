import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getIsAdmin } from '@/db/profile';
import {
  deleteLetter,
  getAllLettersForAdmin,
  insertLetter,
  uploadLetterCoverImage,
  uploadLetterGalleryImage,
  type ShepherdLetter,
  type ShepherdLetterEntry,
} from '@/db/shepherdLetters';

const EMPTY_ENTRY: ShepherdLetterEntry = {
  title: '',
  coverUrl: '',
  bodyText: '',
  imageUrls: [],
};

export default function ShepherdLettersAdminScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [letters, setLetters] = useState<ShepherdLetter[]>([]);
  const [entry, setEntry] = useState<ShepherdLetterEntry>(EMPTY_ENTRY);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    getIsAdmin(session.user.id)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
    getAllLettersForAdmin()
      .then(setLetters)
      .catch(() => setLetters([]));
  }, [session]);

  useFocusEffect(load);

  function updateEntry<K extends keyof ShepherdLetterEntry>(key: K, value: ShepherdLetterEntry[K]) {
    setEntry((prev) => ({ ...prev, [key]: value }));
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return null;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return null;
    return result.assets[0];
  }

  async function handlePickCover() {
    setCoverError(null);
    const asset = await pickImage();
    if (!asset) return;

    setCoverUploading(true);
    const uploadResult = await uploadLetterCoverImage(asset.uri, asset.mimeType);
    setCoverUploading(false);

    if (uploadResult.error) {
      setCoverError(uploadResult.error);
      return;
    }
    updateEntry('coverUrl', uploadResult.url ?? '');
  }

  async function handleAddGalleryImage() {
    setGalleryError(null);
    const asset = await pickImage();
    if (!asset) return;

    setGalleryUploading(true);
    const uploadResult = await uploadLetterGalleryImage(asset.uri, asset.mimeType);
    setGalleryUploading(false);

    if (uploadResult.error) {
      setGalleryError(uploadResult.error);
      return;
    }
    if (uploadResult.url) {
      setEntry((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, uploadResult.url as string] }));
    }
  }

  function removeGalleryImage(index: number) {
    setEntry((prev) => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== index) }));
  }

  async function handleSubmit() {
    if (!entry.title.trim()) {
      setFormError('제목은 필수 항목입니다.');
      return;
    }
    if (!entry.bodyText.trim()) {
      setFormError('본문 텍스트를 입력해주세요.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    const result = await insertLetter(entry);
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
    await deleteLetter(id);
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
            목자의 편지 관리
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="smallBold">새 편지 쓰기</ThemedText>

            <TextInput
              value={entry.title}
              onChangeText={(v) => updateEntry('title', v)}
              placeholder="제목"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />

            <View style={styles.imageSection}>
              <ThemedText type="small" themeColor="textSecondary">
                대표 사진 (선택)
              </ThemedText>
              <View style={styles.imageRow}>
                {entry.coverUrl ? (
                  <Image source={{ uri: entry.coverUrl }} style={styles.coverPreview} resizeMode="cover" />
                ) : (
                  <View style={[styles.coverPreview, { backgroundColor: theme.backgroundElement }]} />
                )}
                <Pressable
                  disabled={coverUploading}
                  onPress={handlePickCover}
                  style={[styles.actionButton, { backgroundColor: theme.backgroundElement, opacity: coverUploading ? 0.5 : 1 }]}>
                  <ThemedText type="smallBold">
                    {coverUploading ? '업로드 중...' : entry.coverUrl ? '사진 변경' : '사진 선택'}
                  </ThemedText>
                </Pressable>
              </View>
              {coverError && (
                <ThemedText type="small" style={styles.errorText}>
                  {coverError}
                </ThemedText>
              )}
            </View>

            <TextInput
              value={entry.bodyText}
              onChangeText={(v) => updateEntry('bodyText', v)}
              placeholder="본문 (문단은 빈 줄로 구분)&#10;&#10;첫 문단...&#10;&#10;두 번째 문단..."
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.input, styles.bodyTextarea, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />

            <View style={styles.imageSection}>
              <ThemedText type="small" themeColor="textSecondary">
                본문 아래 추가 사진 (선택, 여러 장 가능)
              </ThemedText>
              <View style={styles.galleryRow}>
                {entry.imageUrls.map((url, i) => (
                  <View key={i} style={styles.galleryThumbWrap}>
                    <Image source={{ uri: url }} style={styles.galleryThumb} resizeMode="cover" />
                    <Pressable onPress={() => removeGalleryImage(i)} style={styles.galleryRemove}>
                      <ThemedText type="small" style={styles.errorText}>
                        ✕
                      </ThemedText>
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  disabled={galleryUploading}
                  onPress={handleAddGalleryImage}
                  style={[styles.actionButton, { backgroundColor: theme.backgroundElement, opacity: galleryUploading ? 0.5 : 1 }]}>
                  <ThemedText type="smallBold">{galleryUploading ? '업로드 중...' : '+ 사진 추가'}</ThemedText>
                </Pressable>
              </View>
              {galleryError && (
                <ThemedText type="small" style={styles.errorText}>
                  {galleryError}
                </ThemedText>
              )}
            </View>

            {formError && (
              <ThemedText type="small" style={styles.errorText}>
                {formError}
              </ThemedText>
            )}

            <Pressable
              disabled={submitting}
              onPress={handleSubmit}
              style={[styles.actionButton, { backgroundColor: theme.backgroundSelected, opacity: submitting ? 0.5 : 1 }]}>
              <ThemedText type="smallBold">{submitting ? '게시 중...' : '+ 편지 게시'}</ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">게시된 편지 ({letters.length})</ThemedText>
            {letters.map((letter) => (
              <View key={letter.id} style={[styles.letterRow, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.letterInfo}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {letter.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {new Date(letter.createdAt).toLocaleDateString('ko-KR')}
                  </ThemedText>
                </View>
                <Pressable disabled={deletingId === letter.id} onPress={() => handleDelete(letter.id)} style={styles.deleteButton}>
                  <ThemedText type="small" style={styles.errorText}>
                    {deletingId === letter.id ? '삭제 중...' : '삭제'}
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
    minHeight: 140,
    textAlignVertical: 'top',
  },
  imageSection: {
    gap: Spacing.one,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  coverPreview: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
  },
  galleryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
  },
  galleryThumbWrap: {
    position: 'relative',
  },
  galleryThumb: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
  },
  galleryRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: Spacing.five,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  letterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  letterInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  deleteButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
