import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  type LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getStartDate, getTodayQuizScore, WORD_CARD_MIN_QUIZ_SCORE } from '@/lib/readingHelper/db';
import { currentDayNumber, todayDateString } from '@/lib/readingHelper/readingPlan';
import { getDayContentForDay } from '@/lib/readingHelper/dayContent';
import { useI18n } from '@/lib/i18n';
import { WORD_CARD_TEMPLATES, type WordCardTemplate } from '@/lib/readingHelper/wordCardTemplates';

const MIN_FONT_SIZE = 14;
const MAX_FONT_SIZE = 40;
const TEXT_COLORS = ['#ffffff', '#000000', '#ffd76b', '#ff6b9d', '#6bffc0', '#6bc8ff', '#1a1a2e', '#ff4d4d'];
const WATERMARK_TEXT = '새부대교회 데이빗바이블';

type TextStyleState = {
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
};

function clamp(value: number, min: number, max: number) {
  if (min > max) return (min + max) / 2;
  return Math.min(Math.max(value, min), max);
}

// bible-quiz-app(성경통독도우미의 전신, 이제 폐기)에 있던 말씀카드 편집기를
// 데이빗바이블로 이식한 버전.
//
// 잠금 조건은 "오늘 푼 퀴즈가 WORD_CARD_MIN_QUIZ_SCORE(80점) 이상"이다.
// 한동안 역대 최고 점수로 봤는데, 그러면 한 번 90점을 맞은 사람은 그 뒤로
// 퀴즈를 풀지 않아도 계속 열려 있어 조건이 사실상 사라졌다.
// (날짜별 제작 횟수 제한은 아직 없다)
export default function WordCardScreen() {
  const { lang, t } = useI18n();
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id;

  const [checking, setChecking] = useState(true);
  const [defaultVerse, setDefaultVerse] = useState('');
  const [defaultReference, setDefaultReference] = useState('');
  const [todayQuizScore, setTodayQuizScore] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      if (!userId) return;
      let cancelled = false;
      (async () => {
        const startDate = await getStartDate(userId);
        if (!startDate) {
          router.replace('/reading-helper/onboarding');
          return;
        }
        const [dayNumber, score] = await Promise.all([
          Promise.resolve(currentDayNumber(startDate)),
          getTodayQuizScore(userId, todayDateString()).catch(() => 0),
        ]);
        if (cancelled) return;
        setTodayQuizScore(score);
        const content = await getDayContentForDay(startDate, dayNumber, lang);
        if (cancelled) return;
        if (content) {
          setDefaultVerse(content.memorization.text);
          setDefaultReference(content.memorization.reference);
        }
        setChecking(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [authLoading, userId, lang]),
  );

  if (authLoading || !userId || checking) {
    return (
      <ThemedView style={styles.centeredScreen}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (todayQuizScore < WORD_CARD_MIN_QUIZ_SCORE) {
    return (
      <ThemedView style={styles.centeredScreen}>
        <SafeAreaView style={styles.centered}>
          <ThemedText type="smallBold" style={styles.lockedText}>
            {t('wc.locked', { score: WORD_CARD_MIN_QUIZ_SCORE })}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.lockedText}>
            {todayQuizScore > 0
              ? t('wc.todayScore', { n: todayQuizScore })
              : t('wc.notTakenYet')}
          </ThemedText>
          <Pressable
            onPress={() => router.replace('/reading-helper')}
            style={[styles.lockedButton, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold">{t('wc.goToQuiz')}</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return <WordCardEditor theme={theme} defaultVerse={defaultVerse} defaultReference={defaultReference} />;
}

function WordCardEditor({
  theme,
  defaultVerse,
  defaultReference,
}: {
  theme: ReturnType<typeof useTheme>;
  defaultVerse: string;
  defaultReference: string;
}) {
  const { t } = useI18n();
  const [verse, setVerse] = useState(defaultVerse);
  const [reference, setReference] = useState(defaultReference);
  const [template, setTemplate] = useState<WordCardTemplate>(WORD_CARD_TEMPLATES[0]);
  const [backgroundImageUri, setBackgroundImageUri] = useState<string | null>(null);
  const [showWatermark, setShowWatermark] = useState(false);
  const [textStyle, setTextStyle] = useState<TextStyleState>({
    fontSize: 22,
    color: WORD_CARD_TEMPLATES[0].textColor,
    bold: true,
    italic: false,
  });
  const [created, setCreated] = useState(false);
  const [sharing, setSharing] = useState(false);
  const viewShotRef = useRef<ViewShotRef>(null);

  // 위치는 더 이상 React state(xPct/yPct)로 안 다루고, 카드 중심을 기준으로 한
  // 픽셀 오프셋을 Animated.ValueXY로 직접 옮긴다 — 드래그 중에 매 픽셀마다
  // setState → 전체 리렌더가 일어나던 게 "부자연스럽다"던 버벅임의 원인이었다.
  // pan은 네이티브/DOM 쪽에서 바로 갱신되고, 컴포넌트는 놓을 때까지 다시
  // 그려지지 않는다.
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const cardSizeRef = useRef({ width: 0, height: 0 });
  const textSizeRef = useRef({ width: 0, height: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // @ts-expect-error — Animated.ValueXY의 x/y는 타입 선언엔 없지만
        // 실제로 현재 값을 담고 있는 프라이빗 필드다(RN에서 흔히 쓰는 트릭).
        dragStartRef.current = { x: pan.x._value, y: pan.y._value };
      },
      onPanResponderMove: (_evt, gesture) => {
        const { width, height } = cardSizeRef.current;
        const { width: tw, height: th } = textSizeRef.current;
        if (!width || !height) return;
        const halfW = tw / 2;
        const halfH = th / 2;
        const nextX = clamp(dragStartRef.current.x + gesture.dx, -(width / 2) + halfW, width / 2 - halfW);
        const nextY = clamp(dragStartRef.current.y + gesture.dy, -(height / 2) + halfH, height / 2 - halfH);
        pan.setValue({ x: nextX, y: nextY });
      },
    }),
  ).current;

  function handleCardLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    cardSizeRef.current = { width, height };
  }

  function handleTextLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    textSizeRef.current = { width, height };
  }

  function selectTemplate(t: WordCardTemplate) {
    setTextStyle((s) => ({ ...s, color: s.color === template.textColor ? t.textColor : s.color }));
    setTemplate(t);
  }

  function adjustFontSize(delta: number) {
    setTextStyle((s) => ({ ...s, fontSize: clamp(s.fontSize + delta, MIN_FONT_SIZE, MAX_FONT_SIZE) }));
  }

  function resetPosition() {
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
  }

  async function pickBackgroundImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('wc.needPhotoPermission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    setBackgroundImageUri(result.assets[0].uri);
  }

  async function share() {
    if (!viewShotRef.current?.capture) return;
    setSharing(true);
    try {
      // expo-sharing의 OS 공유 시트는 Android/iOS에서만 동작 — 웹에서는
      // react-native-view-shot이 html2canvas로 만든 data:image/png URI를
      // 파일로 만들어 Web Share API가 되면 그걸로, 안 되면(대부분의 데스크톱
      // 브라우저) 그냥 다운로드로 대체한다.
      if (Platform.OS === 'web') {
        const dataUri = await viewShotRef.current.capture();
        const blob = await (await fetch(dataUri)).blob();
        const file = new File([blob], t('wc.fileName'), { type: 'image/png' });
        const nav = navigator as Navigator & {
          canShare?: (data: { files: File[] }) => boolean;
          share?: (data: { files: File[]; title?: string }) => Promise<void>;
        };
        if (nav.canShare?.({ files: [file] }) && nav.share) {
          await nav.share({ files: [file], title: t('wc.shareTitle') });
        } else {
          const link = document.createElement('a');
          link.href = dataUri;
          link.download = t('wc.fileName');
          document.body.appendChild(link);
          link.click();
          link.remove();
          Alert.alert(t('wc.savedTitle'), t('wc.savedBody'));
        }
        return;
      }

      const uri = await viewShotRef.current.capture();
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(t('wc.shareUnavailableTitle'), t('wc.shareUnavailable'));
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('wc.shareDialogTitle') });
    } catch {
      Alert.alert(t('wc.shareFailedTitle'), t('wc.shareFailed'));
    } finally {
      setSharing(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
            <ThemedText type="smallBold">{t('wc.backToHelper')}</ThemedText>
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary">
            {t('wc.title')}
          </ThemedText>

          <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
            <View style={styles.cardPreview} onLayout={handleCardLayout}>
              {/* 내가 고른 사진 > 기본 그림 > 색. 앞의 것이 있으면 뒤는 안 쓴다. */}
              {backgroundImageUri ? (
                <Image source={{ uri: backgroundImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : template.image ? (
                <Image source={template.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <LinearGradient colors={template.colors} style={StyleSheet.absoluteFill} />
              )}

              <Animated.View
                {...panResponder.panHandlers}
                onLayout={handleTextLayout}
                style={[
                  styles.textBlock,
                  {
                    left: '50%',
                    top: '50%',
                    transform: [{ translateX: '-50%' }, { translateY: '-50%' }, ...pan.getTranslateTransform()],
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.cardVerse,
                    {
                      color: textStyle.color,
                      fontSize: textStyle.fontSize,
                      lineHeight: textStyle.fontSize * 1.4,
                      fontWeight: textStyle.bold ? '700' : '400',
                      fontStyle: textStyle.italic ? 'italic' : 'normal',
                    },
                  ]}>
                  {verse}
                </ThemedText>
                {reference.length > 0 && (
                  <ThemedText
                    style={[
                      styles.cardReference,
                      {
                        color: textStyle.color,
                        fontSize: textStyle.fontSize * 0.55,
                        fontWeight: textStyle.bold ? '700' : '600',
                        fontStyle: textStyle.italic ? 'italic' : 'normal',
                      },
                    ]}>
                    {reference}
                  </ThemedText>
                )}
              </Animated.View>

              {showWatermark && (
                <View style={styles.watermarkRow} pointerEvents="none">
                  <View style={styles.watermarkPill}>
                    <ThemedText style={styles.watermarkText}>{WATERMARK_TEXT}</ThemedText>
                  </View>
                </View>
              )}
            </View>
          </ViewShot>

          {!created ? (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                {t('wc.background')}
              </ThemedText>
              <View style={styles.templateRow}>
                {/* 말 옮기는 t() 와 이름이 겹치지 않게 tpl 로 받는다. */}
                {WORD_CARD_TEMPLATES.map((tpl) => (
                  <Pressable
                    key={tpl.id}
                    onPress={() => {
                      setBackgroundImageUri(null);
                      selectTemplate(tpl);
                    }}
                    style={[
                      styles.templateSwatchWrap,
                      !backgroundImageUri && tpl.id === template.id && { borderColor: theme.backgroundSelected },
                    ]}>
                    {tpl.image ? (
                      <Image source={tpl.image} style={styles.templateSwatch} resizeMode="cover" />
                    ) : (
                      <LinearGradient colors={tpl.colors} style={styles.templateSwatch} />
                    )}
                    <ThemedText type="small">{t(tpl.nameKey)}</ThemedText>
                  </Pressable>
                ))}
                <Pressable
                  onPress={pickBackgroundImage}
                  style={[styles.templateSwatchWrap, backgroundImageUri != null && { borderColor: theme.backgroundSelected }]}>
                  {backgroundImageUri ? (
                    <Image source={{ uri: backgroundImageUri }} style={styles.templateSwatch} />
                  ) : (
                    <View style={[styles.templateSwatch, styles.customSwatchEmpty, { backgroundColor: theme.backgroundElement }]}>
                      <ThemedText type="smallBold">+</ThemedText>
                    </View>
                  )}
                  <ThemedText type="small">{t('wc.myPhoto')}</ThemedText>
                </Pressable>
              </View>

              <ThemedText type="small" themeColor="textSecondary">
                {t('wc.fontSize')}
              </ThemedText>
              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() => adjustFontSize(-2)}
                  style={({ pressed }) => [styles.stepperButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">−</ThemedText>
                </Pressable>
                <ThemedText type="smallBold" style={styles.stepperValue}>
                  {textStyle.fontSize}
                </ThemedText>
                <Pressable
                  onPress={() => adjustFontSize(2)}
                  style={({ pressed }) => [styles.stepperButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">+</ThemedText>
                </Pressable>
                <Pressable
                  onPress={resetPosition}
                  style={({ pressed }) => [styles.resetButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                  <ThemedText type="small">{t('wc.resetPosition')}</ThemedText>
                </Pressable>
              </View>

              <ThemedText type="small" themeColor="textSecondary">
                {t('wc.textColor')}
              </ThemedText>
              <View style={styles.colorRow}>
                {TEXT_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setTextStyle((s) => ({ ...s, color: c }))}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      textStyle.color === c && { borderColor: theme.backgroundSelected },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => setTextStyle((s) => ({ ...s, bold: !s.bold }))}
                  style={[
                    styles.toggleButton,
                    { backgroundColor: theme.backgroundElement },
                    textStyle.bold && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <ThemedText type="smallBold">B</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setTextStyle((s) => ({ ...s, italic: !s.italic }))}
                  style={[
                    styles.toggleButton,
                    { backgroundColor: theme.backgroundElement },
                    textStyle.italic && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <ThemedText type="smallBold" style={styles.italicI}>
                    I
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setShowWatermark((v) => !v)}
                  style={[
                    styles.watermarkToggle,
                    { backgroundColor: theme.backgroundElement },
                    showWatermark && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <ThemedText type="small">{t('wc.watermarkToggle', { name: WATERMARK_TEXT })}</ThemedText>
                </Pressable>
              </View>

              <ThemedText type="small" themeColor="textSecondary">
                {t('wc.verseLabel')}
              </ThemedText>
              <TextInput
                value={verse}
                onChangeText={setVerse}
                multiline
                style={[styles.textInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder={t('wc.versePlaceholder')}
                placeholderTextColor={theme.textSecondary}
              />
              <TextInput
                value={reference}
                onChangeText={setReference}
                style={[styles.referenceInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                placeholder={t('wc.referencePlaceholder')}
                placeholderTextColor={theme.textSecondary}
              />

              <Pressable
                onPress={() => setCreated(true)}
                disabled={verse.trim().length === 0}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected, opacity: verse.trim().length === 0 ? 0.4 : 1 },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {t('wc.title')}
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary" style={styles.bodyText}>
                {t('wc.done')}
              </ThemedText>
              <Pressable
                onPress={share}
                disabled={sharing}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected, opacity: sharing ? 0.6 : 1 },
                  pressed && styles.pressed,
                ]}>
                {sharing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText type="smallBold" style={styles.primaryButtonText}>
                    {Platform.OS === 'web' ? t('wc.saveOrShare') : t('wc.share')}
                  </ThemedText>
                )}
              </Pressable>
              <Pressable
                onPress={() => setCreated(false)}
                style={({ pressed }) => [styles.secondaryButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                <ThemedText type="smallBold">{t('wc.editAgain')}</ThemedText>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  centeredScreen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four },
  lockedText: { textAlign: 'center' },
  lockedButton: { marginTop: Spacing.two, paddingHorizontal: Spacing.five, paddingVertical: Spacing.three, borderRadius: Spacing.four },
  container: { flex: 1, alignItems: 'center', width: '100%' },
  safeArea: { flex: 1, width: '100%' },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  backRow: { alignSelf: 'flex-start' },
  bodyText: { textAlign: 'center' },
  cardPreview: {
    aspectRatio: 1,
    borderRadius: Spacing.five,
    overflow: 'hidden',
  },
  textBlock: { position: 'absolute', alignItems: 'center', gap: Spacing.one, maxWidth: '82%' },
  cardVerse: { textAlign: 'center' },
  cardReference: { textAlign: 'center' },
  watermarkRow: {
    position: 'absolute',
    bottom: Spacing.three,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  // 배경 넷이 다 옅은 수채화라, 검은 알약에 흰 글씨는 흐릿하게만 보인다.
  // 밝은 알약에 어두운 글씨로 뒤집는다.
  watermarkPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  watermarkText: { fontSize: 11, color: '#4A3728', fontWeight: '600' },
  templateRow: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'center', flexWrap: 'wrap' },
  templateSwatchWrap: {
    alignItems: 'center',
    gap: Spacing.half,
    padding: Spacing.half,
    borderRadius: Spacing.three,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateSwatch: { width: 44, height: 44, borderRadius: Spacing.two },
  customSwatchEmpty: { alignItems: 'center', justifyContent: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepperButton: { width: 40, height: 40, borderRadius: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 32, textAlign: 'center' },
  resetButton: {
    marginLeft: 'auto',
    paddingHorizontal: Spacing.three,
    height: 40,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: 'transparent' },
  toggleRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap', alignItems: 'center' },
  toggleButton: { width: 48, height: 40, borderRadius: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  watermarkToggle: {
    height: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  italicI: { fontStyle: 'italic' },
  textInput: { minHeight: 80, borderRadius: Spacing.three, padding: Spacing.three, textAlignVertical: 'top' },
  referenceInput: { borderRadius: Spacing.three, padding: Spacing.three },
  primaryButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center' },
  primaryButtonText: { color: '#fff' },
  secondaryButton: { borderRadius: Spacing.four, paddingVertical: Spacing.four, alignItems: 'center' },
  pressed: { opacity: 0.85 },
});
