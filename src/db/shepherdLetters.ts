import { currentChurchId } from '@/lib/churchScope';
import { supabase } from '@/lib/supabase';

/**
 * 목자의 편지 — **읽기만** 한다.
 *
 * 쓰는 화면은 스마트주보에 있다(`/church/<슬러그>/davidbible/letters`).
 *
 * 교회로 갈린다. 로그인하지 않으면 DB가 모든 교회 편지를 내주므로(왜 그런지는
 * `currentChurchId` 주석) 여기서 교회를 정해서 부르고, 정할 수 없으면 비운다.
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
  const churchId = await currentChurchId();
  if (!churchId) return [];
  const { data, error } = await supabase
    .from('shepherd_letters')
    .select('*')
    .eq('is_published', true)
    .eq('church_id', churchId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

// 홈 화면의 "새 글" 뱃지 판단용 — 최신 글 하나만 가져온다.
export async function getLatestLetter(): Promise<ShepherdLetter | null> {
  const churchId = await currentChurchId();
  if (!churchId) return null;
  const { data, error } = await supabase
    .from('shepherd_letters')
    .select('*')
    .eq('is_published', true)
    .eq('church_id', churchId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function getLetterById(id: string): Promise<ShepherdLetterWithParagraphs | null> {
  // 주소를 직접 열거나 알림을 눌러 들어오는 길 — 목록을 막아도 여기가 열려 있으면
  // 다른 교회 편지가 그대로 보인다.
  const churchId = await currentChurchId();
  if (!churchId) return null;
  const { data, error } = await supabase
    .from('shepherd_letters')
    .select('*')
    .eq('id', id)
    .eq('church_id', churchId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...mapRow(data), paragraphs: splitIntoParagraphs(data.body_text ?? '') };
}

