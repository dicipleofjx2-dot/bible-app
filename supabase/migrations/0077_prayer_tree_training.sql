-- 중보기도 나무를 R2M 「오늘의 훈련」의 기도 항목에 잇는다.
--
-- ── 왜 ──────────────────────────────────────────────────────────────
-- 훈련의 「기도」는 여태 샬롬기도단(나눔 게시판)에서 「오늘 기도했어요」를
-- 누르는 것뿐이었다. 그건 함께 나누는 자리이고, 혼자 이름을 부르며 하는
-- 개인기도는 나무 쪽이다. 열매 하나를 위해 기도하면 그날의 훈련이 채워진다.
--
-- ── 하루 한 줄 ──────────────────────────────────────────────────────
-- 성장기록(getProgressCounts)이 prayer_logs 의 **줄 수**를 「기도한 날」로
-- 센다. 열매를 누를 때마다 줄을 넣으면 하루에 열 번 기도한 사람이 열흘
-- 기도한 것으로 보인다. 그래서 그날 줄이 없을 때만 넣는다.
--
-- 날의 경계는 서울 기준이다. 서버(UTC)의 자정으로 끊으면 한국의 오전 9시에
-- 날이 바뀌어, 새벽기도가 어제 것으로 적힌다.

alter table public.prayer_fruits
  add column if not exists last_prayed_at timestamptz,
  add column if not exists prayed_count integer not null default 0;

create or replace function public.pray_for_fruit(p_fruit_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;

  -- 자기 열매만. 남의 열매 아이디를 넣어도 아무 줄도 안 바뀐다.
  update public.prayer_fruits
     set last_prayed_at = v_now,
         prayed_count = prayed_count + 1
   where id = p_fruit_id
     and user_id = v_user;

  if not found then
    raise exception 'fruit not found';
  end if;

  insert into public.prayer_logs (user_id)
  select v_user
  where not exists (
    select 1
      from public.prayer_logs
     where user_id = v_user
       and created_at >= (date_trunc('day', v_now at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')
  );

  return v_now;
end
$$;

revoke all on function public.pray_for_fruit(uuid) from public;
grant execute on function public.pray_for_fruit(uuid) to authenticated;
