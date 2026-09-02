import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { getAttempts, getLatestDiagnostic, getReviewItems, getSolvedIds } from '@/db/english';
import { useTheme } from '@/hooks/use-theme';
import { ERROR_CAUSES, TYPE_META } from '@/lib/english/curriculum';
import { allMastery, causeCounts, recommend, type Recommendation } from '@/lib/english/diagnosis';
import { freshOfType, QUESTIONS } from '@/lib/english/questionBank';
import { dueItems } from '@/lib/english/spacedRepetition';
import type { Attempt, DiagnosticResult, ReviewItem } from '@/lib/english/types';

/**
 * 오늘의 학습 대시보드 (기획서 §5.2).
 *
 * 규칙 하나만 지킨다: **오늘 할 일을 위에서부터 순서대로 놓는다.** 진단을
 * 안 했으면 진단이 맨 위, 복습이 밀렸으면 복습이 맨 위. 메뉴를 나열하고
 * 학생이 고르게 하면 늘 쉬운 것부터 고르게 된다.
 */
export default function EnglishHomeScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [solved, setSolved] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const [d, a, r, s] = await Promise.all([
            getLatestDiagnostic(),
            getAttempts(300),
            getReviewItems(),
            getSolvedIds(),
          ]);
          if (!alive) return;
          setDiagnostic(d);
          setAttempts(a);
          setReviews(r);
          setSolved(s);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const due = dueItems(reviews);
  const mastery = allMastery(attempts);
  const recommendations = recommend(mastery, 3);
  const causes = causeCounts(attempts);
  const mastered = reviews.filter((r) => r.masteredAt !== null).length;
  // 「대기」는 지금 당장 풀 것(due)이 아니라 아직 정복하지 못한 전부다.
  // due만 세면 방금 열두 개를 틀려 놓고도 0으로 보인다.
  const pending = reviews.filter((r) => r.masteredAt === null).length;

  const todayCount = attempts.filter((a) => isToday(a.createdAt)).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>수능영어 코치ON</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            진단 → 유형 → 실전 → 오답 분석 → 복습 → 재평가. 오늘 할 것만 위에 둡니다.
          </ThemedText>

          {loading ? (
            <ThemedText themeColor="textSecondary" style={styles.loading}>
              불러오는 중…
            </ThemedText>
          ) : null}

          {/* 1) 진단이 먼저다 */}
          {!diagnostic ? (
            <Card
              title="먼저 진단평가부터"
              body={`읽기 15개 유형을 한 문항씩 풉니다. 정답률뿐 아니라 풀이시간과 확신도를 함께 재서 영역별 레이더와 4주 처방을 만듭니다.`}
              action="진단 시작"
              onPress={() => router.push('/english/diagnostic')}
              highlight
            />
          ) : null}

          {/* 2) 밀린 복습 */}
          {due.length > 0 ? (
            <Card
              title={`오늘 복습할 ${due.length}문항`}
              body={`간격 반복 일정에 따라 지금이 된 것들입니다. 복습노트에는 모두 ${pending}문항이 있습니다.`}
              action="복습 시작"
              onPress={() => router.push('/english/review')}
              highlight
            />
          ) : null}

          {/* 3) 오늘의 학습 */}
          <View style={styles.statRow}>
            <Stat label="오늘 푼 문항" value={`${todayCount}`} />
            <Stat label="복습 대기" value={`${pending}`} />
            <Stat label="완전정복" value={`${mastered}`} />
          </View>

          {diagnostic ? (
            <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={Type.sectionTitle}>가장 최근 진단</ThemedText>
              <ThemedText style={Type.body}>
                {diagnostic.correct}/{diagnostic.total} 정답 · 예상 등급 {diagnostic.gradeBand.high}~
                {diagnostic.gradeBand.low}등급 구간
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                등급은 단정값이 아니라 구간으로 봅니다. 푼 문항이 늘수록 구간이 좁아집니다.
              </ThemedText>
              <Pressable onPress={() => router.push('/english/report')}>
                <ThemedText style={[Type.itemDescription, { color: theme.accent }]}>성장 리포트 보기 ›</ThemedText>
              </Pressable>
            </View>
          ) : null}

          {/* 4) 추천 — 이유를 반드시 함께 */}
          {recommendations.length > 0 ? (
            <View style={styles.section}>
              <ThemedText style={Type.sectionTitle}>다음에 풀 것</ThemedText>
              {recommendations.map((rec) => (
                <RecommendationRow key={rec.type} rec={rec} solved={solved} />
              ))}
            </View>
          ) : null}

          {causes.length > 0 ? (
            <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={Type.sectionTitle}>반복되는 오답 원인</ThemedText>
              {causes.slice(0, 3).map((c) => (
                <ThemedText key={c.cause} style={Type.itemDescription}>
                  {ERROR_CAUSES[c.cause].emoji} {ERROR_CAUSES[c.cause].label} {c.count}회 —{' '}
                  {ERROR_CAUSES[c.cause].nextStep}
                </ThemedText>
              ))}
            </View>
          ) : null}

          {/* 5) 메뉴 */}
          <View style={styles.section}>
            <ThemedText style={Type.sectionTitle}>학습실</ThemedText>
            <MenuRow emoji="🧭" label="유형 학습실" desc="15개 유형의 출제 의도·풀이 순서·단계 훈련" href="/english/types" />
            <MenuRow emoji="🗂️" label="문제은행" desc={`유형·난이도로 골라 풀기 (${QUESTIONS.length}문항)`} href="/english/bank" />
            <MenuRow emoji="⏱️" label="실전 미니 모의고사" desc="제한시간 안에 여러 유형을 섞어 풀기" href="/english/mock" />
            <MenuRow emoji="📓" label="AI 복습노트" desc="틀린 이유와 간격 반복 일정" href="/english/review" />
            <MenuRow emoji="📈" label="성장 리포트" desc="유형별 숙련도·속도·원인 분포" href="/english/report" />
          </View>

          <ThemedText themeColor="textSecondary" style={[Type.caption, styles.footnote]}>
            지금 실린 문항은 모두 자체 제작입니다. 기출 원문은 이용 허가가 확인된 뒤에만 싣습니다.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function RecommendationRow({ rec, solved }: { rec: Recommendation; solved: Set<string> }) {
  const theme = useTheme();
  const meta = TYPE_META[rec.type];
  const target = freshOfType(rec.type, solved);

  return (
    <Pressable
      onPress={() =>
        router.push(
          target
            ? { pathname: '/english/quiz', params: { ids: target.id, mode: 'study', title: meta.label } }
            : { pathname: '/english/type/[id]', params: { id: rec.type } },
        )
      }
      style={({ pressed }) => [
        styles.recRow,
        { borderColor: theme.border, backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={styles.recEmoji}>{meta.emoji}</ThemedText>
      <View style={styles.recText}>
        <ThemedText style={Type.itemTitle}>{meta.label}</ThemedText>
        <ThemedText themeColor="textSecondary" style={Type.caption}>
          {rec.reason}
        </ThemedText>
      </View>
      <ThemedText themeColor="textSecondary">›</ThemedText>
    </Pressable>
  );
}

function MenuRow({ emoji, label, desc, href }: { emoji: string; label: string; desc: string; href: string }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => router.push(href as never)}
      style={({ pressed }) => [
        styles.recRow,
        { borderColor: theme.border, backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={styles.recEmoji}>{emoji}</ThemedText>
      <View style={styles.recText}>
        <ThemedText style={Type.itemTitle}>{label}</ThemedText>
        <ThemedText themeColor="textSecondary" style={Type.caption}>
          {desc}
        </ThemedText>
      </View>
      <ThemedText themeColor="textSecondary">›</ThemedText>
    </Pressable>
  );
}

function Card({
  title,
  body,
  action,
  onPress,
  highlight,
}: {
  title: string;
  body: string;
  action: string;
  onPress: () => void;
  highlight?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { borderColor: highlight ? theme.accent : theme.border, backgroundColor: theme.backgroundElement },
      ]}>
      <ThemedText style={Type.itemTitle}>{title}</ThemedText>
      <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
        {body}
      </ThemedText>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.cardButton, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
        <ThemedText style={[Type.itemDescription, styles.cardButtonLabel]}>{action}</ThemedText>
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={[Type.screenTitle, { color: theme.accent }]}>{value}</ThemedText>
      <ThemedText themeColor="textSecondary" style={Type.caption}>
        {label}
      </ThemedText>
    </View>
  );
}

function isToday(ts: number): boolean {
  const a = new Date(ts);
  const b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
  loading: { marginTop: Spacing.three },
  section: { gap: Spacing.two },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardButton: {
    borderRadius: 10,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  cardButtonLabel: { color: '#FFFFFF' },
  statRow: { flexDirection: 'row', gap: Spacing.two },
  stat: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    gap: 2,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
  },
  recEmoji: { fontSize: 24 },
  recText: { flex: 1, gap: 2 },
  footnote: { marginTop: Spacing.three },
  pressed: { opacity: 0.65 },
});
