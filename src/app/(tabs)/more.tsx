import { router } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import type { Href } from 'expo-router';

type MoreItem = {
  emoji: string;
  label: string;
  description: string;
  href: Href;
  requiresAuth?: boolean;
};

const AUTH_REQUIRED_COLOR = '#f59f00';

const MORE_ITEMS: MoreItem[] = [
  { emoji: '👥', label: '커뮤니티', description: '성도들과 나누는 소식과 글', href: '/community', requiresAuth: true },
  { emoji: '💌', label: '목자의 편지', description: '담임목사님의 편지', href: '/shepherd-letters' },
  { emoji: '📢', label: '알림마당', description: '교회 소식 게시판', href: '/notice-board' },
  { emoji: '💝', label: '후원', description: '정기후원·쿠팡파트너스·후원계좌', href: '/support' },
  { emoji: '👤', label: '마이페이지', description: '로그인·닉네임·관리자 메뉴', href: '/profile' },
];

export default function MoreHubScreen() {
  const { session } = useAuth();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.list}>
          <ThemedText type="title" style={styles.title}>
            더보기
          </ThemedText>
          {MORE_ITEMS.map((item) => (
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
