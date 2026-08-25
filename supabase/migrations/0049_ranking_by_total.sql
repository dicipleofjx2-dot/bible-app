-- 순위를 **총점**으로 세운다. 이번 주 점수는 곁에 함께 보여 준다.
--
-- 0046 은 이번 주 점수로 줄을 세웠다. 누구나 이번 주에 열심히 하면 1등을 볼 수
-- 있게 하려는 것이었는데, 실제로 화면에 뜬 숫자(1등 100점)가 그동안 쌓아 온
-- 것에 비해 너무 작았다. 지금까지 걸어온 길이 순위에 안 보이는 셈이다.
--
-- 그래서 **총점으로 세우고**, 이번 주 점수를 옆에 같이 적는다. 오래 해 온 분이
-- 위에 서되, 이번 주에 누가 달리고 있는지도 한눈에 보인다.
--
-- 가리는 규칙과 「위 다섯만」은 0046 그대로다 — 82명 중 65명의 닉네임이 이메일
-- 주소라 그대로 띄우면 순위표가 교인 이메일 명부가 된다.

-- ⚠️ 돌려주는 칸이 늘었으므로(week_points 추가) 먼저 지워야 한다.
--    create or replace 로는 반환 형태를 못 바꾼다:
--      42P13: cannot change return type of existing function
drop function if exists public.reading_helper_ranking(integer);

create function public.reading_helper_ranking(top_n integer default 5)
returns table (rank integer, display_name text, points integer, week_points integer, is_me boolean)
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
      -- 점수 셈은 db.ts(quizPoints·MEMORIZATION_POINTS·SPEED_QUIZ_POINTS)와
      -- 관리자 현황판(0047)과 **같은 숫자**여야 한다.
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
    group by r.user_id
  ),
  ranked as (
    select
      -- 총점으로 세운다. 같으면 이번 주에 더 한 사람을 위에 둔다.
      row_number() over (order by s.points desc, s.week_points desc, s.user_id)::int as rank,
      s.user_id, s.points, s.week_points,
      coalesce(p.username, '이름 없음') as raw_name
    from scored s
    left join profiles p on p.id = s.user_id
    where s.points > 0
  )
  select
    ranked.rank,
    case
      when position('@' in ranked.raw_name) > 0 then left(ranked.raw_name, 3) || '***'
      else ranked.raw_name
    end,
    ranked.points,
    ranked.week_points,
    ranked.user_id = auth.uid()
  from ranked
  where ranked.rank <= greatest(top_n, 1)
  order by ranked.rank;
$$;

comment on function public.reading_helper_ranking(integer) is
  '통독 점수 상위 N명. 총점으로 세우고 이번 주 점수를 함께 준다. 이메일이 닉네임인 사람은 앞 세 글자만 남긴다.';

-- 내 순위도 같은 기준(총점)으로 재야 한다. 안 그러면 "1등은 총점인데 내
-- 등수는 이번 주 기준"이 되어 숫자가 서로 안 맞는다.
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

revoke all on function public.reading_helper_ranking(integer) from public;
revoke all on function public.reading_helper_my_rank() from public;
grant execute on function public.reading_helper_ranking(integer) to authenticated;
grant execute on function public.reading_helper_my_rank() to authenticated;

notify pgrst, 'reload schema';
