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

export async function getCommentarySources(): Promise<string[]> {
  const { data, error } = await supabase.from('commentary').select('source');
  if (error) throw error;
  return [...new Set((data ?? []).map((r: any) => r.source))].sort();
}

export async function getCommentaryForVerse(
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
  if (error) throw error;
  return data ? mapRow(data) : null;
}

/** Every verse in this chapter that has commentary, so the UI can mark which
 * verses are annotated when browsing a chapter. */
export async function getCommentaryVersesForChapter(
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
  if (error) throw error;
  return (data ?? []).map((r: any) => r.verse);
}
