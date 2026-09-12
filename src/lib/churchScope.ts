import { supabase } from '@/lib/supabase';

/**
 * 교회로 갈리는 자료(목자의 편지·알림마당 …)를 부를 때 쓰는 울타리.
 *
 * DB 정책(`supabase/migrations/0038_multi_church.sql` 의 `*_church_scope`)은
 * **로그인한 사람만** 자기 교회로 가른다. 로그아웃 상태(`auth.uid() is null`)는
 * 일부러 열어 두었다 — 교회 홈페이지가 anon 키로 목자편지·게시판을 읽어 가고,
 * 그쪽은 교회를 스스로 걸러서 부르기 때문이다.
 *
 * 그래서 **앱이 로그아웃 상태로 부르면 모든 교회 것이 섞여 나온다**(새부대교회
 * 편지와 시온성교회 편지가 한 목록에). 로그인하지 않은 앱은 어느 교회인지 알
 * 길이 없으니, 그때는 아무것도 보여 주지 않는다 — 로그인하면 자기 교회 것만
 * 보인다.
 *
 * 이 판단은 **여기 한 곳에만** 둔다. 화면이나 다른 db 모듈에서 따로 세지 말고
 * 이 함수를 쓸 것 — 같은 규칙이 두 군데 있으면 한쪽만 고치게 된다.
 *
 * 일부러 캐시하지 않는다. 마이페이지에서 소속 교회를 바꿀 수 있어서, 캐시하면
 * 바꾼 뒤에도 옛 교회 편지가 남는다. `profiles` 를 기본키로 한 번 읽는 값이다.
 */
export async function currentChurchId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { data } = await supabase.from('profiles').select('church_id').eq('id', userId).maybeSingle();
  return (data as { church_id: string | null } | null)?.church_id ?? null;
}
