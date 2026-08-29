-- 예전에 쓰던 계정의 기록을 이어받는다.
--
-- ── 왜 필요한가 ─────────────────────────────────────────────────────
-- 이 앱은 이메일 가입을 닫고 카카오 하나로 모았다. 그런데 Supabase 는 **이메일이
-- 같을 때만** 카카오를 기존 계정에 붙여 준다. 카카오에 걸린 이메일이 예전 가입
-- 이메일과 다르면 같은 사람인 줄 모르고 새 계정이 생긴다.
--
-- 실제로 벌어진 일:
--   이경미  klovemi80@gmail.com   → klovemi80@naver.com   (기록 30행이 갈림)
--   홍은경  hong9885@naver.com    → hong9885@kakao.com    (기도제목까지 갈림)
--   정재연  jaeyeon7151@gmail.com → rainbow9134@naver.com (통독 9일치가 갈림)
--
-- 정재연 님은 이메일 앞부분마저 완전히 달라서, 관리자가 목록을 훑어도 같은
-- 사람인 줄 알 수가 없었다. **사람이 눈으로 짝을 찾는 방식으로는 못 막는다.**
--
-- 그래서 본인이 잇게 한다. 본인은 자기가 예전에 어느 이메일로 가입했는지 안다.
--
-- ── 왜 이메일 확인이 아니라 비밀번호인가 ────────────────────────────
-- "예전 이메일을 적으세요"만으로 잇게 하면, 남의 이메일을 적어 **남의 기록을
-- 통째로 가져갈 수 있다.** 통독 기록·포인트·기도제목이 모두 넘어간다.
--
-- 그래서 이 함수는 **잇지 않는다.** 신청만 받아 둔다. 실제로 잇는 것은 예전
-- 계정으로 로그인해 본 사람만 할 수 있다(아래 confirm 함수). 예전 계정의
-- 비밀번호를 아는 사람 = 본인이다.

create table if not exists public.account_link_requests (
  id uuid primary key default gen_random_uuid(),
  -- 지금 쓰는 계정(카카오). 기록을 받을 쪽.
  new_user_id uuid not null references auth.users(id) on delete cascade,
  -- 본인이 적어 낸 예전 이메일
  old_email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected', 'expired')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  -- 실제로 이어 준 행 수. 나중에 "뭐가 넘어왔나"를 물으면 답할 수 있어야 한다.
  moved_rows integer
);

create index if not exists account_link_requests_new_user_idx
  on public.account_link_requests (new_user_id, created_at desc);

alter table public.account_link_requests enable row level security;

drop policy if exists account_link_requests_own on public.account_link_requests;
create policy account_link_requests_own on public.account_link_requests
  for select using (new_user_id = auth.uid());

