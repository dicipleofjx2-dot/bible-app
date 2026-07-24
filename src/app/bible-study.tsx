import { router } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { Href } from 'expo-router';

type StudyItem = {
  emoji: string;
  label: string;
  description: string;
  href: Href;
};

const STUDY_ITEMS: StudyItem[] = [
  { emoji: '🔎', label: '성경검색', description: '단어/구절로 성경 전체를 검색', href: '/search' },
  { emoji: '📜', label: '주석', description: '만나주석·매튜헨리 주석 보기', href: '/commentary' },
  { emoji: '🗺️', label: '성경지도', description: '성경 속 지리와 여정 지도', href: '/bible-maps' },
];

export default function BibleStudyScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.list}>
          {STUDY_ITEMS.map((item) => (
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
