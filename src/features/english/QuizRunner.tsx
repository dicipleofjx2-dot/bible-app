import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { recordAttempt, setSelfCause } from '@/db/english';
import { useTheme } from '@/hooks/use-theme';
import { CONFIDENCE_LABELS } from '@/lib/english/diagnosis';
import { ERROR_CAUSES, REVIEW_REASONS, TYPE_META } from '@/lib/english/curriculum';
import type {
  Confidence,
  ErrorCauseId,
  NewAttempt,
  Question,
  QuizMode,
  ReviewReason,
} from '@/lib/english/types';

/**
 * 문항 풀이 화면 (기획서 §5.4 / §5.5).
 *
 * 진단·유형훈련·복습·실전이 전부 이 하나를 쓴다. 화면마다 풀이 UI를 따로
 * 두면 「확신도를 안 묻는 화면」이 생기고, 그 순간 §6.1의 「찍어서 맞힌 문제」가
 * 복습노트에 안 담긴다. 기록의 빈틈은 곧 진단의 빈틈이다.
 *
 * 흐름은 네 단계다.
 *   solve    문제를 푼다. 근거 문장을 짚고 확신도를 고른다.
 *   reason   제출 직후, **정답을 보기 전에** "왜 이 답을 골랐나"를 적는다(§5.4).
 *   feedback 정오 → 단계별 해설 → (틀렸으면) 자기진단
 *   done     세션 요약
 *
 * 시험 모드(mode='exam')와 진단 모드(mode='diagnostic')는 reason·feedback을
 * 건너뛰고 끝에 한 번에 채점한다.
 */

export type QuizRecord = {
  question: Question;
  attempt: NewAttempt;
  attemptId: number;
  aiCause: ErrorCauseId | null;
  addedToReview: ReviewReason | null;
};

type Phase = 'solve' | 'reason' | 'feedback' | 'done';

