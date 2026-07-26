import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getBooks, getVerse, type Book } from '@/db/bible';
import { getAllMarks, type VerseMark } from '@/db/userData';
import { getRandomCardBackgroundUrl } from '@/db/verseCards';
import { isKakaoShareAvailable, shareVerseCard } from '@/lib/kakaoShare';

type EnrichedMark = VerseMark & { bookName: string; verseText: string };

const SITE_URL = 'https://dicipleofjx-bible.vercel.app';

export default function VerseCardScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { session } = useAuth();

  const [mode, setMode] = useState<'saved' | 'custom'>('saved');
  const [marks, setMarks] = useState<EnrichedMark[]>([]);
  const [selectedMarkId, setSelectedMarkId] = useState<number | null>(null);
  const [customRef, setCustomRef] = useState('');
  const [customText, setCustomText] = useState('');

  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [loadingBg, setLoadingBg] = useState(true);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  const loadMarks = useCallback(async () => {
    const [rawMarks, books] = await Promise.all([getAllMarks(), getBooks(db)]);
    const bookById = new Map<number, Book>(books.map((b) => [b.id, b]));
    const enriched = await Promise.all(
      rawMarks.map(async (m) => {
        const verse = await getVerse(db, m.book_id, m.chapter, m.verse, m.translation);
        return { ...m, bookName: bookById.get(m.book_id)?.name_ko ?? '', verseText: verse?.text ?? '' };
      })
    );
    setMarks(enriched);
    if (enriched.length > 0) setSelectedMarkId((prev) => prev ?? enriched[0].id);
  }, [db]);

  const loadBackground = useCallback(async () => {
    setLoadingBg(true);
    try {
      const url = await getRandomCardBackgroundUrl();
      setBackgroundUrl(url);
    } finally {
      setLoadingBg(false);
    }
  }, []);

  useEffect(() => {
    loadMarks();
    loadBackground();
  }, [loadMarks, loadBackground]);

  const selectedMark = marks.find((m) => m.id === selectedMarkId) ?? null;
  const cardRef =
    mode === 'saved' ? (selectedMark ? `${selectedMark.bookName} ${selectedMark.chapter}:${selectedMark.verse}` : '') : customRef;
  const cardText = mode === 'saved' ? (selectedMark?.verseText ?? '') : customText;

  async function handleShare() {
    setShareError(null);
    setShared(false);
    if (!backgroundUrl || !cardText.trim()) return;
    try {
      await shareVerseCard({
        title: cardRef.trim() || '오늘의 말씀',
        description: cardText.trim(),
        imageUrl: backgroundUrl,
        linkUrl: SITE_URL,
      });
      setShared(true);
    } catch (e: any) {
      setShareError(e?.message ?? '공유하지 못했습니다.');
    }
  }

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            말씀카드를 만들려면 마이페이지에서 로그인해주세요.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setMode('saved')}
              style={[styles.modeChip, { backgroundColor: mode === 'saved' ? theme.backgroundSelected : theme.backgroundElement }]}>
              <ThemedText type="smallBold">암송구절에서 선택</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setMode('custom')}
              style={[styles.modeChip, { backgroundColor: mode === 'custom' ? theme.backgroundSelected : theme.backgroundElement }]}>
              <ThemedText type="smallBold">직접 작성</ThemedText>
            </Pressable>
          </View>

          {mode === 'saved' ? (
            marks.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                저장된 암송구절이 없습니다. 먼저 암송구절 탭에서 구절을 저장해주세요.
              </ThemedText>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.markRow}>
                {marks.map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => setSelectedMarkId(m.id)}
                    style={[
                      styles.markChip,
                      { backgroundColor: m.id === selectedMarkId ? theme.backgroundSelected : theme.backgroundElement },
                    ]}>
                    <ThemedText type="small" numberOfLines={1}>
                      {m.bookName} {m.chapter}:{m.verse}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            )
          ) : (
            <View style={styles.customForm}>
              <TextInput
                value={customRef}
                onChangeText={setCustomRef}
                placeholder="구절 참조 (예: 요한복음 3:16)"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />
              <TextInput
                value={customText}
                onChangeText={setCustomText}
                placeholder="말씀 내용을 입력하세요"
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[styles.input, styles.textArea, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />
            </View>
          )}

          <View style={styles.cardWrap}>
            <View style={styles.card}>
              {loadingBg ? (
                <ActivityIndicator style={StyleSheet.absoluteFill} />
              ) : backgroundUrl ? (
                <Image source={{ uri: backgroundUrl }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View style={[styles.cardImage, { backgroundColor: theme.backgroundElement }]} />
              )}
              <View style={styles.cardScrim} />
              <View style={styles.cardTextWrap}>
                {!!cardRef && (
                  <ThemedText type="smallBold" style={styles.cardRefText}>
                    {cardRef}
                  </ThemedText>
                )}
                <ThemedText style={styles.cardBodyText} numberOfLines={8}>
                  {cardText || '말씀을 선택하거나 입력해주세요'}
                </ThemedText>
              </View>
            </View>
          </View>

          <Pressable
            onPress={loadBackground}
            disabled={loadingBg}
            style={[styles.secondaryButton, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">🔄 이미지 변경</ThemedText>
          </Pressable>

          {!isKakaoShareAvailable && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              {Platform.OS !== 'web'
                ? '카카오톡 공유는 아직 웹에서만 가능합니다.'
                : '카카오톡 공유가 아직 설정되지 않았습니다.'}
            </ThemedText>
          )}

          <Pressable
            onPress={handleShare}
            disabled={!isKakaoShareAvailable || !cardText.trim() || !backgroundUrl}
            style={[
              styles.shareButton,
              {
                backgroundColor: '#FEE500',
                opacity: !isKakaoShareAvailable || !cardText.trim() || !backgroundUrl ? 0.5 : 1,
              },
            ]}>
            <ThemedText type="smallBold" style={styles.shareButtonText}>
              💬 카카오톡으로 공유
            </ThemedText>
          </Pressable>

          {shared && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              공유했습니다!
            </ThemedText>
          )}
          {shareError && (
            <ThemedText type="small" style={styles.errorText}>
              {shareError}
            </ThemedText>
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
  safeAreaCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modeChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  markRow: {
    flexGrow: 0,
  },
  markChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    marginRight: Spacing.two,
    maxWidth: 180,
  },
  customForm: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  cardWrap: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 4 / 5,
    borderRadius: Spacing.four,
    overflow: 'hidden',
    backgroundColor: '#1E3350',
  },
  cardImage: {
    ...StyleSheet.absoluteFill,
  },
  cardScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  cardTextWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardRefText: {
    color: '#ffffff',
  },
  cardBodyText: {
    color: '#ffffff',
    fontSize: 17,
    lineHeight: 24,
  },
  secondaryButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
  },
  shareButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#3C1E1E',
  },
  errorText: {
    color: '#e03131',
    textAlign: 'center',
  },
});
