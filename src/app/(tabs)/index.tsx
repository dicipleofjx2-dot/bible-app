import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { getTodayLabelKST } from '@/lib/hebrew-date';
import type { Href } from 'expo-router';

type MenuItem = {
  emoji: string;
  label: string;
  href: Href;
  requiresAuth?: boolean;
};

const AUTH_REQUIRED_COLOR = '#f59f00';

const MENU_ITEMS: MenuItem[] = [
  { emoji: '📖', label: '말씀묵상', href: '/meditation' },
  { emoji: '✍️', label: '말씀노트', href: '/word-notes' },
  { emoji: '📚', label: '성경읽기', href: '/read' },
  { emoji: '🗓️', label: '성경통독', href: '/bible-reading', requiresAuth: true },
  { emoji: '🔎', label: '관주검색', href: '/search' },
  { emoji: '💡', label: '암송구절', href: '/notes' },
  { emoji: '📜', label: '주석', href: '/commentary' },
  { emoji: '👥', label: '커뮤니티', href: '/community', requiresAuth: true },
  { emoji: '❤️‍🔥', label: '영성일기', href: '/calendar' },
  { emoji: '📊', label: '우선순위', href: '/calendar' },
  { emoji: '🪙', label: '천국재정', href: '/calendar' },
  { emoji: '🙏', label: '샬롬기도단', href: '/prayer-group', requiresAuth: true },
];

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeAreaOuter}>
        <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.safeArea}>
          <ThemedText type="title" style={styles.appTitle}>
            데이빗바이블
          </ThemedText>

          <Pressable
            onPress={() => router.push('/calendar')}
            style={({ pressed }) => [styles.calendarWidget, pressed && styles.pressed]}>
            <ThemedView type="backgroundElement" style={styles.calendarWidgetInner}>
              <ThemedText type="small" themeColor="textSecondary">
                📅 {getTodayLabelKST()}
              </ThemedText>
            </ThemedView>
          </Pressable>

          <View style={styles.grid}>
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.href)}
                style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
                <ThemedView
                  type="backgroundElement"
                  style={[styles.tileIcon, item.requiresAuth && styles.tileIconAuthRequired]}>
                  <ThemedText style={styles.tileEmoji}>{item.emoji}</ThemedText>
                </ThemedView>
                <ThemedText type="small" style={styles.tileLabel} numberOfLines={1}>
                  {item.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.authLegend}>
            <View style={styles.authLegendSwatch} />
            <ThemedText type="small" themeColor="textSecondary">
              표시는 로그인/회원가입이 필요한 서비스입니다.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeAreaOuter: {
    flex: 1,
    width: '100%',
  },
  scrollOuter: {
    flex: 1,
    width: '100%',
  },
  safeArea: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  appTitle: {
    textAlign: 'center',
    fontSize: 32,
  },
  calendarWidget: {
    alignSelf: 'flex-start',
  },
  calendarWidgetInner: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    rowGap: Spacing.three,
    marginTop: Spacing.two,
  },
  tile: {
    width: '25%',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tileIcon: {
    width: '78%',
    aspectRatio: 1,
    borderRadius: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconAuthRequired: {
    borderWidth: 3,
    borderColor: AUTH_REQUIRED_COLOR,
  },
  tileEmoji: {
    fontSize: 32,
  },
  tileLabel: {
    textAlign: 'center',
  },
  authLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  authLegendSwatch: {
    width: 14,
    height: 14,
    borderRadius: Spacing.half,
    borderWidth: 3,
    borderColor: AUTH_REQUIRED_COLOR,
  },
  pressed: {
    opacity: 0.7,
  },
});
