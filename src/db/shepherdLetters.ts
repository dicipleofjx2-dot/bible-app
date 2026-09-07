import { supabase } from '@/lib/supabase';

/**
 * 목자의 편지 — **읽기만** 한다.
 *
 * 쓰는 화면은 스마트주보에 있다(`/church/<슬러그>/davidbible/letters`).
 */

export type ShepherdLetter = {
  id: string;
  title: string;
  coverUrl: string;
  bodyText: string;
  imageUrls: string[];
  isPublished: boolean;
  createdAt: string;
};

export type ShepherdLetterWithParagraphs = ShepherdLetter & { paragraphs: string[] };

function mapRow(row: any): ShepherdLetter {
  return {
    id: row.id,
    title: row.title,
    coverUrl: row.cover_url ?? '',
    bodyText: row.body_text ?? '',
    imageUrls: row.image_urls ?? [],
    isPublished: row.is_published,
    createdAt: row.created_at,
  };
}

// books.ts와 동일하게, 문단은 빈 줄(연속 개행) 기준으로 나눈다.
function splitIntoParagraphs(bodyText: string): string[] {
  return bodyText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export async function getPublishedLetters(): Promise<ShepherdLetter[]> {
  const { data, error } = await supabase
    .from('shepherd_letters')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

// 홈 화면의 "새 글" 뱃지 판단용 — 최신 글 하나만 가져온다.
export async function getLatestLetter(): Promise<ShepherdLetter | null> {
  const { data, error } = await supabase
    .from('shepherd_letters')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function getLetterById(id: string): Promise<ShepherdLetterWithParagraphs | null> {
  const { data, error } = await supabase.from('shepherd_letters').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...mapRow(data), paragraphs: splitIntoParagraphs(data.body_text ?? '') };
}

