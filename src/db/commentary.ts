import type { SQLiteDatabase } from 'expo-sqlite';

export type CommentaryEntry = {
  id: number;
  bookId: number;
  chapter: number;
  verse: number;
  source: string;
  html: string;
};

export async function getCommentarySources(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ source: string }>(
    `SELECT DISTINCT source FROM commentary ORDER BY source`
  );
  return rows.map((r) => r.source);
}

export async function getCommentaryForVerse(
  db: SQLiteDatabase,
  bookId: number,
  chapter: number,
  verse: number,
  source: string
): Promise<CommentaryEntry | null> {
  const row = await db.getFirstAsync<{
    id: number;
    book_id: number;
    chapter: number;
    verse: number;
    source: string;
    html: string;
  }>(
    `SELECT * FROM commentary WHERE book_id = ? AND chapter = ? AND verse = ? AND source = ?`,
    [bookId, chapter, verse, source]
  );
  if (!row) return null;
  return {
    id: row.id,
    bookId: row.book_id,
    chapter: row.chapter,
    verse: row.verse,
    source: row.source,
    html: row.html,
  };
}

/** Every verse in this chapter that has commentary, so the UI can mark which
 * verses are annotated when browsing a chapter. */
export async function getCommentaryVersesForChapter(
  db: SQLiteDatabase,
  bookId: number,
  chapter: number,
  source: string
): Promise<number[]> {
  const rows = await db.getAllAsync<{ verse: number }>(
    `SELECT verse FROM commentary WHERE book_id = ? AND chapter = ? AND source = ? ORDER BY verse`,
    [bookId, chapter, source]
  );
  return rows.map((r) => r.verse);
}
