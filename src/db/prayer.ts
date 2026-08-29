import { supabase } from '@/lib/supabase';

export { getIsAdmin } from '@/db/profile';

export type PrayerRequest = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: string;
};

export type PrayerComment = {
  id: string;
  prayer_request_id: string;
  user_id: string;
  body: string;
  hidden: boolean;
  created_at: string;
  author: string;
};

/**
 * 글쓴이 이름표.
 *
 * profiles.username 에는 이메일이 그대로 들어 있는 계정이 많아서(82명 중 65명),
 * 그것만 쓰면 목록에 `hong9885@naver.com` 같은 것이 늘어선다. 실제로 그 때문에
 * 자기가 올린 기도제목을 못 알아보고 "안 올라간다"고 하신 일이 있었다.
 *
 * 교적 실명은 members 에 있지만 그 표는 교적 열람 권한이 있어야 읽힌다. 그래서
 * **글을 올린 사람의 이름만** 돌려주는 함수를 지난다(0066).
 */
async function authorNames(): Promise<Map<string, string>> {
  const { data, error } = await supabase.rpc('prayer_author_names');
  if (error || !Array.isArray(data)) return new Map();
  return new Map(
    (data as { user_id: string; display_name: string }[]).map((r) => [r.user_id, r.display_name]),
  );
}

export async function getPrayerRequests(): Promise<PrayerRequest[]> {
  const { data, error } = await supabase
    .from('prayer_requests')
    .select('id, user_id, body, created_at, profiles(username)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  // 이름표를 못 받아도 목록은 뜬다 — 예전처럼 username 으로 내려간다.
  const names = await authorNames();
  return (data ?? []).map((row: any) => ({
    ...row,
    author: names.get(row.user_id) ?? row.profiles?.username ?? '익명',
  }));
}

export async function getPrayerRequest(id: string): Promise<PrayerRequest | null> {
  const { data, error } = await supabase
    .from('prayer_requests')
    .select('id, user_id, body, created_at, profiles(username)')
    .eq('id', id)
    .single();
  if (error) throw error;
  if (!data) return null;
  const row = data as any;
  return {
    ...row,
    author: row.profiles?.username ?? '익명',
  };
}

export async function createPrayerRequest(userId: string, body: string): Promise<void> {
  const { error } = await supabase.from('prayer_requests').insert({ user_id: userId, body });
  if (error) throw error;
}

/** RLS restricts this to the request's own author (see 0015_prayer_group.sql). */
export async function deletePrayerRequest(id: string): Promise<void> {
  const { error } = await supabase.from('prayer_requests').delete().eq('id', id);
  if (error) throw error;
}

export async function getPrayerComments(prayerRequestId: string): Promise<PrayerComment[]> {
  const { data, error } = await supabase
    .from('prayer_comments')
    .select('id, prayer_request_id, user_id, body, hidden, created_at, profiles(username)')
    .eq('prayer_request_id', prayerRequestId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const names = await authorNames();
  return (data ?? []).map((row: any) => ({
    ...row,
    author: names.get(row.user_id) ?? row.profiles?.username ?? '익명',
  }));
}

export async function addPrayerComment(prayerRequestId: string, userId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('prayer_comments')
    .insert({ prayer_request_id: prayerRequestId, user_id: userId, body });
  if (error) throw error;
}

/** RLS restricts this to the comment's own author, the prayer request's
 * author, or an admin (see 0015_prayer_group.sql). */
export async function setPrayerCommentHidden(commentId: string, hidden: boolean): Promise<void> {
  const { error } = await supabase.from('prayer_comments').update({ hidden }).eq('id', commentId);
  if (error) throw error;
}

/** RLS restricts this to the comment's own author, the prayer request's
 * author, or an admin (see 0015_prayer_group.sql). */
export async function deletePrayerComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('prayer_comments').delete().eq('id', commentId);
  if (error) throw error;
}
