-- 관리자가 **모든 사람의 통독 진도와 점수**를 한 화면에서 본다.
--
-- 목회자가 "누가 잘 따라오고 있고 누가 힘들어하는지"를 알아야 격려할 수 있다.
-- 지금은 각자 자기 것만 볼 수 있어(RLS), 교회 전체를 볼 방법이 아예 없다.
--
-- ⚠️ 여기는 **순위표와 다르다.** 순위표는 성도 누구나 보므로 이름을 가리고 위
--    다섯만 보여 준다. 이 함수는 관리자만 부를 수 있고, 격려하려면 누가 누구인지
--    알아야 하므로 **가리지 않는다.** 대신 첫 줄에서 관리자인지 반드시 확인한다 —
--    이 함수는 security definer 라 RLS 를 통째로 넘어간다.

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
      -- 점수 셈은 앱(db.ts) 및 순위표(0046)와 **같은 숫자**여야 한다.
      -- 퀴즈 100→30 · 90대→20 · 80대→10 · 암송 10 · 3초OX 10
      sum(
        case when r.quiz_score >= 100 then 30
             when r.quiz_score >= 90 then 20
             when r.quiz_score >= 80 then 10
             else 0 end
        + case when r.memorization_success then 10 else 0 end
        + case when r.speed_quiz_success then 10 else 0 end
      )::int as total_points,
      sum(
        case when r.date >= (select d from week_start) then
          case when r.quiz_score >= 100 then 30
               when r.quiz_score >= 90 then 20
               when r.quiz_score >= 80 then 10
               else 0 end
          + case when r.memorization_success then 10 else 0 end
          + case when r.speed_quiz_success then 10 else 0 end
        else 0 end
      )::int as week_points,
      count(*) filter (where r.reading_complete)::int as done_days,
      max(r.date) filter (where r.reading_complete) as last_done
    from reading_helper_day_records r
    group by r.user_id
  )
  select
    p.user_id,
    coalesce(pr.username, '이름 없음') as display_name,
    p.start_date,
    -- 시작일을 포함해 오늘이 며칠째인가.
    ((select d from today) - p.start_date + 1)::int as day_number,
    coalesce(a.done_days, 0),
    -- 빠뜨린 날 = 지나온 날(어제까지) - 마친 날. 오늘은 아직 안 갔으니 뺀다.
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

comment on function public.reading_helper_admin_board() is
  '관리자용 통독 현황판. 순위표와 달리 이름을 가리지 않는다 — 격려하려면 누구인지 알아야 한다. 첫 줄에서 관리자인지 반드시 확인한다.';

revoke all on function public.reading_helper_admin_board() from public;
grant execute on function public.reading_helper_admin_board() to authenticated;

notify pgrst, 'reload schema';
