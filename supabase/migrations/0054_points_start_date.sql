-- 포인트를 **2026년 8월 19일(수)부터** 센다.
--
-- 그 전 기록은 시험 삼아 눌러 본 것이 섞여 있어 순위의 근거가 되기 어렵다.
-- 통독을 함께 시작한 날을 기준으로 모두 같은 선에서 출발하게 한다.
--
-- ## 한 곳에서만 정한다
--
-- 점수 세는 식이 지금 네 함수에 똑같이 베껴져 있다(순위표·내 순위·관리자
-- 현황판·상점 잔액). 시작일까지 네 군데에 흩어 적으면 한 곳만 고치고 나머지를
-- 잊는 날이 반드시 온다 — 그러면 순위표와 잔액이 서로 다른 점수를 말한다.
--
-- 그래서 **시작일을 함수 하나로 뽑고** 네 곳이 그것을 부른다. 날짜를 바꿀 일이
-- 생기면 이 함수 하나만 고치면 된다.
create or replace function public.reading_helper_points_since()
returns date
language sql
immutable
as $$ select date '2026-08-19' $$;

comment on function public.reading_helper_points_since() is
  '포인트를 세기 시작하는 날. 이 날부터의 기록만 점수·순위·상점 잔액에 들어간다. 바꾸려면 여기만 고친다.';

-- ── 1. 순위표 ──────────────────────────────────────────────────
drop function if exists public.reading_helper_ranking(integer);

create function public.reading_helper_ranking(top_n integer default 5)
returns table (
  rank integer,
  display_name text,
  title_label text,
  title_emoji text,
  badge_emoji text,
  points integer,
  week_points integer,
  is_me boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with week_start as (
    select ((now() at time zone 'Asia/Seoul')::date
            - extract(dow from (now() at time zone 'Asia/Seoul')::date)::int) as d
  ),
  scored as (
    select
      r.user_id,
      sum(
        case when r.quiz_score >= 100 then 30
             when r.quiz_score >= 90 then 20
             when r.quiz_score >= 80 then 10
             else 0 end
        + case when r.memorization_success then 10 else 0 end
        + case when r.speed_quiz_success then 10 else 0 end
      )::int as points,
      sum(
        case when r.date >= (select d from week_start) then
          case when r.quiz_score >= 100 then 30
               when r.quiz_score >= 90 then 20
               when r.quiz_score >= 80 then 10
               else 0 end
          + case when r.memorization_success then 10 else 0 end
          + case when r.speed_quiz_success then 10 else 0 end
        else 0 end
      )::int as week_points
    from reading_helper_day_records r
    where r.date >= reading_helper_points_since()
    group by r.user_id
  ),
  ranked as (
    select
      row_number() over (order by s.points desc, s.week_points desc, s.user_id)::int as rank,
      s.user_id, s.points, s.week_points,
      coalesce(p.username, '이름 없음') as raw_name,
      t.label as title_label,
      t.emoji as title_emoji,
      b.emoji as badge_emoji
    from scored s
    left join profiles p on p.id = s.user_id
    left join shop_items t on t.id = p.equipped_title_id
    left join shop_items b on b.id = p.equipped_badge_id
    where s.points > 0
  )
  select
    ranked.rank,
    case
      when position('@' in ranked.raw_name) > 0 then left(ranked.raw_name, 3) || '***'
      else ranked.raw_name
    end,
    coalesce(ranked.title_label, ''),
    coalesce(ranked.title_emoji, ''),
    coalesce(ranked.badge_emoji, ''),
    ranked.points,
    ranked.week_points,
    ranked.user_id = auth.uid()
  from ranked
  where ranked.rank <= greatest(top_n, 1)
  order by ranked.rank;
$$;

comment on function public.reading_helper_ranking(integer) is
  '통독 점수 상위 N명. reading_helper_points_since() 이후 기록만 센다.';

-- ── 2. 내 순위 ─────────────────────────────────────────────────
create or replace function public.reading_helper_my_rank()
returns table (rank integer, points integer, total integer)
language sql
security definer
set search_path = public
stable
as $$
  with week_start as (
    select ((now() at time zone 'Asia/Seoul')::date
            - extract(dow from (now() at time zone 'Asia/Seoul')::date)::int) as d
  ),
  scored as (
    select
      r.user_id,
      sum(
        case when r.quiz_score >= 100 then 30
             when r.quiz_score >= 90 then 20
             when r.quiz_score >= 80 then 10
             else 0 end
        + case when r.memorization_success then 10 else 0 end
        + case when r.speed_quiz_success then 10 else 0 end
      )::int as points,
      sum(
        case when r.date >= (select d from week_start) then
          case when r.quiz_score >= 100 then 30
               when r.quiz_score >= 90 then 20
               when r.quiz_score >= 80 then 10
               else 0 end
          + case when r.memorization_success then 10 else 0 end
          + case when r.speed_quiz_success then 10 else 0 end
        else 0 end
      )::int as week_points
    from reading_helper_day_records r
    where r.date >= reading_helper_points_since()
    group by r.user_id
  ),
  ranked as (
    select row_number() over (order by points desc, week_points desc, user_id)::int as rank,
           user_id, points
    from scored where points > 0
  )
  select ranked.rank, ranked.points, (select count(*)::int from ranked)
  from ranked
  where ranked.user_id = auth.uid();
$$;

-- ── 3. 상점 잔액 ───────────────────────────────────────────────
--
-- ⚠️ 잔액이 음수가 되지 않게 0 에서 막는다.
--    시작일을 뒤로 옮기면 이미 쓴 점수가 새로 번 점수보다 클 수 있다. 화면에
--    「-190점」이 뜨면 성도는 빚을 진 것으로 읽는다. 벌어들인 만큼만 인정하고
--    모자란 것은 없던 일로 한다 — 이미 산 물건은 그대로 두는 것과 짝이 맞는다.
create or replace function public.shop_balance()
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
    where r.user_id = auth.uid()
      and r.date >= reading_helper_points_since()
  ),
  s as (
    select coalesce(sum(cost_paid)::int, 0) as spent
    from shop_purchases where user_id = auth.uid()
  )
  select e.earned, s.spent, greatest(e.earned - s.spent, 0)
  from e, s;
