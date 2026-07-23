import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
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
