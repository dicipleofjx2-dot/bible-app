import type { SQLiteDatabase } from 'expo-sqlite';

export type Translation = 'ko_ko' | 'en_kjv';

export const TRANSLATIONS: { code: Translation; label: string }[] = [
  { code: 'ko_ko', label: '개역한글' },
  { code: 'en_kjv', label: 'KJV' },
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

async function getTotalVerseCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM verses WHERE translation = 'ko_ko'`
  );
  return row?.count ?? 0;
}

/** Verses shown together as one QT-style reading unit, not a single isolated verse. */
const PASSAGE_UNIT_SIZE = 6;

async function getPassageAtIndex(
  db: SQLiteDatabase,
  index: number,
  translation: Translation
): Promise<Verse[]> {
  const coords = await db.getFirstAsync<{ book_id: number; chapter: number; verse: number }>(
    `SELECT book_id, chapter, verse FROM verses WHERE translation = 'ko_ko' ORDER BY book_id, chapter, verse LIMIT 1 OFFSET ?`,
    [index]
  );
  if (!coords) return [];

  const chapterVerses = await getChapterVerses(db, coords.book_id, coords.chapter, translation);
  if (chapterVerses.length === 0) return [];

  const anchorPos = chapterVerses.findIndex((v) => v.verse === coords.verse);
  const start = Math.max(0, Math.min(anchorPos, chapterVerses.length - PASSAGE_UNIT_SIZE));
  return chapterVerses.slice(start, start + PASSAGE_UNIT_SIZE);
}

/** Deterministic "passage of the day" — same passage across translations, changes daily. */
export async function getPassageOfDay(db: SQLiteDatabase, translation: Translation): Promise<Verse[]> {
  const total = await getTotalVerseCount(db);
  if (total === 0) return [];

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return getPassageAtIndex(db, dayOfYear % total, translation);
}

/** A fresh random passage, e.g. for a "다른 말씀 보기" refresh action. */
export async function getRandomPassage(db: SQLiteDatabase, translation: Translation): Promise<Verse[]> {
  const total = await getTotalVerseCount(db);
  if (total === 0) return [];

  return getPassageAtIndex(db, Math.floor(Math.random() * total), translation);
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
