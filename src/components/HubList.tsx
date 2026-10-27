import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { openAppWindow } from '@/lib/openExternal';
import { AccessibilityInfo, Animated, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
  /** 바깥 앱. 있으면 `href` 대신 이 주소를 이름 붙인 창으로 연다(→ `openAppWindow`). */
  external?: { url: string; window: string };
  /**
   * 이모지 배지 대신 올릴 **대문 그림**(require 로 넣는다).
   *
   * 글을 읽으러 가는 칸에만 쓴다 — 사이트의 첫 화면을 그대로 띄워 두면
   * 「어디로 가는 문인가」가 설명보다 먼저 전해진다. 앱에 담아 나가는 그림이라
   * 받아 오는 양은 없다.
   */
  image?: number;
  /** 이 시각까지 「NEW」 딱지를 붙인다(ISO 시각). 지나면 저절로 사라진다 — 코드를 다시 고칠 필요가 없다. */
  newUntil?: string;
  /** 새로 더한 칸을 눈에 띄게: 금빛 배지에 반짝이를 얹는다. */
  highlight?: boolean;
};

/**
 * 새로 생긴 것에 붙이는 딱지.
 *
 * **천천히** 깜빡인다(1.6초에 한 번). 빠르게 점멸하면 눈이 피로하고, 번쩍이는
 * 화면은 빛에 민감한 분에게 해로울 수 있다. 「움직임 줄이기」를 켜 두신 분에게는
 * 깜빡이지 않고 그대로 켜 둔다 — 딱지가 전하려는 것은 「새것」이지 움직임이 아니다.
 */
function NewBadge({ label, color }: { label: string; color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [still, setStill] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (alive) setStill(reduce);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, still]);

  return (
    <Animated.View style={[styles.newBadge, { backgroundColor: color, opacity: still ? 1 : opacity }]}>
      <ThemedText style={styles.newBadgeText}>{label}</ThemedText>
    </Animated.View>
  );
}

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
                  const isNew = !!item.newUntil && Date.now() < new Date(item.newUntil).getTime();
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => {
                        if (locked) router.push('/profile');
                        else if (item.external) openAppWindow(item.external.url, item.external.window);
                        else router.push(item.href);
                      }}
                      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                      <ThemedView type="backgroundElement" style={[styles.rowInner, { borderColor: theme.border }]}>
                        {item.image ? (
                          <Image source={item.image} style={styles.cover} resizeMode="cover" />
                        ) : (
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: item.highlight ? theme.done : theme.accentSoft },
                              item.highlight && styles.badgeHighlight,
                            ]}>
                            <ThemedText style={styles.emoji}>{item.emoji}</ThemedText>
                            {item.highlight ? <ThemedText style={styles.sparkle}>✨</ThemedText> : null}
                          </View>
                        )}

                        <View style={styles.rowText}>
                          <View style={styles.titleRow}>
                            <ThemedText style={Type.itemTitle}>{item.label}</ThemedText>
                            {isNew ? <NewBadge label="NEW" color={theme.accent} /> : null}
                          </View>
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
    // 바탕과 카드가 명도 차이만으로 구분되던 것을 테두리와 아주 옅은 그림자로
    // 층을 나눠 카드가 위에 떠 보이게 한다.
    borderWidth: 1,
    shadowColor: '#4A3730',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  newBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  // 대문 그림은 배지보다 넓다 — 가로로 긴 띠라 그 비율을 살려야 글자가 읽힌다.
  cover: { width: 92, height: 52, borderRadius: 10 },
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
  badgeHighlight: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#E9B44C',
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  sparkle: {
    position: 'absolute',
    top: -6,
    right: -6,
    fontSize: 16,
    lineHeight: 20,
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
