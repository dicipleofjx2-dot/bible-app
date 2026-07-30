import { router } from 'expo-router';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { Href } from 'expo-router';

type MoreItem = {
  emoji: string;
  label: string;
  description: string;
  href: Href;
};

const MORE_ITEMS: MoreItem[] = [
  { emoji: '💝', label: '후원', description: '정기후원·쿠팡파트너스·후원계좌', href: '/support' },
  { emoji: '👤', label: '마이페이지', description: '로그인·닉네임·관리자 메뉴', href: '/profile' },
];

export default function MoreHubScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.list}>
          <ThemedText type="title" style={styles.title}>
            더보기
          </ThemedText>
          {MORE_ITEMS.map((item) => (
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
        </ScrollView>
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
