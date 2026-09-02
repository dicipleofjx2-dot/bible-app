-- 창세기 아케이드 포인트 (2026-09-02)
--
-- → docs/arcade/README.md
--
-- ── 정한 것 ───────────────────────────────────────────────────
--
-- · 한 판을 **끝까지 통과하면 30포인트**. 중간에 지면 0점이다.
-- · 같은 게임은 **하루에 한 번만** 준다. 다시 하는 것은 얼마든지 되지만
--   포인트는 그날 한 번이다. 이 빗장이 없으면 제일 쉬운 판 하나를 반복해서
--   무한히 벌 수 있고, 그러면 통독 점수(하루 최대 50점)도 교환소 값도
--   전부 뜻을 잃는다.
-- · 판이 다섯이므로 **하루 최대 150점**이 된다. 통독으로 버는 것보다 크다.
--   그게 부담스러우면 아래 arcade_daily_cap() 한 줄만 바꾸면 된다 —
--   30 으로 두면 「하루 한 판만 인정」이 되고, 60 이면 두 판이다.
--
-- ── 통독 순위표는 건드리지 않는다 ─────────────────────────────
--
-- 0063 에서 대회 상금을 순위표에 넣지 않기로 한 것과 같은 이유다. 통독 순위는
-- 「통독을 얼마나 성실히 했나」이지 「게임을 잘하나」가 아니다. 아케이드 점수는
-- **교환소에서 쓸 수 있는 잔액**에만 들어간다.
--
-- Supabase 대시보드 SQL Editor 에서 실행할 것.

-- ── 하루 상한 ─────────────────────────────────────────────────
--
-- 함수로 빼 둔 이유는 하나다. 상한을 조절할 때 이 한 줄만 바꾸면 되고,
-- 값을 쓰는 자리를 찾아다니지 않아도 된다.

create or replace function public.arcade_daily_cap()
returns integer
language sql
immutable
as $$ select 150 $$;

-- ── 통과 기록 ─────────────────────────────────────────────────
--
-- 「누가 · 어느 판을 · 어느 날 깼나」만 적는다. 몇 번 깼는지는 안 센다 —
-- 포인트가 하루 한 번이라 셀 이유가 없고, 세기 시작하면 기록이 무한히 는다.

create table if not exists public.arcade_clears (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 'ark' | 'babel' | 'sodom' | 'jabbok' | 'granary'
  game text not null,
  -- 날짜는 한국 시간으로 끊는다. 통독 기록(0045·0046)과 같은 기준이어야
  -- 「오늘」이 두 곳에서 다르게 보이지 않는다.
  cleared_on date not null default (now() at time zone 'Asia/Seoul')::date,
  points integer not null,
  created_at timestamptz not null default now()
);

create unique index if not exists arcade_clears_once_idx
  on public.arcade_clears (user_id, game, cleared_on);

create index if not exists arcade_clears_user_idx
  on public.arcade_clears (user_id, cleared_on desc);

alter table public.arcade_clears enable row level security;

drop policy if exists "read own arcade clears" on public.arcade_clears;
create policy "read own arcade clears" on public.arcade_clears
  for select using (auth.uid() = user_id);
-- 쓰기 정책은 없다. 아래 함수로만 들어온다 — 화면에서 직접 insert 할 수 있으면
-- 게임을 안 하고도 포인트를 넣을 수 있다.

-- ── 포인트 주기 ───────────────────────────────────────────────
--
-- 화면이 「깼다」고 말하면 그대로 믿는다. 캔버스 게임의 판정을 서버에서 다시
-- 검사할 방법이 없기 때문이다. 대신 **하루 한 번**이라는 빗장으로 피해를 막는다 —
-- 최대한 속여도 하루치를 미리 받는 것뿐이다.

