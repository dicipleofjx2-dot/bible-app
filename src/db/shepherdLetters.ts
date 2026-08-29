import { supabase } from '@/lib/supabase';
import { queuePush } from '@/db/push';
import { STORAGE_CACHE_SECONDS } from '@/lib/storageCache';

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

export type ShepherdLetterEntry = {
  title: string;
  coverUrl: string;
  bodyText: string;
  imageUrls: string[];
};

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

export async function getAllLettersForAdmin(): Promise<ShepherdLetter[]> {
  const { data, error } = await supabase
    .from('shepherd_letters')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function insertLetter(entry: ShepherdLetterEntry): Promise<{ error?: string }> {
  const { data, error } = await supabase
    .from('shepherd_letters')
    .insert({
      title: entry.title,
      cover_url: entry.coverUrl || null,
      body_text: entry.bodyText,
      image_urls: entry.imageUrls,
      is_published: true,
    })
    .select('id')
    .maybeSingle();
  if (error) return { error: error.message };

  // 알림은 글이 올라간 **뒤에** 따로 보낸다. 한 몸으로 묶으면 알림이 실패할 때
  // 글까지 못 올리게 된다 — 글은 올라갔는데 알림만 못 간 것이 훨씬 낫다.
  await queuePush(
    'shepherd_letter',
    '목자의 편지가 도착했어요',
    entry.title,
    data?.id ? `/shepherd-letters/${data.id}` : '/shepherd-letters',
  );
  return {};
}

export async function deleteLetter(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('shepherd_letters').delete().eq('id', id);
  return { error: error?.message };
}

// book-covers 업로드(uploadBookCover, src/db/library.ts)와 동일한 방식 —
// fetch(uri) 후 ArrayBuffer로 변환해 올린다. 커버 사진/갤러리 사진 모두
// 같은 shepherd-letter-images 버킷을 쓰되 경로 접두어로 구분한다.
async function uploadImage(
  uri: string,
  mimeType: string | undefined,
  pathPrefix: 'covers' | 'gallery',
): Promise<{ url?: string; error?: string }> {
  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const ext = mimeType?.split('/')[1] ?? 'jpg';
    const filePath = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('shepherd-letter-images')
      .upload(filePath, arrayBuffer, {
        contentType: mimeType ?? 'image/jpeg',
        cacheControl: STORAGE_CACHE_SECONDS,
      });
    if (uploadError) return { error: uploadError.message };

    const { data } = supabase.storage.from('shepherd-letter-images').getPublicUrl(filePath);
    return { url: data.publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '이미지 업로드에 실패했습니다.' };
  }
}

export function uploadLetterCoverImage(uri: string, mimeType?: string) {
  return uploadImage(uri, mimeType, 'covers');
}

export function uploadLetterGalleryImage(uri: string, mimeType?: string) {
  return uploadImage(uri, mimeType, 'gallery');
}
