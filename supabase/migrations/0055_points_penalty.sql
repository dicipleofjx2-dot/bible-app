-- 빠진 날에 벌점을 매긴다.
--
--   연속으로 빠진 1일째  -10점
--             2일째  -10점
--             3일째  -50점   ← 연속 3의 배수인 날
--             4일째  -10점
--             5일째  -10점
--             6일째  -50점
--
-- 하루라도 하면 연속 셈이 0으로 돌아간다. 「사흘을 내리 거르면 크게 잃는다」가
-- 규칙의 뜻이라, 4일째부터는 다시 -10점에서 시작한다.
--
-- ## 정한 것 둘 (사용자 결정)
--
--   · 점수는 **0점에서 막는다.** 「-140점」을 보면 다시 시작할 엄두가 안 난다.
--     벌점 자체는 그대로 매겨지므로 열심히 한 분과의 순위 차이는 유지된다.
--   · 벌점은 **그 사람이 통독을 시작한 날부터** 센다(8/19 이후만). 늦게 들어온
--     분이 들어오기 전 날들로 벌점을 받으면 시작도 전에 빚을 지고 만다.

-- ── 빠진 날 벌점 ───────────────────────────────────────────────
--
-- 「마쳤다」의 기준은 앱·달력·관리자 현황판과 같다: 그날 성경퀴즈 80점 이상.
-- 눌러서 표시하는 통독 완료는 실제로 읽었는지와 상관이 없어 쓰지 않는다.
--
-- 오늘은 세지 않는다 — 아직 하루가 안 갔는데 안 했다고 깎으면 안 된다.
create or replace function public.reading_helper_penalties()
returns table (user_id uuid, missed_days integer, penalty integer)
language sql
security definer
set search_path = public
stable
as $$
  with bounds as (
    select
      p.user_id,
      -- 개인 시작일과 포인트 시작일 중 늦은 날부터
      greatest(p.start_date, reading_helper_points_since()) as from_d,
      -- 어제까지. 하루 경계는 **새벽 4시**다 — 앱의 todayDateString() 이
      -- DAY_START_HOUR=4 로 그렇게 세기 때문이다. 자정 기준으로 세면 새벽
      -- 0~4시 사이에 앱이 「오늘」이라 부르는 날을 DB 는 「어제」로 보고
      -- 벌점을 매겨, 아직 하루가 안 갔는데 깎이는 일이 생긴다.
      (((now() at time zone 'Asia/Seoul') - interval '4 hours')::date - 1) as to_d
    from reading_helper_progress p
  ),
  days as (
    select b.user_id, d::date as d
    from bounds b
    cross join lateral generate_series(b.from_d, b.to_d, interval '1 day') as g(d)
    where b.from_d <= b.to_d
  ),
  missed as (
    select
      d.user_id,
      d.d,
      row_number() over (partition by d.user_id order by d.d) as rn
    from days d
    where not exists (
      select 1 from reading_helper_day_records r
      where r.user_id = d.user_id and r.date = d.d and r.quiz_score >= 80
    )
  ),
  -- 연속 구간 나누기: 날짜에서 순번을 빼면 같은 구간은 같은 값이 된다.
  islands as (
    select user_id, d, (d - (rn || ' days')::interval)::date as island
    from missed
  ),
  streaks as (
    select
      user_id,
      row_number() over (partition by user_id, island order by d) as streak_idx
    from islands
  )
  select
    user_id,
    count(*)::int as missed_days,
    sum(case when streak_idx % 3 = 0 then 50 else 10 end)::int as penalty
  from streaks
  group by user_id;
$$;

comment on function public.reading_helper_penalties() is
  '빠진 날 벌점. 연속 1·2일째 -10, 3의 배수 날 -50. 개인 통독 시작일(8/19 이후)부터 어제까지.';

