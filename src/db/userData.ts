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

export async function getAllMarks(): Promise<VerseMark[]> {
  const db = await getUserDb();
  return db.getAllAsync<VerseMark>(`SELECT * FROM verse_marks ORDER BY updated_at DESC`);
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
