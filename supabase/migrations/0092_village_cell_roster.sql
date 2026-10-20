-- 0092 · 목장 식구 명단 — 글쓴이가 아니라 **교적상 목장 사람**만
--
-- cell_member_names()(0068·0070)는 이름표라서 그 목장에 글을 쓴 관리자·교역자도 돌려준다.
-- 글쓴이 이름을 보여 주려면 그래야 한다. 그런데 화면의 「우리 목장 식구」와 참석 확인은
-- 그 이름표 전체로 그리고 있어서, 관리자가 소통창에 글 한 줄만 써도 그 목장 식구로 뜬다.
--
-- 그래서 교적상 그 목장 소속인 사람의 user_id 만 돌려주는 함수를 따로 둔다.
-- 화면은 이름표(names)는 그대로 쓰고, **명단을 그릴 때만** 이 목록으로 거른다.

create or replace function public.cell_roster(target_cell_id uuid)
returns table (user_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not can_see_cell(target_cell_id) then
    raise exception '우리 목장만 볼 수 있습니다.';
  end if;

  return query
  select m.user_id
    from members m
   where m.cell_id = target_cell_id
     and m.deleted_at is null
     and m.user_id is not null;
end;
$$;

revoke all on function public.cell_roster(uuid) from public, anon;
grant execute on function public.cell_roster(uuid) to authenticated;
