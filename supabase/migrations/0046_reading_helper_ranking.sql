-- 통독 점수 순위 1~5등.
--
-- ── 왜 「이번 주」로 재는가 ─────────────────────────────────────
--
-- 누적 점수로 세우면 **먼저 시작한 사람이 영원히 위**에 있다. 오늘 들어온 분은
-- 아무리 열심히 해도 1등을 볼 수 없고, 그러면 순위표는 동기부여가 아니라
-- "난 안 되겠다"가 된다. 이번 주로 끊으면 **누구나 이번 주에 열심히 하면
-- 1등을 할 수 있다.** 주가 바뀌면 판이 다시 열린다.
--
-- 주는 주일에 시작한다(교회의 한 주와 같게).
--
-- ── 왜 이름을 가리는가 ─────────────────────────────────────────
--
-- 지금 82명 중 **65명의 닉네임이 이메일 주소 그대로**다. 그대로 띄우면 순위표가
-- 교인 이메일 명부가 된다. 그래서 @ 가 들어 있으면 앞 세 글자만 남기고 가린다.
-- 닉네임을 따로 지으신 분은 그대로 나온다 — 가려지는 게 싫으면 닉네임을 지으면
-- 된다는 뜻이고, 그게 원래 있어야 할 유도다.
--
-- 순위표에는 **위 다섯만** 나온다. 꼴찌는 아무도 볼 수 없다. 못 한 사람이
-- 드러나면 부끄러워서 아예 안 들어오기 때문이다.
--
-- ── 점수 셈은 앱과 같아야 한다 ─────────────────────────────────
--
-- 아래 셈은 src/lib/readingHelper/db.ts 의 quizPoints·MEMORIZATION_POINTS·
-- SPEED_QUIZ_POINTS 와 **반드시 같은 숫자**여야 한다. 한쪽만 고치면 "내 포인트는
-- 40점인데 순위표엔 30점"이 된다.
--   퀴즈 100점→30 · 90점대→20 · 80점대→10 · 암송 성공→10 · 3초OX 성공→10

create or replace function public.reading_helper_ranking(top_n integer default 5)
returns table (rank integer, display_name text, points integer, is_me boolean)
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
        case
          when r.quiz_score >= 100 then 30
          when r.quiz_score >= 90 then 20
          when r.quiz_score >= 80 then 10
          else 0
        end
        + case when r.memorization_success then 10 else 0 end
        + case when r.speed_quiz_success then 10 else 0 end
      )::int as points
    from reading_helper_day_records r, week_start w
    where r.date >= w.d
    group by r.user_id
  ),
  ranked as (
    select
      row_number() over (order by s.points desc, s.user_id)::int as rank,
      s.user_id,
      s.points,
      coalesce(p.username, '이름 없음') as raw_name
    from scored s
    left join profiles p on p.id = s.user_id
    where s.points > 0
  )
  select
    ranked.rank,
    case
      when position('@' in ranked.raw_name) > 0
        then left(ranked.raw_name, 3) || '***'
      else ranked.raw_name
    end as display_name,
    ranked.points,
    ranked.user_id = auth.uid() as is_me
  from ranked
  where ranked.rank <= greatest(top_n, 1)
  order by ranked.rank;
$$;

comment on function public.reading_helper_ranking(integer) is
  '이번 주(주일 시작) 통독 점수 상위 N명. 이메일이 닉네임인 사람은 앞 세 글자만 남기고 가린다 — 82명 중 65명이 그렇다.';

revoke all on function public.reading_helper_ranking(integer) from public;
grant execute on function public.reading_helper_ranking(integer) to authenticated;

/**
 * 내 이번 주 순위. 다섯 등 밖이어도 자기 자리는 알아야 「조금만 더」가 된다.
 *
 * 아직 이번 주 점수가 없으면 아무것도 돌려주지 않는다 — 0점으로 꼴찌라고
 * 적어 주는 것은 격려가 아니다.
 */
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
        case
          when r.quiz_score >= 100 then 30
          when r.quiz_score >= 90 then 20
          when r.quiz_score >= 80 then 10
          else 0
        end
        + case when r.memorization_success then 10 else 0 end
        + case when r.speed_quiz_success then 10 else 0 end
      )::int as points
    from reading_helper_day_records r, week_start w
    where r.date >= w.d
    group by r.user_id
  ),
  ranked as (
    select row_number() over (order by points desc, user_id)::int as rank, user_id, points
    from scored where points > 0
  )
  select ranked.rank, ranked.points, (select count(*)::int from ranked)
  from ranked
  where ranked.user_id = auth.uid();
$$;

revoke all on function public.reading_helper_my_rank() from public;
grant execute on function public.reading_helper_my_rank() to authenticated;

notify pgrst, 'reload schema';
