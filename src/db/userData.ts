import * as SQLite from 'expo-sqlite';

import type { Translation } from '@/db/bible';

export type HighlightColor =
  | 'yellow'
  | 'green'
  | 'blue'
  | 'pink'
  | 'commentary-yellow'
  | 'commentary-green'
  | 'commentary-blue'
  | 'commentary-pink';

/** The 4 base tag colors (no "commentary-" pale variant) — used to color-tag
 * a whole entry (영성일기 diary entries, 샬롬기도단 posts/comments), as
 * opposed to `HighlightColor` which also covers verse/commentary text
 * highlighting. */
export type TagColor = 'yellow' | 'green' | 'blue' | 'pink';

export type VerseMark = {
  id: number;
  book_id: number;
  chapter: number;
  verse: number;
  translation: Translation;
  color: HighlightColor | null;
  note: string | null;
  updated_at: number;
};

export type VerseMarkWithBook = VerseMark & {
  book_abbrev: string;
  book_name_ko: string;
  verse_text: string;
};

let dbPromise: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;

function getUserDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('user.db').then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS verse_marks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          chapter INTEGER NOT NULL,
          verse INTEGER NOT NULL,
          translation TEXT NOT NULL,
          color TEXT,
          note TEXT,
          updated_at INTEGER NOT NULL,
          UNIQUE(book_id, chapter, verse, translation)
        );
        CREATE TABLE IF NOT EXISTS meditation_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL UNIQUE,
          book_id INTEGER NOT NULL,
          chapter INTEGER NOT NULL,
          start_verse INTEGER NOT NULL,
          end_verse INTEGER NOT NULL,
          label TEXT NOT NULL,
          note TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS commentary_text_highlights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          book_id INTEGER NOT NULL,
          chapter INTEGER NOT NULL,
          verse INTEGER NOT NULL,
          source TEXT NOT NULL,
          start_offset INTEGER NOT NULL,
          end_offset INTEGER NOT NULL,
          color TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS diary_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL UNIQUE,
          content TEXT NOT NULL,
          color TEXT,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS priority_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          title TEXT NOT NULL,
          priority INTEGER NOT NULL,
          done INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS finance_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          type TEXT NOT NULL,
          category TEXT NOT NULL,
          amount INTEGER NOT NULL,
          memo TEXT,
          updated_at INTEGER NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

export async function getMarksForChapter(
  bookId: number,
  chapter: number,
  translation: Translation
): Promise<VerseMark[]> {
  const db = await getUserDb();
  return db.getAllAsync<VerseMark>(
    `SELECT * FROM verse_marks WHERE book_id = ? AND chapter = ? AND translation = ?`,
    [bookId, chapter, translation]
  );
}

// Excludes commentary highlights (color starting "commentary-", see
// COMMENTARY_HIGHLIGHT_COLORS below) — those are saved from the 주석 tab and
// are kept out of 암송구절 intentionally, so the two stay unlinked.
export async function getAllMarks(): Promise<VerseMark[]> {
  const db = await getUserDb();
  return db.getAllAsync<VerseMark>(
    `SELECT * FROM verse_marks WHERE color IS NULL OR color NOT LIKE 'commentary-%' ORDER BY updated_at DESC`
  );
}

export async function upsertMark(mark: {
  bookId: number;
  chapter: number;
  verse: number;
  translation: Translation;
  color: HighlightColor | null;
  note: string | null;
}): Promise<void> {
  const db = await getUserDb();
  if (!mark.color && !mark.note) {
    await db.runAsync(
      `DELETE FROM verse_marks WHERE book_id = ? AND chapter = ? AND verse = ? AND translation = ?`,
      [mark.bookId, mark.chapter, mark.verse, mark.translation]
    );
    return;
  }
  await db.runAsync(
    `
    INSERT INTO verse_marks (book_id, chapter, verse, translation, color, note, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(book_id, chapter, verse, translation)
    DO UPDATE SET color = excluded.color, note = excluded.note, updated_at = excluded.updated_at
    `,
    [mark.bookId, mark.chapter, mark.verse, mark.translation, mark.color, mark.note, Date.now()]
  );
}

export async function deleteMark(id: number): Promise<void> {
  const db = await getUserDb();
  await db.runAsync(`DELETE FROM verse_marks WHERE id = ?`, [id]);
}

// ── 말씀노트 (meditation notes) ────────────────────────────────────────────
// Kept in their own table, deliberately separate from verse_marks/암송구절 —
// see src/app/(tabs)/meditation.tsx, which writes here instead of upsertMark.
export type MeditationNote = {
  id: number;
  date: string;
  book_id: number;
  chapter: number;
  start_verse: number;
  end_verse: number;
  label: string;
  note: string;
  updated_at: number;
};

