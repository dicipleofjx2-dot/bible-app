import { supabase } from '@/lib/supabase';

export type CommentaryEntry = {
  id: number;
  bookId: number;
  chapter: number;
  verse: number;
  source: string;
  html: string;
};

function mapRow(row: any): CommentaryEntry {
  return {
    id: row.id,
    bookId: row.book_id,
    chapter: row.chapter,
    verse: row.verse,
    source: row.source,
    html: row.html,
  };
}

// Commentary content is static/admin-seeded, so all three caches below live
// for the lifetime of the app (never invalidated) — mirrors the
// plansCachePromise pattern in db/plans.ts. Without this, every tab
// mount/verse tap re-hit Supabase even for content already fetched once.

let sourcesCachePromise: Promise<string[]> | null = null;

async function fetchCommentarySources(): Promise<string[]> {
  const { data, error } = await supabase.from('commentary').select('source');
  if (error) {
    sourcesCachePromise = null;
    throw error;
  }
  return [...new Set((data ?? []).map((r: any) => r.source))].sort();
}

export function getCommentarySources(): Promise<string[]> {
  if (!sourcesCachePromise) {
    sourcesCachePromise = fetchCommentarySources();
  }
  return sourcesCachePromise;
}

const verseCache = new Map<string, Promise<CommentaryEntry | null>>();

async function fetchCommentaryForVerse(
  key: string,
  bookId: number,
  chapter: number,
  verse: number,
  source: string
): Promise<CommentaryEntry | null> {
  const { data, error } = await supabase
    .from('commentary')
    .select('*')
    .eq('book_id', bookId)
    .eq('chapter', chapter)
    .eq('verse', verse)
    .eq('source', source)
    .maybeSingle();
  if (error) {
    verseCache.delete(key);
    throw error;
  }
  return data ? mapRow(data) : null;
}

export function getCommentaryForVerse(
  bookId: number,
  chapter: number,
  verse: number,
  source: string
): Promise<CommentaryEntry | null> {
  const key = `${bookId}-${chapter}-${verse}-${source}`;
  let cached = verseCache.get(key);
  if (!cached) {
    cached = fetchCommentaryForVerse(key, bookId, chapter, verse, source);
    verseCache.set(key, cached);
  }
  return cached;
}

/** Every verse in this chapter that has commentary, so the UI can mark which
 * verses are annotated when browsing a chapter. */
const chapterVersesCache = new Map<string, Promise<number[]>>();

async function fetchCommentaryVersesForChapter(
  key: string,
  bookId: number,
  chapter: number,
  source: string
): Promise<number[]> {
  const { data, error } = await supabase
    .from('commentary')
    .select('verse')
    .eq('book_id', bookId)
    .eq('chapter', chapter)
    .eq('source', source)
    .order('verse');
  if (error) {
    chapterVersesCache.delete(key);
    throw error;
  }
  return (data ?? []).map((r: any) => r.verse);
}

export function getCommentaryVersesForChapter(
  bookId: number,
  chapter: number,
  source: string
): Promise<number[]> {
  const key = `${bookId}-${chapter}-${source}`;
  let cached = chapterVersesCache.get(key);
  if (!cached) {
    cached = fetchCommentaryVersesForChapter(key, bookId, chapter, source);
    chapterVersesCache.set(key, cached);
  }
  return cached;
}
