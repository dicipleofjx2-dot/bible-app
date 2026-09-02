import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { getAttempts, getSolvedIds } from '@/db/english';
import { PrimaryButton } from '@/features/english/QuizRunner';
import { useTheme } from '@/hooks/use-theme';
import { TYPE_META } from '@/lib/english/curriculum';
import { masteryOf } from '@/lib/english/diagnosis';
import { questionsOfType } from '@/lib/english/questionBank';
import type { Attempt, QuestionTypeId } from '@/lib/english/types';

/**
 * 유형학습실 — 모든 유형이 같은 6단계로 돈다 (기획서 §5.3).
 *
 * 유형마다 화면을 따로 만들지 않은 것이 요점이다. 학생이 새 유형에 들어가도
 * 순서가 같으면 「이 유형은 무엇을 봐야 하지」에만 집중할 수 있다.
 */
export default function TypeRoomScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const type = id as QuestionTypeId;
  const meta = TYPE_META[type];
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [solved, setSolved] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([getAttempts(300), getSolvedIds()]).then(([a, s]) => {
        if (!alive) return;
        setAttempts(a);
        setSolved(s);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  if (!meta) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.page}>
          <ThemedText>알 수 없는 유형입니다.</ThemedText>
          <PrimaryButton label="돌아가기" onPress={() => router.back()} />
        </ScrollView>
      </ThemedView>
    );
  }

  const pool = questionsOfType(type);
  const mastery = masteryOf(type, attempts);
  const easy = pool.filter((q) => q.difficulty <= 2);
  const hard = pool.filter((q) => q.difficulty >= 3);
  const unseen = pool.filter((q) => !solved.has(q.id));

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <ThemedText style={Type.screenTitle}>
          {meta.emoji} {meta.label}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
          {mastery.attempts === 0
            ? `아직 풀지 않은 유형입니다 · 문항 ${pool.length}개`
            : `숙련도 ${mastery.score} · ${mastery.attempts}회 풂 · 권장시간의 ${mastery.paceRatio.toFixed(1)}배`}
        </ThemedText>

        <Step n={1} title="출제 의도와 대표 발문">
          <ThemedText style={Type.body}>{meta.intent}</ThemedText>
          <ThemedText themeColor="textSecondary" style={[Type.itemDescription, styles.quote]}>
            “{meta.prompt}”
          </ThemedText>
        </Step>

        <Step n={2} title="풀이 순서와 확인할 단서">
          {meta.steps.map((s, i) => (
            <ThemedText key={s} style={Type.body}>
              {i + 1}. {s}
            </ThemedText>
          ))}
          <ThemedText style={[Type.sectionTitle, styles.trapTitle, { color: theme.accent }]}>자주 걸리는 함정</ThemedText>
          {meta.traps.map((t) => (
            <ThemedText key={t} themeColor="textSecondary" style={Type.itemDescription}>
              · {t}
            </ThemedText>
          ))}
        </Step>

        <Step n={3} title="대표 문항 분석">
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            가장 쉬운 문항 하나를 해설과 함께 풉니다. 여기서는 시간을 재지 않아도 됩니다.
          </ThemedText>
          <SmallButton
            label="대표 문항 풀기"
            disabled={pool.length === 0}
            onPress={() =>
              router.push({
                pathname: '/english/quiz',
                params: { ids: pool[0].id, mode: 'study' },
              })
            }
          />
        </Step>

        <Step n={4} title="단계 훈련">
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            쉬운 것부터 고난도까지 순서대로. 아직 안 푼 것이 {unseen.length}개 남았습니다.
          </ThemedText>
          <SmallButton
            label={`쉬운 문항 ${easy.length}개`}
            disabled={easy.length === 0}
            onPress={() =>
              router.push({
                pathname: '/english/quiz',
                params: { ids: easy.map((q) => q.id).join(','), mode: 'study' },
              })
            }
          />
          <SmallButton
            label={`고난도 문항 ${hard.length}개`}
            disabled={hard.length === 0}
            onPress={() =>
              router.push({
                pathname: '/english/quiz',
                params: { ids: hard.map((q) => q.id).join(','), mode: 'study' },
              })
            }
          />
        </Step>

        <Step n={5} title="제한시간 훈련">
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            해설을 닫고 권장시간 안에 풉니다. 정답률이 높아도 느리면 실전에서 뒤쪽 문항을 못 풉니다.
          </ThemedText>
          <SmallButton
            label="시험 모드로 풀기"
            disabled={pool.length === 0}
            onPress={() =>
              router.push({
                pathname: '/english/quiz',
                params: { ids: pool.map((q) => q.id).join(','), mode: 'exam' },
              })
            }
          />
        </Step>

        <Step n={6} title="유형 마스터 테스트">
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            {mastery.score >= 80
              ? '조건을 채웠습니다. 이 유형은 복습 주기를 늘려도 됩니다.'
              : `숙련도 80점을 넘으면 통과입니다. 지금은 ${mastery.score}점.`}
          </ThemedText>
          <SmallButton
            label="마스터 테스트"
            disabled={pool.length === 0}
            onPress={() =>
              router.push({
                pathname: '/english/quiz',
                params: { ids: pool.map((q) => q.id).join(','), mode: 'exam' },
              })
            }
          />
        </Step>
      </ScrollView>
    </ThemedView>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.step, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <View style={styles.stepHead}>
        <View style={[styles.stepNumber, { backgroundColor: theme.accentSoft }]}>
          <ThemedText style={[Type.itemTitle, { color: theme.accent }]}>{n}</ThemedText>
        </View>
        <ThemedText style={Type.itemTitle}>{title}</ThemedText>
      </View>
      <View style={styles.stepBody}>{children}</View>
    </View>
  );
}

function SmallButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.smallButton,
        { borderColor: disabled ? theme.border : theme.accent },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={[Type.itemDescription, { color: disabled ? theme.textSecondary : theme.accent }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  page: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  step: { borderWidth: 1, borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepBody: { gap: Spacing.two },
  quote: { fontStyle: 'italic' },
  trapTitle: { marginTop: Spacing.two },
  smallButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  pressed: { opacity: 0.65 },
});
