-- 통독을 **혼자 하는 것처럼 느끼지 않게** 한다.
--
-- 지금 38명이 같은 통독을 하고 있는데 서로 전혀 모른다. 기록을 보면 35명 중
-- 17명이 첫 이틀 안에 멈췄고, 닷새를 넘긴 사람은 거의 다 남아 있다. 첫 주를
-- 넘기느냐가 갈림길인데, 그 며칠을 버티게 하는 것은 대개 「나만 하는 게
-- 아니구나」다.
--
-- **이름은 절대 내보내지 않는다.** 누가 했는지 보이면, 못 한 사람은 부끄러워서
-- 아예 안 들어온다. 그러면 도우려던 것이 정확히 반대로 작동한다. 그래서
-- 오늘 몇 명이 읽었는지와 전체 몇 명인지, **숫자 둘만** 돌려준다.
--
-- security definer 로 두는 이유: 남의 기록을 읽어야 세는데, RLS 는 (당연히)
-- 자기 것만 보게 막고 있다. 함수가 세어서 숫자만 내주면 RLS 를 넓히지 않고도
-- 된다 — 표를 열어 주면 누가 며칠 빠졌는지까지 다 보인다.

create or replace function public.reading_helper_today_together(target_date date default null)
returns table (read_today integer, joined_total integer)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(distinct r.user_id)::int
       from reading_helper_day_records r
      where r.date = coalesce(target_date, current_date)
        and r.reading_complete = true),
    (select count(*)::int from reading_helper_progress);
$$;

comment on function public.reading_helper_today_together(date) is
  '오늘 통독을 마친 사람 수와 통독을 시작한 전체 인원. 이름은 내보내지 않는다 — 못 한 사람이 부끄럽지 않아야 계속 들어온다.';

revoke all on function public.reading_helper_today_together(date) from public;
grant execute on function public.reading_helper_today_together(date) to authenticated;

notify pgrst, 'reload schema';
