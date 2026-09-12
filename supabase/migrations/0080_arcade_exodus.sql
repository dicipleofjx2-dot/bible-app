-- 아케이드에 출애굽기 다섯 판을 더한다 (2026-09-13)
--
-- → docs/arcade/README.md
--
-- 0075 의 arcade_award() 는 아는 판 이름만 받는다. 새 판을 더해도 이 목록을
-- 같이 늘리지 않으면 포인트가 조용히 'unknown_game' 으로 떨어진다 —
-- 화면에는 아무 말도 안 뜨므로 며칠 지나서야 알게 된다.
--
-- ── 하루 상한은 그대로 150 ────────────────────────────────────
--
-- 판이 열 개가 되었으니 산술적으로는 하루 300점까지 가능하다. 그러나
-- arcade_daily_cap() 이 150 이므로 **그날 먼저 깬 다섯 판까지만** 포인트가
-- 붙는다. 판이 늘어도 하루에 벌 수 있는 양은 안 늘어난다 — 새 책을 더하는 것이
-- 점수 인플레가 되지 않게 하려는 것이다. 어느 판으로 채울지는 성도가 고른다.
--
-- Supabase 대시보드 SQL Editor 에서 실행할 것.

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

  if p_game not in (
       -- 창세기
       'ark', 'babel', 'sodom', 'jabbok', 'granary',
       -- 출애굽기
       'basket', 'passover', 'redsea', 'manna', 'amalek'
     ) then
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
