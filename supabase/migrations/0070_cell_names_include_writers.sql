-- 목장방에서 글쓴이가 「이름 없음」으로 뜨던 것을 고친다.
--
-- 0068 의 cell_member_names() 는 **그 목장 소속인 사람**의 이름만 돌려준다.
-- 그런데 글을 쓸 수 있는 사람은 그보다 넓다:
--
--   · 관리자와 교역자는 어느 목장에나 들어가 글을 쓴다(can_see_cell).
--   · 목장을 옮긴 사람의 옛 글은 그 목장에 남는다.
--   · 교적에 목장이 안 정해진 사람도 관리자면 쓸 수 있다.
--
-- 실제로 대표관리자(교적상 목장 없음)가 목장방에 글을 쓰니 자기 이름이
-- 「이름 없음」으로 떴다. 같은 화면에서 그 목장 목원인 분은 제대로 나왔다.
--
-- 그래서 **그 목장에 실제로 글을 쓴 사람**까지 이름을 돌려준다. 울타리는
-- 그대로다 — 아무 user_id 나 넣어 이름을 캐낼 수는 없고, 그 목장을 볼 수
-- 있는 사람이 그 목장에 남은 글의 글쓴이 이름만 본다. 글은 어차피 그 사람들
-- 눈앞에 보이고 있다.

create or replace function public.cell_member_names(target_cell_id uuid)
returns table (user_id uuid, display_name text)
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
  with folk as (
    -- 지금 그 목장 사람
    select m.user_id as uid
      from members m
     where m.cell_id = target_cell_id
       and m.deleted_at is null
       and m.user_id is not null
    union
    -- 그 목장에 글을 쓴 사람 (관리자·교역자·옮겨 간 사람)
    select t.author_id from cell_messages t where t.cell_id = target_cell_id
    union
    select r.author_id from cell_reports r where r.cell_id = target_cell_id
    union
    select n.author_id from cell_notices n where n.cell_id = target_cell_id
  )
  select
    f.uid,
    coalesce(
      -- 1순위: 교적 실명
      (select m.name from members m
        where m.user_id = f.uid and m.deleted_at is null
        order by m.created_at limit 1),
      -- 2순위: 주보에 적어 둔 이름 (이메일이 아닌 것만)
      (select bp.display_name from bulletin_profiles bp
        where bp.user_id = f.uid
          and bp.display_name is not null
          and position('@' in bp.display_name) = 0
        limit 1),
      -- 3순위: 이 앱의 닉네임 (이메일이 아닌 것만)
      (select p.username from profiles p
        where p.id = f.uid and p.username is not null
          and position('@' in p.username) = 0),
      -- 4순위: 이메일 앞부분. 이메일을 통째로 보여 주는 것보다는 낫다.
      (select split_part(p.username, '@', 1) from profiles p where p.id = f.uid),
      '이름 없음'
    )
  from folk f
  where f.uid is not null;
end;
$$;

revoke all on function public.cell_member_names(uuid) from public, anon;
grant execute on function public.cell_member_names(uuid) to authenticated;
