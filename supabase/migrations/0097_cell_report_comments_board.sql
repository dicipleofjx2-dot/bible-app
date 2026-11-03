-- 목장 보고 — 관리자 댓글 + 전체 목장 보고 현황판.
--
-- 1. cell_report_comments
--    **쓰는 것은 관리자(profiles.is_admin)만.** 목자가 올린 보고에 담임이 한 줄
--    답하는 자리다. 목원끼리 주고받는 자리는 소그룹실(cell_shares)에 이미 있다.
--    읽는 것은 그 보고를 볼 수 있는 사람(그 목장 사람 + 전부 보는 사람) —
--    보고의 select 정책을 그대로 따라간다.
--
-- 2. cell_report_board(target_church_id, target_week_start)
--    목장마다 「그 주(월~일, 서울)에 모임 보고(kind='report')를 올렸나」 한 칸만
--    돌려준다. **본문은 돌려주지 않는다** — 남의 목장 보고는 여전히 그 목장
--    안에서만 읽힌다. 현황판은 목장에 속한 사람이면 누구나 본다.

-- ════════════════════════════════════════════════════════════════════
-- 1. 댓글
-- ════════════════════════════════════════════════════════════════════

create or replace function public.am_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and is_admin);
$$;

revoke all on function public.am_app_admin() from public, anon;
grant execute on function public.am_app_admin() to authenticated;

create table if not exists public.cell_report_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.cell_reports(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists cell_report_comments_report_idx
  on public.cell_report_comments (report_id, created_at)
  where deleted_at is null;

alter table public.cell_report_comments enable row level security;

drop policy if exists cell_report_comments_select on public.cell_report_comments;
create policy cell_report_comments_select on public.cell_report_comments
  for select using (
    deleted_at is null
    and exists (
      select 1 from cell_reports r
       where r.id = report_id
         and r.deleted_at is null
         and can_see_cell(r.cell_id)
    )
  );

drop policy if exists cell_report_comments_insert on public.cell_report_comments;
create policy cell_report_comments_insert on public.cell_report_comments
  for insert with check (author_id = auth.uid() and am_app_admin());

-- 지우기(deleted_at)도 관리자만.
drop policy if exists cell_report_comments_update on public.cell_report_comments;
create policy cell_report_comments_update on public.cell_report_comments
  for update using (am_app_admin()) with check (am_app_admin());

-- ════════════════════════════════════════════════════════════════════
-- 2. 현황판
-- ════════════════════════════════════════════════════════════════════

create or replace function public.cell_report_board(
  target_church_id uuid,
  target_week_start date default null
)
returns table (
  cell_id uuid,
  cell_name text,
  leader_name text,
  week_start date,
  reported boolean,
  reported_on date
)
language sql
stable
security definer
set search_path = public
as $$
  with wk as (
    select coalesce(
      target_week_start,
      date_trunc('week', (now() at time zone 'Asia/Seoul')::date)::date - 7
    ) as s
  )
  select u.id,
         u.name,
         (select lm.name from members lm where lm.id = u.leader_member_id),
         wk.s,
         r.met_on is not null,
         r.met_on
    from org_units u
    cross join wk
    left join lateral (
      select rr.met_on
        from cell_reports rr
       where rr.cell_id = u.id
         and rr.kind = 'report'
         and rr.deleted_at is null
         and rr.met_on between wk.s and wk.s + 6
       order by rr.met_on desc
       limit 1
    ) r on true
   where u.unit_type = 'cell'
     and u.is_active
     and u.church_id = target_church_id
     and (
       public.can_see_all_cells()
       or exists (
         select 1 from org_units mine
          where mine.id = public.my_cell_id()
            and mine.church_id = target_church_id
       )
     )
   order by u.sort_order, u.name;
$$;

revoke all on function public.cell_report_board(uuid, date) from public, anon;
grant execute on function public.cell_report_board(uuid, date) to authenticated;
