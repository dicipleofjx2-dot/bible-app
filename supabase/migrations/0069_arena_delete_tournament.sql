-- 잘못 만든 대회를 지운다.
--
-- 같은 대회를 두 번 만들어도 지울 방법이 없었다. 관리자 화면에 만들기만 있고
-- 지우기가 없다.
--
-- ── 아무 대회나 지우면 안 된다 ──────────────────────────────────────
-- arena_point_ledger.tournament_id 가 on delete cascade 다. 참가비를 걷은
-- 대회를 지우면 **성도들이 낸 20점이 기록째 사라진다.** 잔액은 그 장부를
-- 합쳐 셈하므로, 낸 적이 없는 것이 되어 점수가 소리 없이 늘어난다.
-- 치른 경기도 마찬가지다 — 이긴 사람의 기록이 통째로 없어진다.
--
-- 그래서 **비어 있는 대회만** 지운다. 잘못 만들어 아무도 안 들어온 것이
-- 그것이고, 실제로 지우고 싶은 것도 그것뿐이다.
--
-- 이미 시작된 대회를 접어야 하면 지우지 말고 status 를 'done' 으로 내린다.
-- 기록은 남고 목록에서는 끝난 대회로 보인다.

create or replace function public.arena_delete_tournament(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger integer;
  v_played integer;
  v_entrants integer;
begin
  if not arena_is_admin() then
    raise exception '관리자만 지울 수 있습니다.';
  end if;

  select count(*) into v_ledger
    from arena_point_ledger where tournament_id = p_tournament_id;
  if v_ledger > 0 then
    raise exception '참가비나 상금이 오간 대회는 지울 수 없습니다. 대회를 끝내기로 바꿔 주세요.';
  end if;

  select count(*) into v_played
    from arena_tournament_matches
   where tournament_id = p_tournament_id
     and (winner is not null or score_a is not null or score_b is not null);
  if v_played > 0 then
    raise exception '이미 치른 경기가 있는 대회는 지울 수 없습니다. 대회를 끝내기로 바꿔 주세요.';
  end if;

  select count(*) into v_entrants
    from arena_tournament_entrants where tournament_id = p_tournament_id;
  if v_entrants > 0 then
    raise exception '예선을 통과한 사람이 있는 대회는 지울 수 없습니다. 대회를 끝내기로 바꿔 주세요.';
  end if;

  -- 여기까지 왔으면 아무도 손대지 않은 대회다. 짝지어 둔 빈 경기표만 딸려
  -- 지워진다(matches 는 tournament_id 에 on delete cascade).
  delete from arena_tournaments where id = p_tournament_id;
end;
$$;

revoke all on function public.arena_delete_tournament(uuid) from public, anon;
grant execute on function public.arena_delete_tournament(uuid) to authenticated;

comment on function public.arena_delete_tournament(uuid) is
  '잘못 만든 빈 대회를 지운다. 참가비·상금·치른 경기·예선 통과자가 있으면 거절한다.';
