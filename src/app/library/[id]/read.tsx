import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PdfViewer } from '@/components/PdfViewer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getBookWithContent, getMyAccess, hasBookAccess, type AccessState, type BookWithContent } from '@/db/library';

const FONT_SIZE_KEY = 'bibleapp.library.fontSize';
const FONT_SIZE_MIN = 14;
const FONT_SIZE_MAX = 28;
const FONT_SIZE_STEP = 2;
// 스크롤형 리더라 "페이지" 개념이 없어서 문단 수로 근사한다 — 3~4페이지
// 분량이 되도록 넉넉하게 잡음(문단당 몇 줄인지에 따라 실제 화면 수는 다를 수 있음).
const PREVIEW_PARAGRAPH_LIMIT = 15;

// 웹앱(personal-library-app) 쪽의 텍스트 드래그 하이라이트/메모/성경구절 팝업은
// React DOM의 Selection/Range API를 쓰는데, React Native에는 그 API 자체가
// 없다 — 그대로 옮길 수 없고 RN에 맞는 별도 상호작용(예: 문단 길게 누르기)으로
// 다시 설계해야 한다. 지금은 읽기(폰트 크기 조절 + 위치 기억)까지만 포팅.
export default function BookReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { session } = useAuth();
  const { height: windowHeight } = useWindowDimensions();
  const [book, setBook] = useState<BookWithContent | null>(null);
  const [access, setAccess] = useState<AccessState>({ purchasedBookIds: [], hasActiveSubscription: false });
  const [fontSize, setFontSize] = useState(18);

  useEffect(() => {
    if (!id) return;
    getBookWithContent(id).then(setBook).catch(() => setBook(null));
    if (session) getMyAccess(session.user.id).then(setAccess).catch(() => {});
  }, [id, session]);

  useEffect(() => {
    AsyncStorage.getItem(FONT_SIZE_KEY).then((stored) => {
      const parsed = stored ? Number(stored) : NaN;
      if (!Number.isNaN(parsed)) setFontSize(parsed);
    });
  }, []);

  function updateFontSize(next: number) {
    const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, next));
    setFontSize(clamped);
    AsyncStorage.setItem(FONT_SIZE_KEY, String(clamped)).catch(() => {});
  }

  if (!book) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.readingBackground }]}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">불러오는 중...</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const locked = !hasBookAccess(book, access);

  // 실제 파일(EPUB/PDF)을 올린 책은 문단 단위 미리보기 개념이 없다 —
  // 전체 열람 가능 여부만 보고, PDF는 앱 안에서 바로 보여주고
  // EPUB은 아직 인앱 렌더러가 없어 파일을 직접 열도록 안내한다.
  if (book.filePath) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: book.title }} />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          {locked ? (
            <View style={styles.lockedFileContainer}>
              <View style={[styles.lockedCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.lockedText}>이 책은 구매하거나 구독해야 볼 수 있어요.</ThemedText>
                <Pressable
                  onPress={() => router.push({ pathname: '/library/[id]', params: { id: book.id } })}
                  style={[styles.lockedButton, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold">구매/구독하러 가기</ThemedText>
                </Pressable>
              </View>
            </View>
          ) : book.format === 'pdf' ? (
            // 웹에서는 flex:1이 부모 높이가 애매하면(웹은 네이티브 Yoga와 달리
            // flex 체인이 확정 높이로 안 이어질 수 있음) 0 높이로 접혀서 iframe이
            // 안 보이고 뒤 배경(다크 스킨이면 거의 검정)만 보이는 문제가 있었다 —
            // 창 높이를 직접 넣어 확실한 픽셀 값으로 고정해서 우회.
            <View style={{ width: '100%', height: windowHeight }}>
              <PdfViewer url={book.filePath} />
            </View>
          ) : (
            <View style={styles.lockedFileContainer}>
              <View style={[styles.lockedCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.lockedText}>
                  EPUB 파일은 아직 앱 안에서 바로 볼 수 없어요. 아래 버튼으로 파일을 열어보세요.
                </ThemedText>
                <Pressable
                  onPress={() => Linking.openURL(book.filePath)}
                  style={[styles.lockedButton, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold">파일 열기</ThemedText>
                </Pressable>
              </View>
            </View>
          )}
        </SafeAreaView>
      </ThemedView>
    );
  }

  const paragraphs = locked ? book.paragraphs.slice(0, PREVIEW_PARAGRAPH_LIMIT) : book.paragraphs;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: book.title }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={[styles.toolbar, { borderBottomColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            글자 크기
          </ThemedText>
          <View style={styles.fontControls}>
            <Pressable
              onPress={() => updateFontSize(fontSize - FONT_SIZE_STEP)}
              style={[styles.fontButton, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">−</ThemedText>
            </Pressable>
            <ThemedText type="small">{fontSize}px</ThemedText>
            <Pressable
              onPress={() => updateFontSize(fontSize + FONT_SIZE_STEP)}
              style={[styles.fontButton, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">+</ThemedText>
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {paragraphs.map((paragraph, index) => (
            <ThemedText key={index} style={[styles.paragraph, { fontSize, lineHeight: fontSize * 1.7 }]}>
              {paragraph}
            </ThemedText>
          ))}

          {locked && (
            <View style={[styles.lockedCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.lockedText}>
                여기까지 무료로 볼 수 있어요. 전체 내용은 구매하거나 구독하면 이어서 읽을 수 있습니다.
              </ThemedText>
              <Pressable
                onPress={() => router.push({ pathname: '/library/[id]', params: { id: book.id } })}
                style={[styles.lockedButton, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">구매/구독하러 가기</ThemedText>
              </Pressable>
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
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  fontButton: {
    width: 32,
    height: 32,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  lockedFileContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  paragraph: {
    // 전자책 본문. 글자 크기는 사용자가 조절하므로 서체만 정한다.
    
    marginBottom: Spacing.one,
  },
  lockedCard: {
    marginTop: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  lockedText: {
    textAlign: 'center',
  },
  lockedButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
});
