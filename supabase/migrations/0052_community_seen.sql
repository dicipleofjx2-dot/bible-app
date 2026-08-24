-- 홈의 커뮤니티 아이콘에 **안 읽은 글 수**를 붙이기 위한 표.
--
-- 지금은 커뮤니티에 글이 올라와도 들어가 보기 전에는 알 수가 없다. 하루에도
-- 몇 번씩 눌러 보거나, 아예 안 보게 된다.
--
-- 읽음 표를 사람×글로 쌓지 않는다. 그러면 글 하나가 올라올 때마다 사람 수만큼
-- 행이 생기고, 나중에 지우는 일까지 따라온다. **마지막으로 본 때 하나만** 적고
-- 개수는 읽을 때 센다 — 사람마다 한 줄이면 끝이고, 사람이 늘어도 그대로다.
--
-- (같은 방식을 스마트주보의 통합관리 배지에도 썼다.)

create table if not exists community_seen (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seen_at timestamptz not null default now()
);

comment on table community_seen is
  '커뮤니티를 사람마다 마지막으로 본 때. 안 읽은 글 수는 이 때 이후로 올라온 글을 읽을 때 센다.';

alter table community_seen enable row level security;

drop policy if exists community_seen_own_select on community_seen;
create policy community_seen_own_select on community_seen
  for select using (user_id = auth.uid());

drop policy if exists community_seen_own_insert on community_seen;
create policy community_seen_own_insert on community_seen
  for insert with check (user_id = auth.uid());

drop policy if exists community_seen_own_update on community_seen;
create policy community_seen_own_update on community_seen
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

/** 커뮤니티를 지금 봤다고 적는다. user_id 는 여기서 못박는다. */
create or replace function public.community_mark_seen()
returns void
language sql
security definer
set search_path = public
as $$
  insert into community_seen (user_id, seen_at)
  select auth.uid(), now()
  where auth.uid() is not null
  on conflict (user_id) do update set seen_at = now();
$$;

/**
 * 내가 안 읽은 글 수.
 *
 * **내 글은 안 센다.** 내가 방금 쓴 글이 「안 읽은 글 1개」로 뜨면 그건 고장으로
 * 보인다.
 *
 * 한 번도 안 본 사람은 **최근 7일** 것만 센다. 아예 처음이라고 18개를 다 세면
 * 첫 화면부터 큰 숫자가 뜨고, 그건 반가움이 아니라 부담이다.
 */
create or replace function public.community_unread_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((
    select count(*)::int
      from posts p
     where p.user_id is distinct from auth.uid()
       and p.created_at > coalesce(
             (select s.seen_at from community_seen s where s.user_id = auth.uid()),
             now() - interval '7 days'
           )
  ), 0);
$$;

revoke all on function public.community_mark_seen() from public;
revoke all on function public.community_unread_count() from public;
grant execute on function public.community_mark_seen() to authenticated;
grant execute on function public.community_unread_count() to authenticated;

notify pgrst, 'reload schema';