drop policy if exists account_link_requests_insert on public.account_link_requests;
create policy account_link_requests_insert on public.account_link_requests
  for insert with check (new_user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════
-- 1. 예전 계정이 있는지 알려 준다
-- ════════════════════════════════════════════════════════════════════
--
-- 화면에 "예전 기록이 있습니다"를 띄우려면 먼저 있는지 알아야 한다. 그런데
-- 이메일로 조회하게 두면 **아무 이메일이나 넣어 가입 여부를 캐낼 수 있다.**
-- 그래서 이메일을 받지 않고, **지금 계정에 기록이 없을 때만** 안내를 띄운다.

create or replace function public.needs_account_link()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and not exists (select 1 from reading_helper_day_records where user_id = auth.uid())
     and not exists (select 1 from prayer_requests where user_id = auth.uid())
     and not exists (select 1 from arena_escape_records where user_id = auth.uid());
$$;

-- ════════════════════════════════════════════════════════════════════
-- 2. 예전 계정의 기록을 옮긴다
-- ════════════════════════════════════════════════════════════════════
--
-- **호출하는 사람이 예전 계정으로 로그인한 상태여야 한다.** 즉 이 함수는
-- "예전 계정 → 새 계정"으로 넘겨주는 함수이고, 예전 계정의 주인만 부를 수 있다.
-- 그래서 남의 기록을 가져올 수 없다.
--
-- 흐름:
--   1. 카카오로 들어와 "예전 이메일이 있어요" 를 적는다 → account_link_requests
--   2. 앱이 안내한다 — "예전 이메일과 비밀번호로 한 번만 로그인해 주세요"
--   3. 그 계정으로 로그인한 상태에서 이 함수를 부른다 → 기록이 넘어간다

create or replace function public.confirm_account_link(request_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  req account_link_requests%rowtype;
  me uuid := auth.uid();
  my_email text;
  moved integer := 0;
  n integer;
begin
  if me is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into req from account_link_requests where id = request_id for update;
  if not found then
    raise exception '신청을 찾을 수 없습니다.';
  end if;
  if req.status <> 'pending' then
    raise exception '이미 처리된 신청입니다.';
  end if;
  if req.new_user_id = me then
    raise exception '예전 계정으로 로그인한 뒤에 눌러 주세요.';
  end if;

  -- 지금 로그인한 계정이 정말 그 예전 이메일의 주인인가.
  select lower(email) into my_email from auth.users where id = me;
  if my_email is distinct from lower(trim(req.old_email)) then
    raise exception '신청에 적힌 이메일과 지금 로그인한 계정이 다릅니다.';
  end if;

  -- 옮긴다. 날짜가 열쇠인 표는 겹치는 날을 남긴다(새 계정 것이 이긴다).
  delete from reading_helper_day_records old
   where old.user_id = me
     and exists (select 1 from reading_helper_day_records new
                  where new.user_id = req.new_user_id and new.date = old.date);
  update reading_helper_day_records set user_id = req.new_user_id where user_id = me;
  get diagnostics n = row_count; moved := moved + n;

  -- 열쇠는 (user_id, date) 다. checkin_date 가 아니다 — 0030 을 확인할 것.
  delete from r2m_daily_checkins old
   where old.user_id = me
     and exists (select 1 from r2m_daily_checkins new
                  where new.user_id = req.new_user_id and new.date = old.date);
  update r2m_daily_checkins set user_id = req.new_user_id where user_id = me;
  get diagnostics n = row_count; moved := moved + n;

  update prayer_requests   set user_id = req.new_user_id where user_id = me;
  get diagnostics n = row_count; moved := moved + n;
  update prayer_comments   set user_id = req.new_user_id where user_id = me;
  get diagnostics n = row_count; moved := moved + n;
  update arena_escape_records set user_id = req.new_user_id where user_id = me;
  get diagnostics n = row_count; moved := moved + n;
  update posts    set user_id = req.new_user_id where user_id = me;
  get diagnostics n = row_count; moved := moved + n;
  update comments set user_id = req.new_user_id where user_id = me;
  get diagnostics n = row_count; moved := moved + n;
  -- 열쇠가 (user_id, item_id) 라 같은 물건을 양쪽에서 샀으면 부딪힌다.
  -- 이미 새 계정에 있는 물건은 옛 계정 쪽을 지운다 — 두 번 산 것이 아니라
  -- 같은 사람이 계정 둘로 산 것이므로 하나만 남으면 된다.
  delete from shop_purchases old
   where old.user_id = me
     and exists (select 1 from shop_purchases new
                  where new.user_id = req.new_user_id and new.item_id = old.item_id);
  update shop_purchases set user_id = req.new_user_id where user_id = me;
  get diagnostics n = row_count; moved := moved + n;

  -- 통독 시작일은 **이른 쪽**을 살린다. 이것을 빠뜨리면 기록만 넘어가고
  -- 진도는 오늘부터 새로 잡혀서, 본인은 여전히 첫날을 본다.
  update reading_helper_progress p
     set start_date = least(p.start_date, (select start_date from reading_helper_progress where user_id = me))
   where p.user_id = req.new_user_id
     and exists (select 1 from reading_helper_progress where user_id = me);

  insert into reading_helper_progress (user_id, start_date)
  select req.new_user_id, start_date from reading_helper_progress where user_id = me
  on conflict (user_id) do nothing;

  update account_link_requests
     set status = 'confirmed', confirmed_at = now(), moved_rows = moved
   where id = request_id;

  return moved;
end;
$$;

revoke all on function public.needs_account_link() from public, anon;
revoke all on function public.confirm_account_link(uuid) from public, anon;
grant execute on function public.needs_account_link() to authenticated;
grant execute on function public.confirm_account_link(uuid) to authenticated;

comment on function public.confirm_account_link(uuid) is
  '예전 계정으로 로그인한 상태에서 부른다. 그 계정의 기록을 신청서에 적힌 새 계정으로 넘긴다.';
