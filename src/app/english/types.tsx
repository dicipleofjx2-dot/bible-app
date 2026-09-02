import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { getAttempts } from '@/db/english';
import { useTheme } from '@/hooks/use-theme';
import { DOMAIN_LABELS, TYPE_META, TYPE_ORDER } from '@/lib/english/curriculum';
import { masteryOf } from '@/lib/english/diagnosis';
import { countByType } from '@/lib/english/questionBank';
import type { Attempt, Domain, QuestionTypeId } from '@/lib/english/types';

/** 유형 지도 (기획서 §11 「유형학습 — 유형 지도」). 영역별로 묶고 숙련도를 함께 보인다. */
export default function TypeMapScreen() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const counts = countByType();

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getAttempts(300).then((rows) => {
        if (alive) setAttempts(rows);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const byDomain = new Map<Domain, QuestionTypeId[]>();
  for (const type of TYPE_ORDER) {
    const domain = TYPE_META[type].domain;
    byDomain.set(domain, [...(byDomain.get(domain) ?? []), type]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>유형 학습실</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            문항 번호가 아니라 학습 유형으로 나눕니다. 회차마다 번호는 달라져도 재는 능력은 같습니다.
          </ThemedText>

          {[...byDomain.entries()].map(([domain, types]) => (
            <View key={domain} style={styles.section}>
              <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>
                {DOMAIN_LABELS[domain]}
              </ThemedText>
              {types.map((type) => (
                <TypeRow key={type} type={type} attempts={attempts} count={counts[type]} />
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function TypeRow({ type, attempts, count }: { type: QuestionTypeId; attempts: Attempt[]; count: number }) {
  const theme = useTheme();
  const meta = TYPE_META[type];
  const mastery = masteryOf(type, attempts);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/english/type/[id]', params: { id: type } })}
      style={({ pressed }) => [
        styles.row,
        { borderColor: theme.border, backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={styles.emoji}>{meta.emoji}</ThemedText>
      <View style={styles.rowText}>
        <ThemedText style={Type.itemTitle}>{meta.label}</ThemedText>
        <ThemedText themeColor="textSecondary" style={Type.caption} numberOfLines={2}>
          {meta.intent}
        </ThemedText>
        <View style={[styles.track, { backgroundColor: theme.accentSoft }]}>
          <View
            style={[
              styles.fill,
              {
                backgroundColor: mastery.score >= 70 ? theme.done : theme.accent,
                width: `${Math.max(2, mastery.score)}%`,
              },
            ]}
          />
        </View>
        <ThemedText themeColor="textSecondary" style={Type.caption}>
          {mastery.attempts === 0 ? `아직 안 풂 · 문항 ${count}개` : `숙련도 ${mastery.score} · ${mastery.attempts}회 풂`}
        </ThemedText>
      </View>
      <ThemedText themeColor="textSecondary">›</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%' },
  page: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  section: { gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
  },
  emoji: { fontSize: 26 },
  rowText: { flex: 1, gap: 3 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 2 },
  fill: { height: 6, borderRadius: 3 },
  pressed: { opacity: 0.65 },
});
