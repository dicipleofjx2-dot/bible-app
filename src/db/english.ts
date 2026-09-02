import { getUserDb } from '@/db/userData';
import { inferCause, reviewReasonFor } from '@/lib/english/diagnosis';
import { getQuestion } from '@/lib/english/questionBank';
import { applyReview, newReviewItem } from '@/lib/english/spacedRepetition';
import type {
  Attempt,
  DiagnosticResult,
  ErrorCauseId,
  NewAttempt,
  ReviewItem,
  ReviewReason,
  ReviewStage,
} from '@/lib/english/types';

/**
 * 수능영어 코치ON — 기기 안 저장소.
 *
 * 다른 개인 기록(순종일기·천국재정)과 같은 `user.db`에 표를 얹는다.
 * 서버로 올리지 않는 이유는 두 가지다. 하나, 답안·정답률은 민감한 성취
 * 정보라 계정 없이 쓰는 학생의 것을 굳이 서버에 두지 않는다(§15). 둘,
 * 교사 배정·반 통계가 붙는 단계(2·3단계)에서 Supabase로 올릴 때 이 모듈의
 * 함수 시그니처만 그대로 두면 화면은 손대지 않아도 된다.
 *
 * 표를 새로 만들 때 `IF NOT EXISTS`만 쓰면 **이미 깔린 기기에는 새 컬럼이
 * 안 붙는다.** 컬럼을 더할 때는 이 파일 아래쪽의 ALTER 자리에 한 줄 추가한다
 * (userData.ts가 쓰는 방식과 같다).
 */

let ready: Promise<void> | null = null;

