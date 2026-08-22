import { supabase } from '@/lib/supabase';
import { queuePush } from '@/db/push';

export type Notice = {
  id: string;
  title: string;
  bodyText: string;
  isPublished: boolean;
  createdAt: string;
};

export type NoticeEntry = {
  title: string;
  bodyText: string;
};

function mapRow(row: any): Notice {
  return {
    id: row.id,
    title: row.title,
    bodyText: row.body_text ?? '',
    isPublished: row.is_published,
    createdAt: row.created_at,
  };
}

export async function getPublishedNotices(): Promise<Notice[]> {
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

// 홈 화면 한 줄 게시판에 보여줄 최신 제목 하나만 가져온다.
export async function getLatestNotice(): Promise<Notice | null> {
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function getNoticeById(id: string): Promise<Notice | null> {
  const { data, error } = await supabase.from('notices').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function getAllNoticesForAdmin(): Promise<Notice[]> {
  const { data, error } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function insertNotice(entry: NoticeEntry): Promise<{ error?: string }> {
  const { data, error } = await supabase
    .from('notices')
    .insert({ title: entry.title, body_text: entry.bodyText, is_published: true })
    .select('id')
    .maybeSingle();
  if (error) return { error: error.message };

  // 글이 올라간 뒤에 따로 보낸다(shepherdLetters 와 같은 이유).
  await queuePush(
    'notice',
    '알림마당에 새 글이 올라왔어요',
    entry.title,
    data?.id ? `/notice-board/${data.id}` : '/notice-board',
  );
  return {};
}

export async function deleteNotice(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('notices').delete().eq('id', id);
  return { error: error?.message };
}
