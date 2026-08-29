import { supabase } from '@/lib/supabase';

/**
 * 예전 계정의 기록 이어받기.
 *
 * 이메일로 가입해 쓰다가 카카오로 들어온 분들의 기록이 갈라진다 — 카카오에
 * 걸린 이메일이 가입 이메일과 다르면 Supabase 가 다른 사람으로 본다. 실제로
 * 세 분이 통독 진도를 잃었다(0067 주석 참고).
 *
 * 두 단계로 나눈 이유는 하나뿐이다 — **남의 기록을 못 가져가게** 하려고.
 * 이메일만 적어 이어 주면 남의 이메일을 적어 그 사람의 통독 기록·포인트·
 * 기도제목을 통째로 가져갈 수 있다. 그래서 예전 계정으로 로그인해 본 사람만
 * 실제로 잇는다.
 */

export type LinkRequest = {
  id: string;
  oldEmail: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'expired';
  createdAt: string;
  movedRows: number | null;
};

/**
 * 안내를 띄울지. 지금 계정에 기록이 하나도 없을 때만 true.
 *
 * 이메일을 받아 "그 계정 있나요?"를 묻게 두지 않는다. 그러면 아무 이메일이나
 * 넣어 가입 여부를 캐낼 수 있다.
 */
export async function needsAccountLink(): Promise<boolean> {
  const { data, error } = await supabase.rpc('needs_account_link');
  if (error) return false;
  return data === true;
}

/** 신청만 넣는다. 이 단계에서는 아무것도 옮겨지지 않는다. */
export async function requestAccountLink(
  userId: string,
  oldEmail: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('account_link_requests')
    .insert({ new_user_id: userId, old_email: oldEmail.trim().toLowerCase() });
  return { error: error?.message ?? null };
}

/** 내가 낸 신청들. 카카오 계정으로 봤을 때 보인다. */
export async function getMyLinkRequests(): Promise<LinkRequest[]> {
  const { data, error } = await supabase
    .from('account_link_requests')
    .select('id, old_email, status, created_at, moved_rows')
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) return [];
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    oldEmail: String(r.old_email ?? ''),
    status: (r.status as LinkRequest['status']) ?? 'pending',
    createdAt: String(r.created_at),
    movedRows: (r.moved_rows as number | null) ?? null,
  }));
}

/**
 * 실제로 옮긴다. **예전 계정으로 로그인한 상태에서 불러야 한다.**
 *
 * 지금 로그인한 계정의 이메일이 신청서에 적힌 것과 같은지 DB 가 다시 본다.
 * 그래서 남의 신청서를 눌러도 아무 일이 일어나지 않는다.
 */
export async function confirmAccountLink(requestId: string): Promise<{ error: string | null; moved?: number }> {
  const { data, error } = await supabase.rpc('confirm_account_link', { request_id: requestId });
  if (error) return { error: error.message };
  return { error: null, moved: Number(data ?? 0) };
}

/**
 * 예전 계정으로 로그인했을 때, 그 이메일 앞으로 들어온 신청을 찾는다.
 *
 * RLS 는 "내가 낸 신청"만 보여 주므로(new_user_id = auth.uid()), 예전 계정으로는
 * 목록을 읽을 수 없다. 그래서 신청 번호를 손으로 옮겨 적게 하는 대신, 앱이
 * 신청을 넣을 때 그 번호를 기기에 적어 두고 여기서 쓴다.
 */
export const PENDING_LINK_KEY = 'bibleapp.pendingAccountLink';