export async function getMeditationNote(date: string): Promise<MeditationNote | null> {
  const db = await getUserDb();
  return db.getFirstAsync<MeditationNote>(`SELECT * FROM meditation_notes WHERE date = ?`, [date]);
}

export async function getAllMeditationNotes(): Promise<MeditationNote[]> {
  const db = await getUserDb();
  return db.getAllAsync<MeditationNote>(`SELECT * FROM meditation_notes ORDER BY date DESC`);
}

export async function upsertMeditationNote(entry: {
  date: string;
  bookId: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
  label: string;
  note: string;
}): Promise<void> {
  const db = await getUserDb();
  if (!entry.note.trim()) {
    await db.runAsync(`DELETE FROM meditation_notes WHERE date = ?`, [entry.date]);
    return;
  }
  await db.runAsync(
    `
    INSERT INTO meditation_notes (date, book_id, chapter, start_verse, end_verse, label, note, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date)
    DO UPDATE SET book_id = excluded.book_id, chapter = excluded.chapter, start_verse = excluded.start_verse,
      end_verse = excluded.end_verse, label = excluded.label, note = excluded.note, updated_at = excluded.updated_at
    `,
    [
      entry.date,
      entry.bookId,
      entry.chapter,
      entry.startVerse,
      entry.endVerse,
      entry.label,
      entry.note.trim(),
      Date.now(),
    ]
  );
}

export async function deleteMeditationNote(id: number): Promise<void> {
  const db = await getUserDb();
  await db.runAsync(`DELETE FROM meditation_notes WHERE id = ?`, [id]);
}

export const HIGHLIGHT_COLORS: { code: HighlightColor; hex: string }[] = [
  { code: 'yellow', hex: '#F5D90A' },
  { code: 'green', hex: '#8CE99A' },
  { code: 'blue', hex: '#A5D8FF' },
  { code: 'pink', hex: '#FFC9DE' },
];

/** Paler variant of the same four hues, used specifically for commentary
 * highlights so they read as visually distinct from regular verse
 * highlights at a glance (see src/app/commentary.tsx). */
export const COMMENTARY_HIGHLIGHT_COLORS: { code: HighlightColor; hex: string }[] = [
  { code: 'commentary-yellow', hex: '#FFF9DB' },
  { code: 'commentary-green', hex: '#EBFBEE' },
  { code: 'commentary-blue', hex: '#E7F5FF' },
  { code: 'commentary-pink', hex: '#FFF0F6' },
];

// ── 주석 텍스트 블록 하이라이트 ─────────────────────────────────────────────
// Separate from verse_marks/COMMENTARY_HIGHLIGHT_COLORS above (which mark an
// entire verse+commentary as one unit) — this stores arbitrary user-selected
// text ranges *within* one commentary entry's plain text, keyed by character
// offset. See src/app/(tabs)/commentary.tsx for the selection UI.
export type CommentaryTextHighlight = {
  id: number;
  book_id: number;
  chapter: number;
  verse: number;
  source: string;
  start_offset: number;
  end_offset: number;
  color: HighlightColor;
  updated_at: number;
};

export async function getCommentaryTextHighlights(
  bookId: number,
  chapter: number,
  verse: number,
  source: string
): Promise<CommentaryTextHighlight[]> {
  const db = await getUserDb();
  return db.getAllAsync<CommentaryTextHighlight>(
    `SELECT * FROM commentary_text_highlights
     WHERE book_id = ? AND chapter = ? AND verse = ? AND source = ?
     ORDER BY start_offset ASC`,
    [bookId, chapter, verse, source]
  );
}

