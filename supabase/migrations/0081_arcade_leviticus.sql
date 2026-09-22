-- 아케이드에 레위기 한 편을 더한다 (2026-09-22)
--
-- → docs/arcade/README.md
--
-- 0080 과 같은 이유로 판 이름 목록만 늘린다. 이 목록과
-- src/lib/arcade.ts 의 ARCADE_GAMES 는 **반드시 같아야** 한다 — 한쪽만 늘리면
-- 포인트가 조용히 'unknown_game' 으로 떨어지고 화면에는 아무 말도 안 뜬다.
--
-- 레위기는 유일하게 어드벤처다(손이 아니라 머리로 한다). 그래도 통과 한 번에
-- 30점은 같다 — 한 편이 십오 분쯤 걸리니 아케이드 한 판보다 오래 걸리지만,
-- 판마다 값을 다르게 매기기 시작하면 「어느 게 이득인가」를 재게 된다.
-- 하루 상한 150 도 그대로다.
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
       'basket', 'passover', 'redsea', 'manna', 'amalek',
       -- 레위기 (어드벤처)
       'levite'
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
