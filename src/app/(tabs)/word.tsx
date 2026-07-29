import { router } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { Href } from 'expo-router';

type WordItem = {
  emoji: string;
  label: string;
  description: string;
  href: Href;
};

const WORD_ITEMS: WordItem[] = [
  { emoji: '📖', label: '매일Q.T', description: '오늘의 QT 본문과 묵상 노트', href: '/meditation' },
  { emoji: '📚', label: '성경읽기', description: '자유롭게 성경 본문 읽기', href: '/read' },
  { emoji: '✍️', label: 'Q.T묵상', description: '지금까지 쓴 QT 묵상 노트 모아보기', href: '/word-notes' },
  { emoji: '💡', label: '구절묵상', description: '하이라이트·암송 구절 모아보기', href: '/notes' },
  { emoji: '🧭', label: '성경연구', description: '성경검색·주석·성경지도', href: '/bible-study' },
];

export default function WordHubScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.list}>
          <ThemedText type="title" style={styles.title}>
            말씀
          </ThemedText>
          {WORD_ITEMS.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.href)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <ThemedView type="backgroundElement" style={styles.rowInner}>
                <ThemedText style={styles.emoji}>{item.emoji}</ThemedText>
                <View style={styles.rowText}>
                  <ThemedText type="smallBold">{item.label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.description}
                  </ThemedText>
                </View>
              </ThemedView>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
    marginBottom: Spacing.two,
  },
  row: {
    width: '100%',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  emoji: {
    fontSize: 32,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
