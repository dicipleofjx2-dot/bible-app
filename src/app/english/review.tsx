import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { getAttemptsForQuestion, getReviewItems, getSolvedIds, removeReviewItem, setReviewNote } from '@/db/english';
import { PrimaryButton } from '@/features/english/QuizRunner';
import { useTheme } from '@/hooks/use-theme';
import {
  ERROR_CAUSES,
  MASTERY_CRITERIA,
  REVIEW_REASONS,
  REVIEW_SCHEDULE,
  TYPE_META,
} from '@/lib/english/curriculum';
import { freshOfType, getQuestion, variantFor } from '@/lib/english/questionBank';
import { dueItems, dueLabel, reviewModeFor, type ReviewMode } from '@/lib/english/spacedRepetition';
import type { Attempt, ReviewItem } from '@/lib/english/types';

/**
 * AI 복습노트 (기획서 §6).
 *
 * 여기의 핵심은 목록이 아니라 **재출제**다. 틀린 문제를 모아 두기만 하면
 * 학생은 그것을 다시 보지 않는다. 그래서 화면 맨 위가 늘 「오늘 복습 시작」이고,
 * 단계에 따라 원문제 / 변형 문제 / 같은 유형의 새 문제가 자동으로 정해진다.
 */
export default function ReviewNoteScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    let alive = true;
    Promise.all([getReviewItems(), getSolvedIds()]).then(([rows, s]) => {
      if (!alive) return;
      setItems(rows);
      setSolved(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  useFocusEffect(load);

  const due = useMemo(() => dueItems(items), [items]);
  const upcoming = items
    .filter((i) => i.masteredAt === null && !due.includes(i))
    .sort((a, b) => a.dueAt - b.dueAt);
  const mastered = items.filter((i) => i.masteredAt !== null);

  /** 오늘 복습 세션을 만든다. 단계마다 무엇을 풀지가 달라진다(§6.4). */
  function startSession() {
    const ids: string[] = [];
    const chain: Record<string, string> = {};
    for (const item of due) {
      const picked = questionForStage(item, solved);
      if (!picked) continue;
      ids.push(picked);
      chain[picked] = item.questionId;
    }
    if (ids.length === 0) return;
    router.push({
      pathname: '/english/quiz',
      params: { ids: ids.join(','), mode: 'review', chain: JSON.stringify(chain) },
    });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>AI 복습노트</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            보관이 아니라 재출제가 목적입니다. 같은 문제, 변형 문제, 같은 유형의 새 문제 순으로 다시 나옵니다.
          </ThemedText>

          {due.length > 0 ? (
            <View style={[styles.card, { borderColor: theme.accent, backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={Type.itemTitle}>오늘 복습할 {due.length}문항</ThemedText>
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                실패하면 단계가 처음(당일 재풀이)으로 돌아갑니다. 한 칸씩 물러나면 같은 자리를 오래 맴돌기 때문입니다.
              </ThemedText>
              <PrimaryButton label="오늘 복습 시작" onPress={startSession} />
            </View>
          ) : upcoming.length > 0 ? (
            // 「없다」로만 끝내면, 방금 틀린 문제 열두 개를 담아 놓고도 화면이
            // 비어 보인다. 다음 것이 언제 오는지까지 말해 준다.
            <ThemedText themeColor="textSecondary" style={Type.body}>
              지금 복습할 것은 없습니다. 다음 복습은 {dueLabel(upcoming[0])}에 옵니다 — 모두 {upcoming.length}문항.
            </ThemedText>
          ) : (
            <ThemedText themeColor="textSecondary" style={Type.body}>
              복습노트가 비어 있습니다. 틀리거나 찍어서 맞힌 문제가 여기에 자동으로 담깁니다.
            </ThemedText>
          )}

          <Section title={`지금 복습 (${due.length})`} items={due} openId={openId} setOpenId={setOpenId} onChanged={load} />
          <Section title={`예정 (${upcoming.length})`} items={upcoming} openId={openId} setOpenId={setOpenId} onChanged={load} />
          <Section
            title={`완전정복 (${mastered.length})`}
            items={mastered}
            openId={openId}
            setOpenId={setOpenId}
            onChanged={load}
          />

          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={Type.sectionTitle}>완전정복 기준</ThemedText>
            {MASTERY_CRITERIA.map((c, i) => (
              <ThemedText key={c} style={Type.itemDescription}>
                {i + 1}. {c}
              </ThemedText>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** 이 단계에서 실제로 풀 문항 id. 변형이 없으면 원문제로 물러선다. */
function questionForStage(item: ReviewItem, solved: Set<string>): string | null {
  const mode: ReviewMode = reviewModeFor(item.stage);
  const original = getQuestion(item.questionId);
  if (!original) return null;

  if (mode === 'variant') return variantFor(item.questionId)?.id ?? original.id;
  if (mode === 'freshSameType') return freshOfType(original.type, solved)?.id ?? original.id;
  // original / vocabCheck / mixed / final 은 원문제를 다시 푼다.
  return original.id;
}

function Section({
  title,
  items,
  openId,
  setOpenId,
  onChanged,
}: {
  title: string;
  items: ReviewItem[];
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onChanged: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <ThemedText style={Type.sectionTitle}>{title}</ThemedText>
      {items.map((item) => (
        <ReviewCard
          key={item.questionId}
          item={item}
          open={openId === item.questionId}
          onToggle={() => setOpenId(openId === item.questionId ? null : item.questionId)}
          onChanged={onChanged}
        />
      ))}
    </View>
  );
}

/** 문제별 복습 카드 (기획서 §6.3). */
function ReviewCard({
  item,
  open,
  onToggle,
  onChanged,
}: {
  item: ReviewItem;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const theme = useTheme();
  const question = getQuestion(item.questionId);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [note, setNote] = useState(item.note ?? '');

  useFocusEffect(
    useCallback(() => {
      if (!open) return;
      let alive = true;
      getAttemptsForQuestion(item.questionId).then((rows) => {
        if (alive) setAttempts(rows);
      });
      return () => {
        alive = false;
      };
    }, [open, item.questionId]),
  );

  if (!question) return null;
  const last = attempts[0];
  const cause = last?.selfCause ?? last?.aiCause ?? null;

  return (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <Pressable onPress={onToggle} style={({ pressed }) => [styles.cardHead, pressed && styles.pressed]}>
        <View style={styles.cardHeadText}>
          <ThemedText style={Type.itemTitle}>
            {TYPE_META[question.type].emoji} {TYPE_META[question.type].label}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.caption}>
            {REVIEW_REASONS[item.reason]} · {item.stage}단계({REVIEW_SCHEDULE[item.stage].label}) · 다음{' '}
            {dueLabel(item)}
            {item.starred ? ' · ★' : ''}
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary">{open ? '−' : '+'}</ThemedText>
      </Pressable>

      {open ? (
        <View style={styles.cardBody}>
          <ThemedText themeColor="textSecondary" style={Type.caption}>
            이번 단계에 할 일 — {REVIEW_SCHEDULE[item.stage].how}
          </ThemedText>

          <ThemedText style={[Type.body, styles.excerpt]} numberOfLines={3}>
            {question.passage[0]}
          </ThemedText>

          {last ? (
            <ThemedText style={Type.itemDescription}>
              내 답 {last.chosen}번 / 정답 {question.answer}번 · 내가 짚은 근거{' '}
              {last.evidenceIndex === null ? '없음' : `${last.evidenceIndex + 1}번째 문장`} / 실제 근거{' '}
              {question.evidenceIndex + 1}번째 문장
            </ThemedText>
          ) : null}

          {cause ? (
            <ThemedText style={[Type.itemDescription, { color: theme.accent }]}>
              한 줄 원인 — {ERROR_CAUSES[cause].emoji} {ERROR_CAUSES[cause].label}: {ERROR_CAUSES[cause].diagnosis}
            </ThemedText>
          ) : null}

          <ThemedText style={Type.sectionTitle}>핵심 어휘</ThemedText>
          {question.keyVocab.map((v) => (
            <ThemedText key={v.word} style={Type.itemDescription}>
              · {v.word} — {v.meaning}
              {v.note ? ` (${v.note})` : ''}
            </ThemedText>
          ))}

          <ThemedText style={Type.sectionTitle}>핵심 구문 직독직해</ThemedText>
          {question.keySyntax.map((s) => (
            <View key={s.sentence} style={styles.syntax}>
              <ThemedText style={Type.itemDescription}>{s.chunks.join(' / ')}</ThemedText>
              <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                → {s.translation}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                · {s.point}
              </ThemedText>
            </View>
          ))}

          <ThemedText style={Type.sectionTitle}>다음에 쓸 풀이 규칙</ThemedText>
          <ThemedText style={Type.itemDescription}>{question.rule}</ThemedText>

          <ThemedText style={Type.sectionTitle}>내 메모</ThemedText>
          <TextInput
            value={note}
            onChangeText={setNote}
            onBlur={() => setReviewNote(item.questionId, note).then(onChanged)}
            multiline
            placeholder="내 말로 정리해 두면 다음에 훨씬 빨리 붙습니다."
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />

          <View style={styles.actions}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/english/quiz',
                  params: { ids: question.id, mode: 'review', chain: JSON.stringify({ [question.id]: item.questionId }) },
                })
              }
              style={({ pressed }) => [styles.action, { borderColor: theme.accent }, pressed && styles.pressed]}>
              <ThemedText style={[Type.itemDescription, { color: theme.accent }]}>지금 다시 풀기</ThemedText>
            </Pressable>
            {variantFor(item.questionId) ? (
              <Pressable
                onPress={() => {
                  const variant = variantFor(item.questionId);
                  if (!variant) return;
                  router.push({
                    pathname: '/english/quiz',
                    params: {
                      ids: variant.id,
                      mode: 'review',
                      chain: JSON.stringify({ [variant.id]: item.questionId }),
                    },
                  });
                }}
                style={({ pressed }) => [styles.action, { borderColor: theme.border }, pressed && styles.pressed]}>
                <ThemedText style={Type.itemDescription}>변형 문제</ThemedText>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => removeReviewItem(item.questionId).then(onChanged)}
              style={({ pressed }) => [styles.action, { borderColor: theme.border }, pressed && styles.pressed]}>
              <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                노트에서 빼기
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
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
  card: { borderWidth: 1, borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardHeadText: { flex: 1, gap: 2 },
  cardBody: { gap: Spacing.two, marginTop: Spacing.two },
  excerpt: { opacity: 0.85 },
  syntax: { gap: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.three,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  action: { borderWidth: 1, borderRadius: 10, paddingVertical: Spacing.two, paddingHorizontal: Spacing.three },
  pressed: { opacity: 0.65 },
});
