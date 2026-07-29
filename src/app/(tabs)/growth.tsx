import { router } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import type { Href } from 'expo-router';

type GrowthItem = {
  emoji: string;
  label: string;
  description: string;
  href: Href;
  requiresAuth?: boolean;
};

const AUTH_REQUIRED_COLOR = '#f59f00';

const GROWTH_ITEMS: GrowthItem[] = [
  { emoji: '❤️‍🔥', label: '순종일기', description: '말씀을 따라 산 하루를 기록', href: '/spiritual-journal' },
  { emoji: '📊', label: '우선순위', description: '오늘 우선해야 할 일 정리', href: '/priorities' },
  { emoji: '🪙', label: '천국재정', description: '재정을 하나님 나라 관점으로', href: '/kingdom-finance' },
  { emoji: '🙏', label: '샬롬기도단', description: '함께 기도제목을 나누는 공간', href: '/prayer-group', requiresAuth: true },
];

export default function GrowthHubScreen() {
  const { session } = useAuth();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.list}>
          <ThemedText type="title" style={styles.title}>
            성장
          </ThemedText>
          {GROWTH_ITEMS.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.requiresAuth && !session ? '/profile' : item.href)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <ThemedView
                type="backgroundElement"
                style={[styles.rowInner, item.requiresAuth && styles.rowInnerAuthRequired]}>
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
  rowInnerAuthRequired: {
    borderWidth: 2,
    borderColor: AUTH_REQUIRED_COLOR,
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
