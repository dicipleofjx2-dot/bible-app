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

/** 내 소속 교회 이름. 못 찾으면 null. */
export async function getMyChurch(churchId: string | null): Promise<ChurchOption | null> {
  if (!churchId) return null;
  const { data, error } = await supabase
    .from('churches')
    .select('id, name')
    .eq('id', churchId)
    .maybeSingle();
  if (error) return null;
  return (data as ChurchOption) ?? null;
}

/**
 * 초대 코드를 받아들여 그 교회 사람이 된다.
 *
 * 예전에는 교회 목록을 그대로 보여 주고 아무 교회나 고르게 했다. 교회가 하나일
 * 때는 편했지만, 여러 교회가 들어오면 그건 남의 교회 목자편지·기도제목·게시판을
 * 읽는 길이 된다. 이제 소속은 초대나 관리자 승인으로만 바뀐다 — 화면뿐 아니라
 * 데이터베이스에서도 막혀 있다(0026_platform.sql의 profiles_guard_church_change).
 */
export async function redeemInviteCode(code: string): Promise<{ error?: string }> {
  const normalized = code.trim().toUpperCase().replace(/[\s-]/g, '');
  if (!normalized) return { error: '초대 코드를 넣어 주세요.' };
  const { error } = await supabase.rpc('redeem_invite', { invite_code: normalized });
  return { error: error?.message };
}
