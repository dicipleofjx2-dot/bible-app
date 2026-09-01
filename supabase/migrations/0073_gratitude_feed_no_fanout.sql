-- 함께 나눈 감사가 두 번 뜨는 것을 막는다.
--
-- 0072 의 gratitude_shared_feed 는 이름을 붙이려고 members 와 bulletin_profiles 를
-- **join** 했다. 그런데 `members.user_id` 에는 **유일 제약이 없다**
-- (0006_member_registry.sql:150 — `references auth.users(id) on delete set null` 뿐).
-- 한 사람이 교적에 두 줄로 들어 있으면(실제로 김기쁨·김은진 님이 두 줄이다)
-- 그 사람의 감사 한 개가 **목록에 두 번** 뜬다. 지금은 두 줄 중 한쪽에만 계정이
-- 붙어 있어 안 터졌을 뿐이고, 교적을 정리하다 계정을 붙이는 순간 터진다.
--
-- join 을 스칼라 부질의로 바꾸면 몇 줄이 걸리든 값은 하나다.
-- 이름이 여럿일 때 어느 것을 고를지도 못 박는다(가장 먼저 등록된 교적).

create or replace function public.gratitude_shared_feed(p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  author_name text,
  date date,
  item1 text,
  item2 text,
  item3 text,
  note text,
  photo_paths text[],
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select g.id, g.user_id,
         coalesce(
           nullif((select m.name
                     from members m
                    where m.user_id = g.user_id
                    order by m.created_at nulls last, m.id
                    limit 1), ''),
           nullif((select bp.display_name
                     from bulletin_profiles bp
                    where bp.user_id = g.user_id
                    order by bp.created_at nulls last, bp.id
                    limit 1), ''),
           '이름 없음'
         ) as author_name,
         g.date, g.item1, g.item2, g.item3, g.note, g.photo_paths, g.created_at
    from gratitude_entries g
   where g.is_shared
   order by g.date desc, g.created_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

revoke all on function public.gratitude_shared_feed(int) from public, anon;
grant execute on function public.gratitude_shared_feed(int) to authenticated;