export async function addCommentaryTextHighlight(entry: {
  bookId: number;
  chapter: number;
  verse: number;
  source: string;
  start: number;
  end: number;
  color: HighlightColor;
}): Promise<void> {
  const db = await getUserDb();
  await db.runAsync(
    `INSERT INTO commentary_text_highlights
       (book_id, chapter, verse, source, start_offset, end_offset, color, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [entry.bookId, entry.chapter, entry.verse, entry.source, entry.start, entry.end, entry.color, Date.now()]
  );
}

export async function updateCommentaryTextHighlightColor(id: number, color: HighlightColor): Promise<void> {
  const db = await getUserDb();
  await db.runAsync(`UPDATE commentary_text_highlights SET color = ?, updated_at = ? WHERE id = ?`, [
    color,
    Date.now(),
    id,
  ]);
}

export async function deleteCommentaryTextHighlight(id: number): Promise<void> {
  const db = await getUserDb();
  await db.runAsync(`DELETE FROM commentary_text_highlights WHERE id = ?`, [id]);
}

// ── 영성일기 (diary) ────────────────────────────────────────────────────────
export type DiaryEntry = {
  id: number;
  date: string;
  content: string;
  color: TagColor | null;
  updated_at: number;
};

export async function getDiaryEntry(date: string): Promise<DiaryEntry | null> {
  const db = await getUserDb();
  return db.getFirstAsync<DiaryEntry>(`SELECT * FROM diary_entries WHERE date = ?`, [date]);
}

export async function getAllDiaryEntries(): Promise<DiaryEntry[]> {
  const db = await getUserDb();
  return db.getAllAsync<DiaryEntry>(`SELECT * FROM diary_entries ORDER BY date DESC`);
}

export async function upsertDiaryEntry(entry: {
  date: string;
  content: string;
  color: TagColor | null;
}): Promise<void> {
  const db = await getUserDb();
  if (!entry.content.trim()) {
    await db.runAsync(`DELETE FROM diary_entries WHERE date = ?`, [entry.date]);
    return;
  }
  await db.runAsync(
    `
    INSERT INTO diary_entries (date, content, color, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET content = excluded.content, color = excluded.color, updated_at = excluded.updated_at
    `,
    [entry.date, entry.content.trim(), entry.color, Date.now()]
  );
}

export async function deleteDiaryEntry(id: number): Promise<void> {
  const db = await getUserDb();
  await db.runAsync(`DELETE FROM diary_entries WHERE id = ?`, [id]);
}

// ── 우선순위 (priority tasks) ───────────────────────────────────────────────
export type PriorityLevel = number; // 1(최우선) ~ 10(최저) — see priorities.tsx for display

export type PriorityTask = {
  id: number;
  date: string;
  title: string;
  priority: PriorityLevel;
  done: number;
  updated_at: number;
};

export async function getPriorityTasks(date: string): Promise<PriorityTask[]> {
  const db = await getUserDb();
  return db.getAllAsync<PriorityTask>(
    `SELECT * FROM priority_tasks WHERE date = ? ORDER BY done ASC, priority ASC, updated_at ASC`,
    [date]
  );
}

/** Distinct dates that have at least one task — used to mark days on the
 * embedded calendar in priorities.tsx. */
export async function getPriorityTaskDates(): Promise<string[]> {
  const db = await getUserDb();
  const rows = await db.getAllAsync<{ date: string }>(`SELECT DISTINCT date FROM priority_tasks`);
  return rows.map((r) => r.date);
}

export async function addPriorityTask(task: {
  date: string;
  title: string;
  priority: PriorityLevel;
}): Promise<void> {
  const db = await getUserDb();
  await db.runAsync(
    `INSERT INTO priority_tasks (date, title, priority, done, updated_at) VALUES (?, ?, ?, 0, ?)`,
    [task.date, task.title.trim(), task.priority, Date.now()]
  );
}

export async function updatePriorityTask(
  id: number,
  changes: { title?: string; priority?: PriorityLevel; done?: boolean }
): Promise<void> {
  const db = await getUserDb();
  const existing = await db.getFirstAsync<PriorityTask>(`SELECT * FROM priority_tasks WHERE id = ?`, [id]);
  if (!existing) return;
  await db.runAsync(
    `UPDATE priority_tasks SET title = ?, priority = ?, done = ?, updated_at = ? WHERE id = ?`,
    [
      changes.title !== undefined ? changes.title.trim() : existing.title,
      changes.priority !== undefined ? changes.priority : existing.priority,
      changes.done !== undefined ? (changes.done ? 1 : 0) : existing.done,
      Date.now(),
      id,
    ]
  );
}

export async function deletePriorityTask(id: number): Promise<void> {
  const db = await getUserDb();
  await db.runAsync(`DELETE FROM priority_tasks WHERE id = ?`, [id]);
}

// ── 천국재정 (household ledger) ─────────────────────────────────────────────
export type FinanceType = 'income' | 'expense';

export type FinanceEntry = {
  id: number;
  date: string;
  type: FinanceType;
  category: string;
  amount: number;
  memo: string | null;
  updated_at: number;
};

export async function getFinanceEntries(date: string): Promise<FinanceEntry[]> {
  const db = await getUserDb();
  return db.getAllAsync<FinanceEntry>(
    `SELECT * FROM finance_entries WHERE date = ? ORDER BY updated_at DESC`,
    [date]
  );
}

export async function getAllFinanceEntries(): Promise<FinanceEntry[]> {
  const db = await getUserDb();
  return db.getAllAsync<FinanceEntry>(`SELECT * FROM finance_entries ORDER BY date DESC, updated_at DESC`);
}

export async function addFinanceEntry(entry: {
  date: string;
  type: FinanceType;
  category: string;
  amount: number;
  memo: string;
}): Promise<void> {
  const db = await getUserDb();
  await db.runAsync(
    `INSERT INTO finance_entries (date, type, category, amount, memo, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [entry.date, entry.type, entry.category.trim(), entry.amount, entry.memo.trim() || null, Date.now()]
  );
}

export async function deleteFinanceEntry(id: number): Promise<void> {
  const db = await getUserDb();
  await db.runAsync(`DELETE FROM finance_entries WHERE id = ?`, [id]);
}
