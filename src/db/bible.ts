import type { SQLiteDatabase } from 'expo-sqlite';

export type Translation = 'ko_ko' | 'en_kjv' | 'open_ko' | 'open_en';

// 개역한글 (ko_ko) is kept out of this user-facing list (superseded by 오픈성경)
// but its rows stay in the database so existing notes/highlights that
// reference it still resolve correctly.
export const TRANSLATIONS: { code: Translation; label: string }[] = [
  { code: 'open_ko', label: '오픈성경' },
  { code: 'en_kjv', label: 'KJV' },
  { code: 'open_en', label: 'Open Bible' },
];

export type Book = {
  id: number;
  abbrev: string;
  name_ko: string;
  name_en: string;
  testament: 'OT' | 'NT';
  book_order: number;
};

export type Verse = {
  id: number;
  book_id: number;
  chapter: number;
  verse: number;
  translation: Translation;
  text: string;
};

export type SearchResult = Verse & {
  book_abbrev: string;
  book_name_ko: string;
  book_name_en: string;
};

export async function getBooks(db: SQLiteDatabase): Promise<Book[]> {
  return db.getAllAsync<Book>(`SELECT * FROM books ORDER BY book_order`);
}

export async function getChapterCount(db: SQLiteDatabase, bookId: number): Promise<number> {
  const row = await db.getFirstAsync<{ maxChapter: number }>(
    `SELECT MAX(chapter) as maxChapter FROM verses WHERE book_id = ?`,
    [bookId]
  );
  return row?.maxChapter ?? 1;
}

export async function getVerse(
  db: SQLiteDatabase,
  bookId: number,
  chapter: number,
  verse: number,
  translation: Translation
): Promise<Verse | null> {
  return db.getFirstAsync<Verse>(
    `SELECT * FROM verses WHERE book_id = ? AND chapter = ? AND verse = ? AND translation = ?`,
    [bookId, chapter, verse, translation]
  );
}

export async function getChapterVerses(
  db: SQLiteDatabase,
  bookId: number,
  chapter: number,
  translation: Translation
): Promise<Verse[]> {
  return db.getAllAsync<Verse>(
    `SELECT * FROM verses WHERE book_id = ? AND chapter = ? AND translation = ? ORDER BY verse`,
    [bookId, chapter, translation]
  );
}

export type QtEntry = {
  date: string;
  bookId: number;
  chapter: number;
  startVerse: number;
  endVerse: number;
  label: string;
};

type QtRow = {
  date: string;
  book_id: number;
  chapter: number;
  start_verse: number;
  end_verse: number;
  label: string;
};

function mapQtRow(row: QtRow): QtEntry {
  return {
    date: row.date,
    bookId: row.book_id,
    chapter: row.chapter,
    startVerse: row.start_verse,
    endVerse: row.end_verse,
    label: row.label,
  };
}

/** Today's curated QT passage, from the bundled qt_schedule table (see
 * scripts/build-bible-db.mjs). Returns null for dates outside the schedule's
 * range — the plan runs 2026-07-13 through 2032-06-28. */
export async function getQtEntryForDate(db: SQLiteDatabase, date: string): Promise<QtEntry | null> {
  const row = await db.getFirstAsync<QtRow>(`SELECT * FROM qt_schedule WHERE date = ?`, [date]);
  return row ? mapQtRow(row) : null;
}

/** The QT day that comes after `date` in the schedule (skipping any gaps). */
export async function getNextQtEntry(db: SQLiteDatabase, date: string): Promise<QtEntry | null> {
  const row = await db.getFirstAsync<QtRow>(
    `SELECT * FROM qt_schedule WHERE date > ? ORDER BY date ASC LIMIT 1`,
    [date]
  );
  return row ? mapQtRow(row) : null;
}

/** The QT day that comes before `date` in the schedule (skipping any gaps). */
export async function getPrevQtEntry(db: SQLiteDatabase, date: string): Promise<QtEntry | null> {
  const row = await db.getFirstAsync<QtRow>(
    `SELECT * FROM qt_schedule WHERE date < ? ORDER BY date DESC LIMIT 1`,
    [date]
  );
  return row ? mapQtRow(row) : null;
}

export async function getFirstQtEntry(db: SQLiteDatabase): Promise<QtEntry | null> {
  const row = await db.getFirstAsync<QtRow>(`SELECT * FROM qt_schedule ORDER BY date ASC LIMIT 1`);
  return row ? mapQtRow(row) : null;
}

export async function getLastQtEntry(db: SQLiteDatabase): Promise<QtEntry | null> {
  const row = await db.getFirstAsync<QtRow>(`SELECT * FROM qt_schedule ORDER BY date DESC LIMIT 1`);
  return row ? mapQtRow(row) : null;
}

export async function getVersesForRange(
  db: SQLiteDatabase,
  bookId: number,
  chapter: number,
  startVerse: number,
  endVerse: number,
  translation: Translation
): Promise<Verse[]> {
  return db.getAllAsync<Verse>(
    `SELECT * FROM verses WHERE book_id = ? AND chapter = ? AND verse BETWEEN ? AND ? AND translation = ? ORDER BY verse`,
    [bookId, chapter, startVerse, endVerse, translation]
  );
}

export async function searchVerses(
  db: SQLiteDatabase,
  query: string,
  translation: Translation,
  limit = 100
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Escape LIKE wildcards in the user's input so they're matched literally.
  const escaped = trimmed.replace(/[%_\\]/g, (ch) => `\\${ch}`);
  const likePattern = `%${escaped}%`;

  return db.getAllAsync<SearchResult>(
    `
    SELECT
      verses.id, verses.book_id, verses.chapter, verses.verse, verses.translation, verses.text,
      books.abbrev as book_abbrev, books.name_ko as book_name_ko, books.name_en as book_name_en
    FROM verses
    JOIN books ON books.id = verses.book_id
    WHERE verses.translation = ? AND verses.text LIKE ? ESCAPE '\\'
    ORDER BY books.book_order, verses.chapter, verses.verse
    LIMIT ?
    `,
    [translation, likePattern, limit]
  );
}
