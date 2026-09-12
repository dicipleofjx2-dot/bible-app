import { currentChurchId } from '@/lib/churchScope';
import { supabase } from '@/lib/supabase';

/**
 * 알림마당 — **읽기만** 한다.
 *
 * 목자의 편지와 똑같이 교회로 갈린다 — 로그인하지 않으면 DB가 모든 교회 공지를
 * 내주므로 여기서 교회를 정해서 부른다(`@/lib/churchScope`).
 *
 * 글을 쓰는 화면은 스마트주보로 옮겼다(`/church/<슬러그>/davidbible/notices`).
 * 여기에 쓰기 함수를 다시 두지 말 것 — 같은 일을 두 군데서 하면 한쪽만 고치게 되고,
 * 알림을 두 번 보내거나 한쪽만 교회를 못 채우는 일이 생긴다.
 */

export type Notice = {
  id: string;
  title: string;
  bodyText: string;
  isPublished: boolean;
  createdAt: string;
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
  const churchId = await currentChurchId();
  if (!churchId) return [];
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('is_published', true)
    .eq('church_id', churchId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

// 홈 화면 한 줄 게시판에 보여줄 최신 제목 하나만 가져온다.
export async function getLatestNotice(): Promise<Notice | null> {
  const churchId = await currentChurchId();
  if (!churchId) return null;
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('is_published', true)
    .eq('church_id', churchId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function getNoticeById(id: string): Promise<Notice | null> {
  const churchId = await currentChurchId();
  if (!churchId) return null;
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('id', id)
    .eq('church_id', churchId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

