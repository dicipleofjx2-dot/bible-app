import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  /** 소속 교회. 목자편지·공지·게시판이 이 값으로 갈린다. */
  church_id: string | null;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, church_id')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateUsername(userId: string, username: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ username }).eq('id', userId);
  if (error) throw error;
}

export async function getIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('is_admin').eq('id', userId).single();
  if (error) throw error;
  return !!(data as any)?.is_admin;
}

export type ChurchOption = { id: string; name: string };

/** 고를 수 있는 교회 목록. 스마트주보에서 만든 교회가 그대로 나온다. */
export async function getChurches(): Promise<ChurchOption[]> {
  const { data, error } = await supabase
    .from('churches')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChurchOption[];
}

export async function updateMyChurch(userId: string, churchId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('profiles').update({ church_id: churchId }).eq('id', userId);
  return { error: error?.message };
}
