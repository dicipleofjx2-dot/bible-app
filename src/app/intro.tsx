import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { FontFamily } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';

// A real Stack screen (not an overlay toggled by local state) — every
// launch redirects here first (see _layout.tsx), and "시작하기" leaves the
// same way any other in-app link does, router.replace('/'), rather than a
// boolean flip that has to un-render this screen from underneath itself.
//
// 2026-08 개편: 원래 배경사진(intro-background.jpg)이 화면 전체를 꽉 채우고
// 금박 엠보싱 글씨가 진하게 박혀 있어 "부담스럽다"는 피드백을 받음 — 앱
// 나머지 화면의 Calm/Premium 톤(Deep Navy/Warm Ivory/Gold)과도 안 맞았다.
// 사진 위·아래의 금박 문구 밴드를 잘라낸 intro-tree.jpg(자연 풍경만 남김)를
// 작은 카드로 담고, 제목/부제는 실제 타이포그래피로 새로 얹는 방식으로 교체.
export default function IntroScreen() {
  const [hiddenNativeSplash, setHiddenNativeSplash] = useState(false);
  const theme = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      onLayout={() => {
        if (!hiddenNativeSplash) {
          setHiddenNativeSplash(true);
          SplashScreen.hideAsync().catch(() => {});
        }
      }}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.titleGroup}>
            <Text style={[styles.title, { color: theme.text }]}>데이빗바이블</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              성령의 인도하심을 따라 성령의 능력으로
            </Text>
            <Text style={[styles.churchName, { color: theme.accent }]}>
              대한예수교장로회 새부대교회
            </Text>
          </View>

          <View style={[styles.photoCard, { backgroundColor: theme.backgroundElement }]}>
            <Image style={styles.photo} resizeMode="cover" source={require('@/assets/images/intro-tree.jpg')} />
          </View>
          <Text style={[styles.captionText, { color: theme.textSecondary }]}>
            모라비안 선교사 죠셉스미스가 제네덴달에서 선교하던 때에 마을 사람들에게 성경말씀에
            순종하도록 가르친 장소였던 배나무(Pear Tree)입니다.
          </Text>

          <Pressable
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.startButton, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
            <Text style={styles.startButtonText}>시작하기 →</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.five,
    gap: Spacing.four,
  },
  titleGroup: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  title: {
    // 앱의 첫 화면 — 제목용 서체를 쓴다.
    fontFamily: FontFamily.display,
    fontSize: 34,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.two,
  },
  churchName: {
    fontFamily: FontFamily.displayMedium,
    fontSize: 17,
  },
  photoCard: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 894 / 840,
    borderRadius: Spacing.five,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  captionText: {
    maxWidth: 360,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },
  startButton: {
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: 360,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  startButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
});
