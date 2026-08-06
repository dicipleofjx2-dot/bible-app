import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';

export type HubItem = {
  emoji: string;
  label: string;
  description: string;
  href: Href;
  /** 로그인해야 쓸 수 있는 화면. 비로그인이면 마이페이지로 보낸다. */
  requiresAuth?: boolean;
};

export type HubSection = {
  /** 섹션 제목. 항목이 몇 개 안 되면 생략해도 된다. */
  title?: string;
  items: HubItem[];
};

/**
 * 말씀·성장·더보기 같은 목차 화면의 공통 뼈대.
 *
 * 예전에는 화면마다 같은 목록 코드를 따로 두고 있어서 간격과 크기가 조금씩
 * 달랐다. 여기로 모아 한 번에 손보도록 했다.
 *
 * 디자인 요지
 *  - 이모지를 원형 배지에 담아 아이콘처럼 정렬 — 글자와 크기가 뒤섞이지 않는다
 *  - 제목/설명의 굵기와 색을 확실히 갈라 한눈에 훑기 좋게
 *  - 로그인이 필요한 항목은 테두리 대신 작은 글씨로 알린다(테두리는 시선을
 *    과하게 끌어서 목록이 어수선해 보였다)
 */
export function HubList({
  title,
  sections,
  isSignedIn,
  footer,
}: {
  title: string;
  sections: HubSection[];
  isSignedIn: boolean;
  footer?: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <ThemedText style={[Type.screenTitle, styles.title]}>{title}</ThemedText>

          {sections.map((section, sectionIndex) => (
            <View key={section.title ?? sectionIndex} style={styles.section}>
              {section.title ? (
                <ThemedText themeColor="textSecondary" style={[Type.sectionTitle, styles.sectionTitle]}>
                  {section.title}
                </ThemedText>
              ) : null}

              <View style={styles.rows}>
                {section.items.map((item) => {
                  const locked = !!item.requiresAuth && !isSignedIn;
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => router.push(locked ? '/profile' : item.href)}
                      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                      <ThemedView type="backgroundElement" style={styles.rowInner}>
                        <View style={[styles.badge, { backgroundColor: theme.background }]}>
                          <ThemedText style={styles.emoji}>{item.emoji}</ThemedText>
                        </View>

                        <View style={styles.rowText}>
                          <ThemedText style={Type.itemTitle}>{item.label}</ThemedText>
                          <ThemedText themeColor="textSecondary" style={[Type.itemDescription, styles.description]}>
                            {item.description}
                          </ThemedText>
                          {locked ? (
                            <ThemedText style={[Type.caption, styles.lockNote, { color: theme.accent }]}>
                              로그인이 필요해요
                            </ThemedText>
                          ) : null}
                        </View>

                        <ThemedText themeColor="textSecondary" style={styles.chevron}>
                          ›
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {footer}
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
    paddingBottom: BottomTabInset + Spacing.four,
  },
  title: {
    marginBottom: Spacing.four,
  },
  section: {
    marginBottom: Spacing.five,
  },
  sectionTitle: {
    marginBottom: Spacing.three,
  },
  rows: {
    gap: Spacing.two,
  },
  row: {
    width: '100%',
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
  },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  description: {
    opacity: 0.9,
  },
  lockNote: {
    marginTop: 3,
  },
  chevron: {
    fontSize: 22,
    opacity: 0.45,
    paddingRight: Spacing.one,
  },
  pressed: {
    opacity: 0.65,
  },
});
