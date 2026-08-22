import type { SQLiteDatabase } from 'expo-sqlite';

// 'esv' 는 **DB 에 없는 역본**이다. 본문을 앱에 담지 않고 esv.org 로 보내기만
// 하므로 verses 표에는 한 절도 들어 있지 않다. 고르면 링크 안내가 뜬다.
export type Translation = 'krv' | 'ko_ko' | 'en_kjv' | 'open_ko' | 'open_en' | 'esv';

// 개역한글 (ko_ko) is kept out of this user-facing list (superseded by 개역개정)
// but its rows stay in the database so existing notes/highlights that
// reference it still resolve correctly.
//
// 개역개정(krv)이 교회에서 실제로 쓰는 번역이라 맨 앞에 두고 기본값으로 쓴다.
/**
 * 화면에서 고를 수 있는 역본.
 *
 * `linkOnly` 는 **본문이 앱에 없다**는 뜻이다. 저작권이 있는 역본은 복제해 담지
 * 않고 출판사가 공개한 자리로 보낸다 — 개역개정은 대한성서공회, ESV 는 esv.org.
 * 나머지(오픈성경·KJV·Open Bible)는 자유롭게 쓸 수 있어 앱에 담는다. 그래서
 * 인터넷이 없어도 그것들로는 읽힌다.
 */
export const TRANSLATIONS: { code: Translation; label: string; linkOnly?: boolean }[] = [
  { code: 'open_ko', label: '오픈성경' },
  { code: 'krv', label: '개역개정', linkOnly: true },
  { code: 'esv', label: 'ESV', linkOnly: true },
  { code: 'en_kjv', label: 'KJV' },
  { code: 'open_en', label: 'Open Bible' },
];

/** 화면에서 따로 고르지 않았을 때 쓰는 번역 */
// 앱에 본문이 든 역본을 기본으로 둔다. 링크로만 보는 역본을 기본으로 하면
// 화면을 열자마자 빈칸이 보인다.
export const DEFAULT_TRANSLATION: Translation = 'open_ko';

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
