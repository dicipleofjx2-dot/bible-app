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

export async function getPrayerRequests(): Promise<PrayerRequest[]> {
  const { data, error } = await supabase
    .from('prayer_requests')
    .select('id, user_id, body, created_at, profiles(username)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    author: row.profiles?.username ?? '익명',
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
  return (data ?? []).map((row: any) => ({
    ...row,
    author: row.profiles?.username ?? '익명',
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
