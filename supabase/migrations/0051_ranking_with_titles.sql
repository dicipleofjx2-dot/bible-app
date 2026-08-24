-- 순위표에 칭호와 배지를 함께 보여 준다.
--
-- 칭호를 사도 아무 데도 안 보이면 살 이유가 없다. 순위표는 성도 누구나 보는
-- 유일한 자리라, 여기 붙어야 「나도 저거 달고 싶다」가 된다.
--
-- 반환 칸이 늘어나므로 먼저 지운다 — create or replace 로는 못 바꾼다
-- (42P13: cannot change return type of existing function).

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
      -- 점수 셈은 db.ts · 관리자 현황판(0047) · 잔액(0050)과 **같은 숫자**여야 한다.
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
  '통독 점수 상위 N명. 총점으로 세우고 칭호·배지·이번 주 점수를 함께 준다. 이메일이 닉네임인 사람은 앞 세 글자만 남긴다.';

revoke all on function public.reading_helper_ranking(integer) from public;
grant execute on function public.reading_helper_ranking(integer) to authenticated;

notify pgrst, 'reload schema';
