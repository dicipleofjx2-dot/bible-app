import * as DocumentPicker from 'expo-document-picker';
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
  deleteBook,
  getAllBooksForAdmin,
  insertBook,
  insertBooksFromJson,
  uploadBookCover,
  uploadBookFile,
  type Book,
  type BookAccessTier,
  type BookCategory,
  type BookEntry,
  type BookLanguage,
} from '@/db/library';

const EMPTY_ENTRY: BookEntry = {
  title: '',
  author: '',
  category: '저서',
  description: '',
  coverUrl: '',
  price: 0,
  accessTier: 'purchase_only',
  language: 'ko',
  bodyText: '',
  filePath: '',
  format: 'epub',
};

const CATEGORY_OPTIONS: { value: BookCategory; label: string }[] = [
  { value: '저서', label: '일반도서' },
  { value: '성경공부교재', label: '성경공부교재' },
];
const LANGUAGE_OPTIONS: { value: BookLanguage; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
];
const ACCESS_TIER_OPTIONS: { value: BookAccessTier; label: string }[] = [
  { value: 'free', label: '무료' },
  { value: 'purchase_only', label: '개별구매' },
  { value: 'subscription_included', label: '구독포함' },
  { value: 'both', label: '구매/구독' },
];

export default function LibraryAdminScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [entry, setEntry] = useState<BookEntry>(EMPTY_ENTRY);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [jsonMessage, setJsonMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    getIsAdmin(session.user.id)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
    getAllBooksForAdmin()
      .then(setBooks)
      .catch(() => setBooks([]));
  }, [session]);

  useFocusEffect(load);

  function updateEntry<K extends keyof BookEntry>(key: K, value: BookEntry[K]) {
    setEntry((prev) => ({ ...prev, [key]: value }));
  }

  function selectAccessTier(tier: BookAccessTier) {
    // '무료'를 고르면 가격도 같이 0으로 맞춰서, 가격은 0인데 접근유형은 다른 걸로
    // 남아 등록되는 실수를 막는다(이게 원인이었던 "책 전체가 안 보임" 버그 방지).
    setEntry((prev) => ({ ...prev, accessTier: tier, price: tier === 'free' ? 0 : prev.price }));
  }

  async function handlePickCover() {
    setCoverError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setCoverError('사진 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setCoverUploading(true);
    const uploadResult = await uploadBookCover(asset.uri, asset.mimeType);
    setCoverUploading(false);

    if (uploadResult.error) {
      setCoverError(uploadResult.error);
      return;
    }
    updateEntry('coverUrl', uploadResult.url ?? '');
  }

  async function handlePickFile() {
    setFileError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/epub+zip'],
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setFileUploading(true);
    const uploadResult = await uploadBookFile(asset.uri, asset.mimeType, asset.name);
    setFileUploading(false);

    if (uploadResult.error) {
      setFileError(uploadResult.error);
      return;
    }
    setEntry((prev) => ({ ...prev, filePath: uploadResult.url ?? '', format: uploadResult.format ?? 'epub' }));
    setFileName(asset.name);
  }

  function clearFile() {
    setEntry((prev) => ({ ...prev, filePath: '', format: 'epub' }));
    setFileName(null);
    setFileError(null);
  }

  async function handleSubmit() {
    if (!entry.title.trim() || !entry.author.trim()) {
      setFormError('제목, 저자는 필수 항목입니다.');
      return;
    }
    if (!entry.bodyText.trim() && !entry.filePath.trim()) {
      setFormError('본문 텍스트를 입력하거나 책 파일(EPUB/PDF)을 업로드해야 합니다.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    const result = await insertBook(entry);
    setSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setEntry(EMPTY_ENTRY);
    setFileName(null);
    load();
  }

  async function handleImport() {
    setImporting(true);
    const result = await insertBooksFromJson(jsonText);
    setImporting(false);
    if (result.error && !result.count) {
      setJsonMessage(result.error);
      return;
    }
    setJsonMessage(result.error ? `${result.count}권 등록. ${result.error}` : `${result.count}권을 등록했어요.`);
    setJsonText('');
    load();
  }

  async function handleDelete(bookId: string) {
    setDeletingId(bookId);
    await deleteBook(bookId);
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
            데이빗북스 관리
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="smallBold">새 책 등록</ThemedText>

            <TextInput
              value={entry.title}
              onChangeText={(v) => updateEntry('title', v)}
              placeholder="제목"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <TextInput
              value={entry.author}
              onChangeText={(v) => updateEntry('author', v)}
              placeholder="저자"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />

            <ChipRow label="카테고리" options={CATEGORY_OPTIONS} value={entry.category} onChange={(v) => updateEntry('category', v)} theme={theme} />
            <ChipRow label="언어" options={LANGUAGE_OPTIONS} value={entry.language} onChange={(v) => updateEntry('language', v)} theme={theme} />
            <ChipRow
              label="접근 유형"
              options={ACCESS_TIER_OPTIONS}
              value={entry.accessTier}
              onChange={selectAccessTier}
              theme={theme}
            />

            <TextInput
              value={String(entry.price)}
              onChangeText={(v) => updateEntry('price', Number(v.replace(/[^0-9]/g, '')) || 0)}
              placeholder="가격(원)"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              editable={entry.accessTier !== 'free'}
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundElement, opacity: entry.accessTier === 'free' ? 0.5 : 1 },
              ]}
            />

            <View style={styles.coverSection}>
              <ThemedText type="small" themeColor="textSecondary">
                표지 이미지 (선택, 비워두면 자동 생성)
              </ThemedText>
              <View style={styles.coverRow}>
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
                    {coverUploading ? '업로드 중...' : entry.coverUrl ? '이미지 변경' : '이미지 선택'}
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
              value={entry.description}
              onChangeText={(v) => updateEntry('description', v)}
              placeholder="소개"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.input, styles.multiline, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <View style={styles.coverSection}>
              <ThemedText type="small" themeColor="textSecondary">
                책 파일 업로드 (EPUB/PDF, 아래 텍스트 입력 대신 사용 가능)
              </ThemedText>
              <View style={styles.coverRow}>
                <Pressable
                  disabled={fileUploading}
                  onPress={handlePickFile}
                  style={[styles.actionButton, { backgroundColor: theme.backgroundElement, opacity: fileUploading ? 0.5 : 1 }]}>
                  <ThemedText type="smallBold">
                    {fileUploading ? '업로드 중...' : fileName ? '파일 변경' : '파일 선택'}
                  </ThemedText>
                </Pressable>
                {fileName && (
                  <>
                    <ThemedText type="small" numberOfLines={1} style={styles.fileName}>
                      {fileName}
                    </ThemedText>
                    <Pressable onPress={clearFile}>
                      <ThemedText type="small" style={styles.errorText}>
                        제거
                      </ThemedText>
                    </Pressable>
                  </>
                )}
              </View>
              {fileError && (
                <ThemedText type="small" style={styles.errorText}>
                  {fileError}
                </ThemedText>
              )}
            </View>

            <TextInput
              value={entry.bodyText}
              onChangeText={(v) => updateEntry('bodyText', v)}
              placeholder={
                entry.filePath
                  ? '책 파일을 올렸으면 본문 텍스트는 비워둬도 됩니다.'
                  : '본문 텍스트 (문단은 빈 줄로 구분)\n\n첫 문단...\n\n두 번째 문단...'
              }
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
              <ThemedText type="smallBold">{submitting ? '등록 중...' : '+ 책 등록'}</ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">JSON으로 여러 권 한 번에 등록</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              title/author/category/description/bodyText가 포함된 객체 배열을 붙여넣으세요.
            </ThemedText>
            <TextInput
              value={jsonText}
              onChangeText={setJsonText}
              placeholder='[{"title": "...", "author": "...", "category": "저서", "description": "...", "bodyText": "..."}]'
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.input, styles.bodyTextarea, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            {jsonMessage && (
              <ThemedText type="small" themeColor="textSecondary">
                {jsonMessage}
              </ThemedText>
            )}
            <Pressable
              disabled={importing || !jsonText.trim()}
              onPress={handleImport}
              style={[styles.actionButton, { backgroundColor: theme.backgroundElement, opacity: importing || !jsonText.trim() ? 0.5 : 1 }]}>
              <ThemedText type="smallBold">{importing ? '가져오는 중...' : 'JSON으로 가져오기'}</ThemedText>
            </Pressable>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">등록된 책 ({books.length})</ThemedText>
            {books.map((book) => (
              <View key={book.id} style={[styles.bookRow, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.bookInfo}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {book.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {book.category} · {book.accessTier} · {book.price === 0 ? '무료' : `${book.price.toLocaleString()}원`}
                  </ThemedText>
                </View>
                <Pressable disabled={deletingId === book.id} onPress={() => handleDelete(book.id)} style={styles.deleteButton}>
                  <ThemedText type="small" style={styles.errorText}>
                    {deletingId === book.id ? '삭제 중...' : '삭제'}
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

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
  theme,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.chipSection}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.chipRow}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.chip,
              { backgroundColor: value === opt.value ? theme.backgroundSelected : theme.backgroundElement },
            ]}>
            <ThemedText type="small">{opt.label}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
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
  bodyTextarea: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  chipSection: {
    gap: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  coverSection: {
    gap: Spacing.one,
  },
  coverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  coverPreview: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
  },
  fileName: {
    flexShrink: 1,
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
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  bookInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  deleteButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
