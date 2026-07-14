import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { Href } from 'expo-router';

type MenuItem = {
  emoji: string;
  label: string;
  href: Href;
};

const MENU_ITEMS: MenuItem[] = [
  { emoji: '📖', label: '말씀묵상', href: '/meditation' },
  { emoji: '✍️', label: '말씀노트', href: '/word-notes' },
  { emoji: '📚', label: '성경읽기', href: '/read' },
  { emoji: '🗓️', label: '성경통독', href: '/bible-reading' },
  { emoji: '🔎', label: '관주검색', href: '/search' },
  { emoji: '💡', label: '암송구절', href: '/notes' },
  { emoji: '📜', label: '주석', href: '/commentary' },
  { emoji: '👥', label: '커뮤니티', href: '/community' },
  { emoji: '❤️‍🔥', label: '영성일기', href: '/spiritual-journal' },
  { emoji: '📊', label: '우선순위', href: '/priorities' },
  { emoji: '🪙', label: '천국재정', href: '/kingdom-finance' },
  { emoji: '🙏', label: '샬롬기도단', href: '/prayer-group' },
];

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeAreaOuter}>
        <ScrollView style={styles.scrollOuter} contentContainerStyle={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <ThemedText style={styles.headerEmoji}>✝️</ThemedText>
              <ThemedText type="title">주안에서</ThemedText>
            </View>
            <Pressable
              onPress={() => router.push('/profile')}
              hitSlop={10}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <ThemedText style={styles.headerEmoji}>👤</ThemedText>
            </Pressable>
          </View>

          <View style={styles.grid}>
            {MENU_ITEMS.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.href)}
                style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
                <ThemedView type="backgroundElement" style={styles.tileIcon}>
                  <ThemedText style={styles.tileEmoji}>{item.emoji}</ThemedText>
                </ThemedView>
                <ThemedText type="small" style={styles.tileLabel} numberOfLines={1}>
                  {item.label}
                </ThemedText>
              </Pressable>
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
    paddingTop: Spacing.three,
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerEmoji: {
    fontSize: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    rowGap: Spacing.four,
  },
  tile: {
    width: '25%',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tileIcon: {
    width: 60,
    height: 60,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileEmoji: {
    fontSize: 26,
  },
  tileLabel: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