export function QuizRunner({
  questions,
  mode,
  onComplete,
  renderSummary,
  reviewChain,
}: {
  questions: Question[];
  mode: QuizMode;
  /** 복습 세션에서 변형 문제를 풀 때, 「푼 문항 id → 단계를 올릴 원본 id」.
   *  이것이 없으면 변형 문제를 맞혀도 원래 틀린 문항의 단계가 안 오른다. */
  reviewChain?: Record<string, string>;
  /** 세션이 끝났을 때 한 번 불린다. 저장은 이미 끝난 뒤다. */
  onComplete?: (records: QuizRecord[]) => void;
  /** 요약 화면을 바깥에서 그리고 싶을 때. 없으면 기본 요약을 쓴다. */
  renderSummary?: (records: QuizRecord[]) => React.ReactNode;
}) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('solve');
  const [records, setRecords] = useState<QuizRecord[]>([]);

  // 한 문항 안에서만 쓰는 상태
  const [chosen, setChosen] = useState<number | null>(null);
  const [changes, setChanges] = useState(0);
  const [eliminated, setEliminated] = useState<Set<number>>(new Set());
  const [evidenceIndex, setEvidenceIndex] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());
  const scrollRef = useRef<ScrollView>(null);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  // 진단도 시험처럼 돈다 — 해설을 열지 않고 끝에 한 번에 채점한다.
  // (앞 문항의 해설이 뒤 문항을 도와주면 그것은 진단이 아니라 수업이 된다.)
  const examMode = mode === 'exam' || mode === 'diagnostic';

  // 타이머. 화면이 가려진 탭에서는 브라우저가 간격을 늘리므로, 흐른 시간은
  // 카운터가 아니라 시작 시각의 차이로 잰다.
  useEffect(() => {
    if (phase !== 'solve') return;
    const id = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase, index]);

  const resetForNext = useCallback(() => {
    setChosen(null);
    setChanges(0);
    setEliminated(new Set());
    setEvidenceIndex(null);
    setConfidence(null);
    setReasonText('');
    setElapsed(0);
    startedAt.current = Date.now();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  function pick(choiceId: number) {
    if (chosen !== null && chosen !== choiceId) setChanges((n) => n + 1);
    setChosen(choiceId);
  }

  function toggleEliminated(choiceId: number) {
    setEliminated((prev) => {
      const next = new Set(prev);
      if (next.has(choiceId)) next.delete(choiceId);
      else next.add(choiceId);
      return next;
    });
  }

  const submit = useCallback(async () => {
    if (chosen === null || !question) return;
    const seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    const attempt: Omit<NewAttempt, 'aiCause'> = {
      questionId: question.id,
      type: question.type,
      mode,
      chosen,
      correct: chosen === question.answer,
      seconds,
      confidence: confidence ?? 'unsure',
      changes,
      evidenceIndex,
      selfCause: null,
      reason: null,
    };

    let saved: { attemptId: number; aiCause: ErrorCauseId | null; addedToReview: ReviewReason | null };
    try {
      saved = await recordAttempt(attempt, { advanceReviewFor: reviewChain?.[question.id] });
    } catch {
      // 저장이 막혀도 풀이는 계속된다. 기록만 남지 않는다.
      saved = { attemptId: -1, aiCause: null, addedToReview: null };
    }

    const record: QuizRecord = {
      question,
      attempt: { ...attempt, aiCause: saved.aiCause },
      attemptId: saved.attemptId,
      aiCause: saved.aiCause,
      addedToReview: saved.addedToReview,
    };
    setRecords((prev) => [...prev, record]);

    if (examMode) {
      if (isLast) setPhase('done');
      else {
        setIndex((i) => i + 1);
        resetForNext();
      }
    } else {
      setPhase('reason');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [chosen, question, mode, confidence, changes, evidenceIndex, examMode, isLast, resetForNext, reviewChain]);

  function goNext() {
    if (isLast) {
      setPhase('done');
      return;
    }
    setIndex((i) => i + 1);
    setPhase('solve');
    resetForNext();
  }

  useEffect(() => {
    if (phase === 'done') onComplete?.(records);
    // records는 done으로 넘어오는 순간 이미 확정돼 있다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === 'done') {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        {renderSummary ? renderSummary(records) : <DefaultSummary records={records} />}
      </ScrollView>
    );
  }

  if (!question) {
    return (
      <View style={styles.page}>
        <ThemedText>풀 문항이 없습니다.</ThemedText>
      </View>
    );
  }

  const last = records[records.length - 1];
  const overTime = elapsed > question.expectedSeconds;

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {/* 진행 상황과 타이머 */}
      <View style={styles.headerRow}>
        <ThemedText themeColor="textSecondary" style={Type.caption}>
          {index + 1} / {questions.length} · {TYPE_META[question.type].label} · 난이도 {question.difficulty}
        </ThemedText>
        <ThemedText style={[Type.caption, { color: overTime ? theme.accent : theme.textSecondary }]}>
          ⏱ {formatSeconds(elapsed)} / 권장 {formatSeconds(question.expectedSeconds)}
        </ThemedText>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.accentSoft }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: theme.accent, width: `${((index + (phase === 'solve' ? 0 : 1)) / questions.length) * 100}%` },
          ]}
        />
      </View>

      <ThemedText style={[Type.itemTitle, styles.instruction]}>{question.instruction}</ThemedText>

      <PassageView
        question={question}
        evidenceIndex={evidenceIndex}
        onPickEvidence={phase === 'solve' ? setEvidenceIndex : undefined}
        revealAnswerEvidence={phase === 'feedback'}
      />

      {phase === 'solve' ? (
        <>
          <View style={styles.choices}>
            {question.choices.map((choice) => (
              <ChoiceRow
                key={choice.id}
                id={choice.id}
                label={choice.text}
                selected={chosen === choice.id}
                eliminated={eliminated.has(choice.id)}
                onPress={() => pick(choice.id)}
                onLongPress={() => toggleEliminated(choice.id)}
              />
            ))}
          </View>

          <ThemedText themeColor="textSecondary" style={[Type.caption, styles.tip]}>
            선택지를 길게 누르면 지워서 표시할 수 있어요. 지문의 문장을 누르면 정답 근거로 짚어 둡니다.
          </ThemedText>

          <ThemedText style={[Type.sectionTitle, styles.blockTitle]}>이 답에 얼마나 확신하나요?</ThemedText>
          <View style={styles.confidenceRow}>
            {(['sure', 'unsure', 'guess'] as Confidence[]).map((c) => (
              <Pressable
                key={c}
                onPress={() => setConfidence(c)}
                style={({ pressed }) => [
                  styles.confidenceChip,
                  {
                    borderColor: confidence === c ? theme.accent : theme.border,
                    backgroundColor: confidence === c ? theme.accentSoft : 'transparent',
                  },
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={[Type.itemDescription, confidence === c && { color: theme.accent }]}>
                  {CONFIDENCE_LABELS[c]}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <PrimaryButton
            label={chosen === null ? '답을 고르세요' : examMode && !isLast ? '제출하고 다음 문제' : '제출'}
            disabled={chosen === null}
            onPress={submit}
          />
        </>
      ) : null}

      {phase === 'reason' && last ? (
        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={Type.itemTitle}>왜 이 답을 골랐나요?</ThemedText>
          <ThemedText themeColor="textSecondary" style={[Type.itemDescription, styles.cardNote]}>
            정답을 보기 전에 적습니다. 나중에 실제 근거와 나란히 놓고 비교합니다.
          </ThemedText>
          <TextInput
            value={reasonText}
            onChangeText={setReasonText}
            multiline
            placeholder="예) 세 번째 문장에 should가 있어서"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          <PrimaryButton
            label="정답 확인"
            onPress={() => {
              setPhase('feedback');
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            }}
          />
        </View>
      ) : null}

      {phase === 'feedback' && last ? (
        <Feedback
          record={last}
          myReason={reasonText}
          myEvidence={evidenceIndex}
          onNext={goNext}
          isLast={isLast}
        />
      ) : null}
    </ScrollView>
  );
}

/** 지문. 문장 하나가 한 줄이 아니라 한 덩어리 — 근거를 문장 단위로 짚기 위해서다. */
function PassageView({
  question,
  evidenceIndex,
  onPickEvidence,
  revealAnswerEvidence,
}: {
  question: Question;
  evidenceIndex: number | null;
  onPickEvidence?: (index: number) => void;
  revealAnswerEvidence?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.passage, { backgroundColor: theme.readingBackground, borderColor: theme.border }]}>
      {question.passage.map((sentence, i) => {
        if (!sentence.trim()) return <View key={i} style={styles.passageGap} />;
        const isMine = evidenceIndex === i;
        const isAnswer = !!revealAnswerEvidence && question.evidenceIndex === i;
        return (
          <Pressable key={i} onPress={onPickEvidence ? () => onPickEvidence(i) : undefined}>
            <ThemedText
              style={[
                Type.reading,
                styles.sentence,
                isAnswer && { backgroundColor: theme.accentSoft, color: theme.accent },
                !isAnswer && isMine && { backgroundColor: theme.backgroundSelected },
              ]}>
              {sentence}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChoiceRow({
  id,
  label,
  selected,
  eliminated,
  correct,
  wrongPicked,
  onPress,
  onLongPress,
}: {
  /** ①~⑤의 번호. 화면에는 안 쓰고 테스트에서 선택지를 집을 때 쓴다. */
  id: number;
  label: string;
  selected?: boolean;
  eliminated?: boolean;
  correct?: boolean;
  wrongPicked?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const theme = useTheme();
  const borderColor = correct ? theme.done : wrongPicked ? theme.accent : selected ? theme.accent : theme.border;

  return (
    <Pressable
      testID={`english-choice-${id}`}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      style={({ pressed }) => [
        styles.choice,
        {
          borderColor,
          backgroundColor: correct
            ? theme.accentSoft
            : selected && !wrongPicked
              ? theme.backgroundSelected
              : theme.backgroundElement,
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText
        style={[
          Type.body,
          styles.choiceText,
          eliminated && styles.struck,
          correct && { color: theme.done },
          wrongPicked && { color: theme.accent },
        ]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** 채점 + 단계별 해설 + 자기진단 (기획서 §5.5 / §6.2). */
function Feedback({
  record,
  myReason,
  myEvidence,
  onNext,
  isLast,
}: {
  record: QuizRecord;
  myReason: string;
  myEvidence: number | null;
  onNext: () => void;
  isLast: boolean;
}) {
  const theme = useTheme();
  const { question, attempt } = record;
  const [selfCause, setSelfCauseState] = useState<ErrorCauseId | null>(null);
  const correct = attempt.correct;
  const chosenChoice = question.choices.find((c) => c.id === attempt.chosen);

  async function chooseCause(cause: ErrorCauseId) {
    setSelfCauseState(cause);
    if (record.attemptId > 0) await setSelfCause(record.attemptId, cause).catch(() => {});
  }

  return (
    <View style={styles.feedback}>
      <View
        style={[
          styles.verdict,
          { backgroundColor: correct ? theme.accentSoft : theme.backgroundElement, borderColor: correct ? theme.done : theme.accent },
        ]}>
        <ThemedText style={[Type.itemTitle, { color: correct ? theme.done : theme.accent }]}>
          {correct ? '정답' : '오답'} · 내 답 {attempt.chosen}번 / 정답 {question.answer}번
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={Type.caption}>
          {formatSeconds(attempt.seconds)} 걸림 (권장 {formatSeconds(question.expectedSeconds)}) ·
          {' '}확신도 {CONFIDENCE_LABELS[attempt.confidence]}
          {attempt.changes > 0 ? ` · 답 ${attempt.changes}번 바꿈` : ''}
        </ThemedText>
        {record.addedToReview ? (
          <ThemedText style={[Type.caption, styles.reviewBadge, { color: theme.accent }]}>
            복습노트에 담았습니다 — {REVIEW_REASONS[record.addedToReview]}
          </ThemedText>
        ) : null}
      </View>

      {/* 내가 짚은 근거 vs 실제 근거 (기획서 §6.3) */}
      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={Type.sectionTitle}>내 근거와 실제 근거</ThemedText>
        <ThemedText style={[Type.itemDescription, styles.cardNote]}>
          내가 짚은 문장: {myEvidence === null ? '(짚지 않음)' : `${myEvidence + 1}번째 문장`}
          {'  ·  '}실제 근거: {question.evidenceIndex + 1}번째 문장
        </ThemedText>
        {myReason.trim() ? (
          <ThemedText themeColor="textSecondary" style={[Type.itemDescription, styles.cardNote]}>
            내가 적은 이유: {myReason.trim()}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.choices}>
        {question.choices.map((choice) => (
          <View key={choice.id}>
            <ChoiceRow
              id={choice.id}
              label={choice.text}
              correct={choice.id === question.answer}
              wrongPicked={choice.id === attempt.chosen && !correct}
            />
            {choice.whyWrong ? (
              <ThemedText themeColor="textSecondary" style={[Type.caption, styles.whyWrong]}>
                ✕ {choice.whyWrong}
              </ThemedText>
            ) : null}
          </View>
        ))}
      </View>

      <StepwiseExplanation question={question} />

      {!correct ? (
        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={Type.sectionTitle}>왜 틀렸다고 생각하나요?</ThemedText>
          {record.aiCause ? (
            <ThemedText themeColor="textSecondary" style={[Type.itemDescription, styles.cardNote]}>
              AI 추정: {ERROR_CAUSES[record.aiCause].emoji} {ERROR_CAUSES[record.aiCause].label} —{' '}
              {ERROR_CAUSES[record.aiCause].diagnosis}
            </ThemedText>
          ) : null}
          <View style={styles.causeGrid}>
            {(Object.keys(ERROR_CAUSES) as ErrorCauseId[]).map((cause) => (
              <Pressable
                key={cause}
                onPress={() => chooseCause(cause)}
                style={({ pressed }) => [
                  styles.causeChip,
                  {
                    borderColor: selfCause === cause ? theme.accent : theme.border,
                    backgroundColor: selfCause === cause ? theme.accentSoft : 'transparent',
                  },
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={Type.caption}>
                  {ERROR_CAUSES[cause].emoji} {ERROR_CAUSES[cause].label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
          {selfCause && record.aiCause && selfCause !== record.aiCause ? (
            <ThemedText themeColor="textSecondary" style={[Type.caption, styles.cardNote]}>
              AI 추정과 다르게 골랐습니다. 이 차이는 그대로 남아 교사가 확인할 수 있습니다.
            </ThemedText>
          ) : null}
          {selfCause ? (
            <ThemedText style={[Type.itemDescription, styles.cardNote, { color: theme.accent }]}>
              다음 학습: {ERROR_CAUSES[selfCause].nextStep}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={Type.sectionTitle}>다음에 쓸 풀이 규칙</ThemedText>
        <ThemedText style={[Type.body, styles.cardNote]}>{question.rule}</ThemedText>
      </View>

      <PrimaryButton label={isLast ? '결과 보기' : '다음 문제'} onPress={onNext} />
      {chosenChoice && !correct ? <View style={styles.spacer} /> : null}
    </View>
  );
}

/**
 * 해설을 한 번에 펼치지 않는다 (기획서 §5.5).
 *
 * 여섯 단계를 하나씩 열게 하는 것이 요점이다. 전부 펼쳐 두면 학생은 늘
 * 마지막 완전 해설만 읽고, 힌트만으로 풀리는 문제까지 해설로 넘어간다.
 */
function StepwiseExplanation({ question }: { question: Question }) {
  const theme = useTheme();
  const [open, setOpen] = useState<Set<number>>(new Set());

  const steps = useMemo(
    () => [
      { title: '1. 힌트', body: question.hint },
      { title: '2. 글의 한 줄 구조', body: question.structureLine },
      { title: '3. 정답 근거 위치', body: `${question.evidenceIndex + 1}번째 문장 — ${question.passage[question.evidenceIndex]}` },
      {
        title: '4. 선택지별 판단',
        body: question.choices
          .map((c) => `${c.id}번 ${c.id === question.answer ? '○ 정답' : `✕ ${c.whyWrong ?? ''}`}`)
          .join('\n'),
      },
      {
        title: '5. 핵심 문장 직독직해',
        body: question.keySyntax
          .map((s) => `${s.chunks.join(' / ')}\n→ ${s.translation}\n· ${s.point}`)
          .join('\n\n'),
      },
      {
        title: '6. 완전 해설과 핵심 어휘',
        body: `${question.explanation}\n\n${question.keyVocab
          .map((v) => `· ${v.word} — ${v.meaning}${v.note ? ` (${v.note})` : ''}`)
          .join('\n')}`,
      },
    ],
    [question],
  );

  return (
    <View style={styles.steps}>
      <ThemedText style={[Type.sectionTitle, styles.blockTitle]}>단계별 해설</ThemedText>
      {steps.map((step, i) => {
        const isOpen = open.has(i);
        return (
          <View key={step.title} style={[styles.step, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
            <Pressable
              onPress={() =>
                setOpen((prev) => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                })
              }
              style={({ pressed }) => [styles.stepHeader, pressed && styles.pressed]}>
              <ThemedText style={Type.itemTitle}>{step.title}</ThemedText>
              <ThemedText themeColor="textSecondary">{isOpen ? '−' : '+'}</ThemedText>
            </Pressable>
            {isOpen ? <ThemedText style={[Type.body, styles.stepBody]}>{step.body}</ThemedText> : null}
          </View>
        );
      })}
    </View>
  );
}

function DefaultSummary({ records }: { records: QuizRecord[] }) {
  const theme = useTheme();
  const correct = records.filter((r) => r.attempt.correct).length;
  const totalSeconds = records.reduce((s, r) => s + r.attempt.seconds, 0);
  const added = records.filter((r) => r.addedToReview).length;

  return (
    <View>
      <ThemedText style={[Type.screenTitle, styles.blockTitle]}>수고했어요</ThemedText>
      <ThemedText style={Type.body}>
        {records.length}문항 중 {correct}문항 정답 · 총 {formatSeconds(totalSeconds)}
      </ThemedText>
      {added > 0 ? (
        <ThemedText style={[Type.body, { color: theme.accent }]}>복습노트에 {added}문항이 담겼습니다.</ThemedText>
      ) : null}
      <View style={styles.summaryList}>
        {records.map((r, i) => (
          <View key={`${r.question.id}-${i}`} style={[styles.summaryRow, { borderColor: theme.border }]}>
            <ThemedText style={Type.itemDescription}>
              {i + 1}. {TYPE_META[r.question.type].label}
            </ThemedText>
            <ThemedText style={[Type.itemDescription, { color: r.attempt.correct ? theme.done : theme.accent }]}>
              {r.attempt.correct ? '○' : '✕'} {formatSeconds(r.attempt.seconds)}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: disabled ? theme.border : theme.accent },
        pressed && styles.pressed,
      ]}>
      <ThemedText style={[Type.itemTitle, styles.buttonLabel]}>{label}</ThemedText>
    </Pressable>
  );
}

export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  instruction: {
    marginTop: Spacing.two,
  },
  passage: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  passageGap: {
    height: Spacing.two,
  },
  sentence: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  choices: {
    gap: Spacing.two,
  },
  choice: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  choiceText: {
    flexShrink: 1,
  },
  struck: {
    textDecorationLine: 'line-through',
    opacity: 0.45,
  },
  whyWrong: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
  },
  tip: {
    marginTop: -Spacing.one,
  },
  blockTitle: {
    marginTop: Spacing.two,
  },
  confidenceRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confidenceChip: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.two,
  },
  button: {
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonLabel: {
    color: '#FFFFFF',
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardNote: {
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.three,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  feedback: {
    gap: Spacing.three,
  },
  verdict: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  reviewBadge: {
    marginTop: Spacing.one,
  },
  steps: {
    gap: Spacing.two,
  },
  step: {
    borderWidth: 1,
    borderRadius: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
  },
  stepBody: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  causeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  causeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  summaryList: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingBottom: Spacing.two,
  },
  spacer: {
    height: Spacing.three,
  },
  pressed: {
    opacity: 0.65,
  },
});