$$;

-- ── 4. 관리자 현황판 ───────────────────────────────────────────
--
-- ⚠️ 여기서는 **점수만** 시작일로 자른다. 「마친 날 수」와 「빠뜨린 날」은
--    그대로 둔다 — 그건 포인트가 아니라 통독을 얼마나 걸어왔는가다. 그것까지
--    자르면 8월 초부터 읽어 온 분의 기록이 없던 일이 되고, 빠뜨린 날은
--    (오늘 - 시작일) 에서 빼는 식이라 오히려 부풀어 오른다.
create or replace function public.reading_helper_admin_board()
returns table (
  user_id uuid,
  display_name text,
  start_date date,
  day_number integer,
  done_days integer,
  missed_days integer,
  last_done date,
  week_points integer,
  total_points integer
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (
    select 1 from profiles p where p.id = auth.uid() and p.is_admin = true
  ) then
    raise exception '관리자만 볼 수 있습니다.';
  end if;

  return query
  with today as (select (now() at time zone 'Asia/Seoul')::date as d),
  week_start as (
    select (t.d - extract(dow from t.d)::int) as d from today t
  ),
  agg as (
    select
      r.user_id,
      -- 점수는 시작일 이후만. 순위표·잔액과 같은 숫자여야 한다.
      sum(
        case when r.date >= reading_helper_points_since() then
          case when r.quiz_score >= 100 then 30
               when r.quiz_score >= 90 then 20
               when r.quiz_score >= 80 then 10
               else 0 end
          + case when r.memorization_success then 10 else 0 end
          + case when r.speed_quiz_success then 10 else 0 end
        else 0 end
      )::int as total_points,
      sum(
        case when r.date >= greatest((select d from week_start), reading_helper_points_since()) then
          case when r.quiz_score >= 100 then 30
               when r.quiz_score >= 90 then 20
               when r.quiz_score >= 80 then 10
               else 0 end
          + case when r.memorization_success then 10 else 0 end
          + case when r.speed_quiz_success then 10 else 0 end
        else 0 end
      )::int as week_points,
      -- 진척은 자르지 않는다. 「마쳤다」의 기준은 앱·달력과 같다(퀴즈 80점 이상).
      count(*) filter (where r.quiz_score >= 80)::int as done_days,
      max(r.date) filter (where r.quiz_score >= 80) as last_done
    from reading_helper_day_records r
    group by r.user_id
  )
  select
    p.user_id,
    coalesce(pr.username, '이름 없음') as display_name,
    p.start_date,
    ((select d from today) - p.start_date + 1)::int as day_number,
    coalesce(a.done_days, 0),
    greatest(((select d from today) - p.start_date) - coalesce(a.done_days, 0), 0)::int,
    a.last_done,
    coalesce(a.week_points, 0),
    coalesce(a.total_points, 0)
  from reading_helper_progress p
  left join agg a on a.user_id = p.user_id
  left join profiles pr on pr.id = p.user_id
  order by coalesce(a.week_points, 0) desc, coalesce(a.done_days, 0) desc;
end;
$$;

-- ── 5. 시작일 이전에 산 것 ─────────────────────────────────────
--
-- 사용자 결정: **산 것은 그대로 두고 구매기록만 지운다.** 이미 달고 있는
-- 칭호를 뺏지 않으면서 잔액도 음수가 되지 않게 한다.
--
-- 시작일 이후로 번 점수보다 이미 쓴 점수가 많은 사람의 구매기록만 지운다.
-- 산 물건(profiles.equipped_title_id 등)은 건드리지 않는다.
delete from shop_purchases sp
where sp.user_id in (
  select sp2.user_id
  from shop_purchases sp2
  group by sp2.user_id
  having sum(sp2.cost_paid) > coalesce((
    select sum(
      case when r.quiz_score >= 100 then 30
           when r.quiz_score >= 90 then 20
           when r.quiz_score >= 80 then 10
           else 0 end
      + case when r.memorization_success then 10 else 0 end
      + case when r.speed_quiz_success then 10 else 0 end
    )::int
    from reading_helper_day_records r
    where r.user_id = sp2.user_id
      and r.date >= reading_helper_points_since()
  ), 0)
);

notify pgrst, 'reload schema';