revoke all on function public.reading_helper_penalties() from public;
grant execute on function public.reading_helper_penalties() to authenticated;

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
  earned as (
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
  pen as (select * from reading_helper_penalties()),
  scored as (
    -- 벌점을 뺀다. 0 에서 막는다 — 음수를 보면 다시 시작할 엄두가 안 난다.
    select
      coalesce(e.user_id, p.user_id) as user_id,
      greatest(coalesce(e.points, 0) - coalesce(p.penalty, 0), 0) as points,
      coalesce(e.week_points, 0) as week_points
    from earned e
    full join pen p on p.user_id = e.user_id
  ),
  ranked as (
    select
      row_number() over (order by s.points desc, s.week_points desc, s.user_id)::int as rank,
      s.user_id, s.points, s.week_points,
      coalesce(pr.username, '이름 없음') as raw_name,
      t.label as title_label,
      t.emoji as title_emoji,
      b.emoji as badge_emoji
    from scored s
    left join profiles pr on pr.id = s.user_id
    left join shop_items t on t.id = pr.equipped_title_id
    left join shop_items b on b.id = pr.equipped_badge_id
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
  '통독 점수 상위 N명. 시작일 이후 점수에서 빠진 날 벌점을 뺀다(0 에서 막음).';

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
  earned as (
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
  pen as (select * from reading_helper_penalties()),
  scored as (
    select
      coalesce(e.user_id, p.user_id) as user_id,
      greatest(coalesce(e.points, 0) - coalesce(p.penalty, 0), 0) as points,
      coalesce(e.week_points, 0) as week_points
    from earned e
    full join pen p on p.user_id = e.user_id
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
-- 벌점을 뺀 것이 실제로 쓸 수 있는 점수다. 여기서만 안 빼면 순위표에는 깎여
-- 보이는데 상점에서는 그대로 살 수 있어 규칙이 헛돈다.
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
  p as (
    select coalesce((select penalty from reading_helper_penalties() where user_id = auth.uid()), 0) as penalty
  ),
  s as (
    select coalesce(sum(cost_paid)::int, 0) as spent
    from shop_purchases where user_id = auth.uid()
  )
  -- 「모은 점수」에는 벌점을 반영해 보여 준다. 화면에 「300점 모아 40점 썼는데
  -- 쓸 수 있는 건 110점」이 나오면 성도가 계산을 못 따라간다.
  select
    greatest(e.earned - p.penalty, 0),
    s.spent,
    greatest(greatest(e.earned - p.penalty, 0) - s.spent, 0)
  from e, p, s;
$$;

-- ── 4. 관리자 현황판 ───────────────────────────────────────────
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
      count(*) filter (where r.quiz_score >= 80)::int as done_days,
      max(r.date) filter (where r.quiz_score >= 80) as last_done
    from reading_helper_day_records r
    group by r.user_id
  ),
  pen as (select * from reading_helper_penalties())
  select
    p.user_id,
    coalesce(pr.username, '이름 없음') as display_name,
    p.start_date,
    ((select d from today) - p.start_date + 1)::int as day_number,
    coalesce(a.done_days, 0),
    -- 빠진 날은 벌점 셈과 같은 값을 쓴다. 예전에는 (오늘-시작일)-마친날 이었는데
    -- 그러면 벌점 화면과 숫자가 달라 「왜 다르지」가 된다.
    coalesce(pe.missed_days, 0),
    a.last_done,
    coalesce(a.week_points, 0),
    greatest(coalesce(a.total_points, 0) - coalesce(pe.penalty, 0), 0)
  from reading_helper_progress p
  left join agg a on a.user_id = p.user_id
  left join pen pe on pe.user_id = p.user_id
  left join profiles pr on pr.id = p.user_id
  order by greatest(coalesce(a.total_points, 0) - coalesce(pe.penalty, 0), 0) desc,
           coalesce(a.done_days, 0) desc;
end;
$$;

notify pgrst, 'reload schema';