create or replace function public.arcade_award(p_game text)
returns table (awarded boolean, points integer, today_points integer, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_sum   integer;
  v_cap   integer := arcade_daily_cap();
  v_award constant integer := 30;
begin
  if v_uid is null then
    return query select false, 0, 0, 'not_signed_in'::text; return;
  end if;

  if p_game not in ('ark', 'babel', 'sodom', 'jabbok', 'granary') then
    return query select false, 0, 0, 'unknown_game'::text; return;
  end if;

  select coalesce(sum(c.points), 0)::int into v_sum
    from arcade_clears c
   where c.user_id = v_uid and c.cleared_on = v_today;

  if exists (select 1 from arcade_clears c
              where c.user_id = v_uid and c.game = p_game and c.cleared_on = v_today) then
    return query select false, 0, v_sum, 'already_today'::text; return;
  end if;

  if v_sum + v_award > v_cap then
    return query select false, 0, v_sum, 'daily_cap'::text; return;
  end if;

  insert into arcade_clears (user_id, game, points) values (v_uid, p_game, v_award);
  return query select true, v_award, v_sum + v_award, 'ok'::text;
end;
$$;

-- ── 내 상태 ───────────────────────────────────────────────────
--
-- 화면이 「오늘 어느 판을 이미 깼는지」를 알아야 포인트가 붙는 판과 안 붙는
-- 판을 미리 구분해 보여 줄 수 있다. 다 깨고 나서 "이미 받았습니다"를 보면
-- 속은 기분이 든다.

create or replace function public.arcade_my_state()
returns table (today_games text[], today_points integer, total_points integer)
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce((select array_agg(c.game order by c.game) from arcade_clears c
               where c.user_id = auth.uid()
                 and c.cleared_on = (now() at time zone 'Asia/Seoul')::date), '{}'::text[]),
    coalesce((select sum(c.points)::int from arcade_clears c
               where c.user_id = auth.uid()
                 and c.cleared_on = (now() at time zone 'Asia/Seoul')::date), 0),
    coalesce((select sum(c.points)::int from arcade_clears c
               where c.user_id = auth.uid()), 0);
$$;

-- ── 잔액 셈에 아케이드를 더한다 ───────────────────────────────
--
-- 0063 의 함수를 그대로 가져와 l(대회 원장) 옆에 a(아케이드)를 붙인다.
-- 셈이 한 곳에 있어야 교환소·순위·진출자 판정이 어긋나지 않는다.

create or replace function public.points_balance_of(p_user uuid)
returns table (earned integer, spent integer, balance integer)
language sql
security definer
set search_path = public
stable
as $$
  with e as (
    select coalesce(sum(
      case when r.quiz_score >= 100 then 30
           when r.quiz_score >= 90 then 20
           when r.quiz_score >= 80 then 10
           else 0 end
      + case when r.memorization_success then 10 else 0 end
      + case when r.speed_quiz_success then 10 else 0 end
    )::int, 0) as earned
    from reading_helper_day_records r
    where r.user_id = p_user
      and r.date >= reading_helper_points_since()
  ),
  p as (
    select coalesce((select penalty from reading_helper_penalties() where user_id = p_user), 0) as penalty
  ),
  s as (
    select coalesce(sum(cost_paid)::int, 0) as spent
    from shop_purchases where user_id = p_user
  ),
  l as (
    select
      coalesce(sum(case when amount > 0 then amount else 0 end)::int, 0) as prizes,
      coalesce(sum(case when amount < 0 then -amount else 0 end)::int, 0) as fees
    from arena_point_ledger where user_id = p_user
  ),
  a as (
    select coalesce(sum(points)::int, 0) as arcade
    from arcade_clears where user_id = p_user
  )
  select
    greatest(e.earned - p.penalty, 0) + l.prizes + a.arcade,
    s.spent + l.fees,
    greatest(greatest(e.earned - p.penalty, 0) + l.prizes + a.arcade - s.spent - l.fees, 0)
  from e, p, s, l, a;
$$;
