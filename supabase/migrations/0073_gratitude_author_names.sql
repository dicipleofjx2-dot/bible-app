-- 함께 나눈 감사에 **이름**이 제대로 뜨게 한다.
--
-- 0072 의 gratitude_shared_feed 는 이름을 이렇게 골랐다:
--
--     coalesce(members.name, bulletin_profiles.display_name, '이름 없음')
--
-- 두 가지가 잘못됐다.
--
-- 1. **이메일이 이름 자리에 뜬다.** bulletin_profiles.display_name 에 이메일이
--    그대로 들어 있는 계정이 많다(0056: 82명 중 65명). 샬롬기도단에서 똑같은
--    일이 있었고 0066 이 그것을 고쳤는데, 감사일기장에서 같은 실수를 반복했다.
--    감사는 기도제목보다 더 넓게 보이는 자리라 이대로 두면 남의 이메일이
--    교인 모두에게 뿌려진다.
-- 2. **join 이라 줄이 불어난다.** 교적에 같은 사람 줄이 둘인 경우가 실제로
--    있다(김기쁨·김은진). 그러면 감사 한 건이 목록에 두 번 뜬다. 스칼라
--    하위질의로 바꾸면 이 문제가 아예 안 생긴다.
--
-- 0066 의 사다리를 그대로 쓴다 — 교적 실명 → 주보 이름 → 앱 닉네임 →
-- 이메일 앞부분 → 「이름 없음」. 어느 단계든 **@ 가 들어간 값은 건너뛴다.**

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
  select
    g.id,
    g.user_id,
    coalesce(
      -- 1순위: 교적부 실명
      (select m.name from members m
        where m.user_id = g.user_id and m.deleted_at is null
        order by m.created_at limit 1),
      -- 2순위: 주보에 적어 둔 이름 (이메일이 아닌 것만)
      (select bp.display_name from bulletin_profiles bp
        where bp.user_id = g.user_id
          and bp.display_name is not null
          and position('@' in bp.display_name) = 0
        limit 1),
      -- 3순위: 이 앱의 닉네임 (이메일이 아닌 것만)
      (select p.username from profiles p
        where p.id = g.user_id and p.username is not null
          and position('@' in p.username) = 0),
      -- 4순위: 이메일 앞부분. 통째로 보여 주는 것보다는 낫다.
      (select split_part(p.username, '@', 1) from profiles p where p.id = g.user_id),
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

comment on function public.gratitude_shared_feed(int) is
  '함께 나누기를 켠 감사만. 이름은 교적 실명부터 찾고, @ 가 들어간 값은 이름으로 쓰지 않는다.';