async function ensureTables() {
  if (!ready) {
    ready = (async () => {
      const db = await getUserDb();
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS english_attempts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question_id TEXT NOT NULL,
          type TEXT NOT NULL,
          mode TEXT NOT NULL,
          chosen INTEGER NOT NULL,
          correct INTEGER NOT NULL,
          seconds INTEGER NOT NULL,
          confidence TEXT NOT NULL,
          changes INTEGER NOT NULL DEFAULT 0,
          evidence_index INTEGER,
          ai_cause TEXT,
          self_cause TEXT,
          reason TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS english_attempts_created
          ON english_attempts (created_at DESC);
        CREATE TABLE IF NOT EXISTS english_review_items (
          question_id TEXT PRIMARY KEY,
          stage INTEGER NOT NULL DEFAULT 0,
          due_at INTEGER NOT NULL,
          success_count INTEGER NOT NULL DEFAULT 0,
          fail_count INTEGER NOT NULL DEFAULT 0,
          mastered_at INTEGER,
          starred INTEGER NOT NULL DEFAULT 0,
          note TEXT,
          reason TEXT NOT NULL DEFAULT 'wrong',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS english_diagnostics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          taken_at INTEGER NOT NULL,
          result TEXT NOT NULL
        );
      `);
      // 컬럼을 더할 자리. 이미 있으면 에러가 나므로 조용히 넘어간다.
      // await db.execAsync(`ALTER TABLE english_attempts ADD COLUMN ...;`).catch(() => {});
    })();
  }
  return ready;
}

async function db() {
  await ensureTables();
  return getUserDb();
}

type AttemptRow = {
  id: number;
  question_id: string;
  type: string;
  mode: string;
  chosen: number;
  correct: number;
  seconds: number;
  confidence: string;
  changes: number;
  evidence_index: number | null;
  ai_cause: string | null;
  self_cause: string | null;
  reason: string | null;
  created_at: number;
};

function toAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    questionId: row.question_id,
    type: row.type as Attempt['type'],
    mode: row.mode as Attempt['mode'],
    chosen: row.chosen,
    correct: row.correct === 1,
    seconds: row.seconds,
    confidence: row.confidence as Attempt['confidence'],
    changes: row.changes,
    evidenceIndex: row.evidence_index,
    aiCause: row.ai_cause as ErrorCauseId | null,
    selfCause: row.self_cause as ErrorCauseId | null,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

type ReviewRow = {
  question_id: string;
  stage: number;
  due_at: number;
  success_count: number;
  fail_count: number;
  mastered_at: number | null;
  starred: number;
  note: string | null;
  reason: string;
  created_at: number;
  updated_at: number;
};

function toReviewItem(row: ReviewRow): ReviewItem {
  return {
    questionId: row.question_id,
    stage: row.stage as ReviewStage,
    dueAt: row.due_at,
    successCount: row.success_count,
    failCount: row.fail_count,
    masteredAt: row.mastered_at,
    starred: row.starred === 1,
    note: row.note,
    reason: row.reason as ReviewReason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 한 문항을 푼 결과를 저장하고, 복습노트에 담을지까지 한 번에 정한다.
 *
 * 화면이 「기록하기 → 원인 추정하기 → 복습에 넣기」를 따로 부르지 않게
 * 묶어 두었다. 순서가 갈라지면 어느 화면에서만 복습이 안 쌓이는 일이 생긴다.
 */
export async function recordAttempt(
  input: Omit<NewAttempt, 'aiCause'>,
  options?: {
    /** 복습 세션에서 **변형 문제**를 푼 경우, 단계를 올려야 할 것은 방금 푼
     *  문항이 아니라 원래 틀렸던 문항이다. 그 원본 id를 넘긴다(§6.4).
     *  넘기지 않으면 방금 푼 문항 자신의 복습 항목을 다룬다. */
    advanceReviewFor?: string;
  },
): Promise<{
  attemptId: number;
  aiCause: ErrorCauseId | null;
  addedToReview: ReviewReason | null;
}> {
  const question = getQuestion(input.questionId);
  if (!question) throw new Error(`알 수 없는 문항: ${input.questionId}`);

  const withCause: NewAttempt = { ...input, aiCause: null };
  const aiCause = inferCause(question, withCause);
  const now = Date.now();
  const conn = await db();

  const result = await conn.runAsync(
    `INSERT INTO english_attempts
       (question_id, type, mode, chosen, correct, seconds, confidence, changes,
        evidence_index, ai_cause, self_cause, reason, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      input.questionId,
      input.type,
      input.mode,
      input.chosen,
      input.correct ? 1 : 0,
      Math.round(input.seconds),
      input.confidence,
      input.changes,
      input.evidenceIndex,
      aiCause,
      input.selfCause,
      input.reason,
      now,
    ],
  );

  // 복습 항목: 이미 있으면 결과만 반영하고, 없으면 사유가 있을 때만 새로 만든다.
  const chainId = options?.advanceReviewFor ?? input.questionId;
  const existing = await getReviewItem(chainId);
  let addedToReview: ReviewReason | null = null;

  if (existing) {
    const updated = applyReview(existing, input.correct, now);
    await upsertReviewItem(updated);
  } else {
    const reason = reviewReasonFor(question, withCause);
    if (reason) {
      await upsertReviewItem(newReviewItem(chainId, reason, now));
      addedToReview = reason;
    }
  }

  return { attemptId: result.lastInsertRowId, aiCause, addedToReview };
}

/** 학생 자기진단을 나중에 붙인다 (기획서 §6.2). */
export async function setSelfCause(attemptId: number, cause: ErrorCauseId): Promise<void> {
  const conn = await db();
  await conn.runAsync(`UPDATE english_attempts SET self_cause = ? WHERE id = ?`, [cause, attemptId]);
}

export async function getAttempts(limit = 500): Promise<Attempt[]> {
  const conn = await db();
  const rows = await conn.getAllAsync<AttemptRow>(
    `SELECT * FROM english_attempts ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );
  return rows.map(toAttempt);
}

export async function getAttemptsForQuestion(questionId: string): Promise<Attempt[]> {
  const conn = await db();
  const rows = await conn.getAllAsync<AttemptRow>(
    `SELECT * FROM english_attempts WHERE question_id = ? ORDER BY created_at DESC`,
    [questionId],
  );
  return rows.map(toAttempt);
}

export async function getSolvedIds(): Promise<Set<string>> {
  const conn = await db();
  const rows = await conn.getAllAsync<{ question_id: string }>(
    `SELECT DISTINCT question_id FROM english_attempts`,
  );
  return new Set(rows.map((r) => r.question_id));
}

export async function getReviewItem(questionId: string): Promise<ReviewItem | null> {
  const conn = await db();
  const row = await conn.getFirstAsync<ReviewRow>(
    `SELECT * FROM english_review_items WHERE question_id = ?`,
    [questionId],
  );
  return row ? toReviewItem(row) : null;
}

export async function getReviewItems(): Promise<ReviewItem[]> {
  const conn = await db();
  const rows = await conn.getAllAsync<ReviewRow>(
    `SELECT * FROM english_review_items ORDER BY due_at ASC`,
  );
  return rows.map(toReviewItem);
}

export async function upsertReviewItem(item: ReviewItem): Promise<void> {
  const conn = await db();
  await conn.runAsync(
    `INSERT INTO english_review_items
       (question_id, stage, due_at, success_count, fail_count, mastered_at,
        starred, note, reason, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(question_id) DO UPDATE SET
       stage = excluded.stage,
       due_at = excluded.due_at,
       success_count = excluded.success_count,
       fail_count = excluded.fail_count,
       mastered_at = excluded.mastered_at,
       starred = excluded.starred,
       note = excluded.note,
       reason = excluded.reason,
       updated_at = excluded.updated_at`,
    [
      item.questionId,
      item.stage,
      item.dueAt,
      item.successCount,
      item.failCount,
      item.masteredAt,
      item.starred ? 1 : 0,
      item.note,
      item.reason,
      item.createdAt,
      item.updatedAt,
    ],
  );
}

/** 학생이 직접 별표를 켜고 끈다 (기획서 §6.1). */
export async function toggleStar(questionId: string): Promise<ReviewItem> {
  const existing = await getReviewItem(questionId);
  const next = existing
    ? { ...existing, starred: !existing.starred, updatedAt: Date.now() }
    : newReviewItem(questionId, 'starred');
  await upsertReviewItem(next);
  return next;
}

export async function setReviewNote(questionId: string, note: string): Promise<void> {
  const existing = await getReviewItem(questionId);
  const base = existing ?? newReviewItem(questionId, 'starred');
  await upsertReviewItem({ ...base, note, updatedAt: Date.now() });
}

export async function removeReviewItem(questionId: string): Promise<void> {
  const conn = await db();
  await conn.runAsync(`DELETE FROM english_review_items WHERE question_id = ?`, [questionId]);
}

export async function saveDiagnostic(result: DiagnosticResult): Promise<void> {
  const conn = await db();
  await conn.runAsync(`INSERT INTO english_diagnostics (taken_at, result) VALUES (?,?)`, [
    result.takenAt,
    JSON.stringify(result),
  ]);
}

export async function getLatestDiagnostic(): Promise<DiagnosticResult | null> {
  const conn = await db();
  const row = await conn.getFirstAsync<{ result: string }>(
    `SELECT result FROM english_diagnostics ORDER BY taken_at DESC LIMIT 1`,
  );
  if (!row) return null;
  try {
    return JSON.parse(row.result) as DiagnosticResult;
  } catch {
    return null;
  }
}

export async function getDiagnosticHistory(): Promise<DiagnosticResult[]> {
  const conn = await db();
  const rows = await conn.getAllAsync<{ result: string }>(
    `SELECT result FROM english_diagnostics ORDER BY taken_at DESC LIMIT 20`,
  );
  const out: DiagnosticResult[] = [];
  for (const row of rows) {
    try {
      out.push(JSON.parse(row.result) as DiagnosticResult);
    } catch {
      // 깨진 기록 하나 때문에 리포트 전체가 막히지 않게 조용히 건너뛴다.
    }
  }
  return out;
}

/** 주간 리포트용 — 최근 n일 기록만 (기획서 §8.3). */
export async function getAttemptsSince(since: number): Promise<Attempt[]> {
  const conn = await db();
  const rows = await conn.getAllAsync<AttemptRow>(
    `SELECT * FROM english_attempts WHERE created_at >= ? ORDER BY created_at DESC`,
    [since],
  );
  return rows.map(toAttempt);
}
