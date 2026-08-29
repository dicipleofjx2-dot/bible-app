-- R2M 목장방 — 목장마다 방 하나.
--
-- 목원은 자기 목장 하나만 보이고, 그 방이 곧 "우리 목장방"으로 뜬다.
-- 관리자와 교역자는 모든 목장을 본다.
--
-- ── 새로 만들지 않은 것들 ───────────────────────────────────────────
-- 이 파일이 만드는 표는 셋뿐이다. 나머지는 이미 있는 것을 그대로 쓴다.
--
--   목장 목록      org_units (unit_type = 'cell')        — 스마트주보 교적
--   누가 어느 목장  members.cell_id
--   앱 계정 ↔ 교인  members.user_id
--   목자 자격      church_memberships.role = 'cell_leader'
--   모임 시간·장소  gather_recurrences (category='cell', org_unit_id)
--   심방 기록      care_records (record_type = 'visit')
--   기도제목       prayer_requests (샬롬기도단, 0015)
--
-- **모임 시간·장소를 여기에 또 적지 않는다.** gather_recurrences 에 목장 모임을
-- 등록하면 events 로 펼쳐져서 주보의 "이번 주 예배와 모임"과 교회 캘린더에도
-- 같이 뜬다. 목장방에만 따로 적으면 한 사실이 두 군데가 되고, 반드시 어긋난다.
--
-- **기도제목도 여기에 두지 않는다.** 이미 샬롬기도단(prayer_requests)이 있다.
-- 목장방에서는 그리로 보내기만 한다.

-- ════════════════════════════════════════════════════════════════════
-- 1. 판정 함수
-- ════════════════════════════════════════════════════════════════════
--
-- security definer 로 두는 이유는 0035 와 같다 — 정책 안에서 members·
-- church_memberships 를 보는데 그 표에도 RLS 가 걸려 있어 정책이 정책을 타면
-- 재귀가 생긴다. search_path 도 같은 이유로 고정한다.

/** 나는 어느 목장 사람인가. 교적에 안 걸려 있으면 null — 아무 방도 안 보인다. */
create or replace function public.my_cell_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.cell_id
    from members m
   where m.user_id = auth.uid()
     and m.deleted_at is null
   limit 1;
$$;

/**
 * 이 목장의 목자인가.
 *
 * 두 가지를 본다:
 *   1. org_units.leader_member_id 가 나를 가리키면 목자다. **이것이 정본이다.**
 *   2. 그 칸이 비어 있으면, cell_leader 자격이 있고 내 소속이 그 목장이면 목자로 본다.
 *
 * 2번을 둔 이유: 지금 교적의 leader_member_id 가 11개 목장 전부 비어 있다.
 * 그 칸을 채우기 전까지 이 기능이 통째로 멈추지 않게 하려는 임시 다리다.
 * **채우고 나면 1번이 이기므로**, 목자를 바꿀 때는 leader_member_id 를 고치면 된다.
 */
create or replace function public.is_cell_leader_of(target_cell_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from org_units u
      join members m on m.id = u.leader_member_id
     where u.id = target_cell_id
       and m.user_id = auth.uid()
       and m.deleted_at is null
  )
  or exists (
    select 1
      from members m
      join church_memberships cm
        on cm.user_id = m.user_id
       and cm.church_id = m.church_id
     where m.user_id = auth.uid()
       and m.deleted_at is null
       and m.cell_id = target_cell_id
       and cm.role = 'cell_leader'
       and cm.is_active
       and not exists (
         select 1 from org_units u2
          where u2.id = target_cell_id and u2.leader_member_id is not null
       )
  );
$$;

/**
 * 목장방을 전부 볼 수 있는 사람.
 *
 * 데이빗바이블의 관리자(profiles.is_admin)와 교회의 대표관리자·관리자·교역자를
 * 모두 통과시킨다. 둘을 함께 보는 이유: 이 앱의 관리자와 교회의 관리자가 늘
 * 같은 사람은 아니다.
 */
create or replace function public.can_see_all_cells()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and is_admin)
      or exists (
        select 1 from church_memberships cm
         where cm.user_id = auth.uid()
           and cm.is_active
           and cm.role in ('owner', 'admin', 'pastor')
      );
$$;

/** 이 목장을 볼 수 있는가 — 내 목장이거나, 전부 보는 사람이거나. */
create or replace function public.can_see_cell(target_cell_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_cell_id is not null
     and (can_see_all_cells() or my_cell_id() = target_cell_id);
$$;

revoke all on function public.my_cell_id() from public, anon;
revoke all on function public.is_cell_leader_of(uuid) from public, anon;
revoke all on function public.can_see_all_cells() from public, anon;
revoke all on function public.can_see_cell(uuid) from public, anon;
grant execute on function public.my_cell_id() to authenticated;
grant execute on function public.is_cell_leader_of(uuid) to authenticated;
grant execute on function public.can_see_all_cells() to authenticated;
grant execute on function public.can_see_cell(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 2. cell_notices — 공지
-- ════════════════════════════════════════════════════════════════════
--
-- cell_id 가 null 이면 **전체 공지**다. 모든 목장방 맨 위에 함께 뜬다.
-- 전체 공지는 관리자만 쓴다. 목장 공지는 그 목장 목자가 쓴다.

create table if not exists public.cell_notices (
  id uuid primary key default gen_random_uuid(),
  -- null = 전체 공지
  cell_id uuid references org_units(id) on delete cascade,
  title text not null,
  body text not null,
  -- 맨 위에 고정
  is_pinned boolean not null default false,
  author_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists cell_notices_cell_idx
  on public.cell_notices (cell_id, is_pinned desc, created_at desc)
  where deleted_at is null;

alter table public.cell_notices enable row level security;

drop policy if exists cell_notices_select on public.cell_notices;
create policy cell_notices_select on public.cell_notices
  for select using (
    deleted_at is null
    and (cell_id is null or can_see_cell(cell_id))
  );

drop policy if exists cell_notices_insert on public.cell_notices;
create policy cell_notices_insert on public.cell_notices
  for insert with check (
    author_id = auth.uid()
    and (
      -- 전체 공지는 관리자만
      (cell_id is null and can_see_all_cells())
      -- 목장 공지는 그 목장 목자, 또는 관리자
      or (cell_id is not null and (is_cell_leader_of(cell_id) or can_see_all_cells()))
    )
  );

-- 고치고 지우는 것은 쓴 사람과 관리자만. 지우기는 소프트 삭제(update)로 한다.
drop policy if exists cell_notices_update on public.cell_notices;
create policy cell_notices_update on public.cell_notices
  for update using (author_id = auth.uid() or can_see_all_cells())
  with check (author_id = auth.uid() or can_see_all_cells());

-- ════════════════════════════════════════════════════════════════════
-- 3. cell_reports — 목장 보고와 상황
-- ════════════════════════════════════════════════════════════════════
--
-- 목장 모임을 하고 난 뒤 목자나 목원이 올린다. 기도제목은 여기 두지 않는다
-- (샬롬기도단이 따로 있다). 여기 담기는 것은 "어떻게 모였고 무슨 일이 있었나"다.
--
-- met_on 을 따로 두는 이유: 올린 날과 모인 날이 다르다. 목요일에 모이고 주일에
-- 올리는 일이 흔하다. 목록은 **모인 날** 기준으로 세워야 말이 된다.

create table if not exists public.cell_reports (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references org_units(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  -- 'report' = 모임 보고(목자), 'note' = 목원이 남기는 소감·상황
  kind text not null default 'note' check (kind in ('report', 'note')),
  met_on date not null default current_date,
  body text not null,
  -- 모인 사람 수. 적고 싶을 때만 적는다.
  attendance integer check (attendance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists cell_reports_cell_idx
  on public.cell_reports (cell_id, met_on desc, created_at desc)
  where deleted_at is null;

alter table public.cell_reports enable row level security;

-- 목장 안에서는 서로 본다. 나눔은 원래 서로 보는 것이다.
drop policy if exists cell_reports_select on public.cell_reports;
create policy cell_reports_select on public.cell_reports
  for select using (deleted_at is null and can_see_cell(cell_id));

-- 쓰는 것은 그 목장 사람이면 누구나. 'report'(모임 보고)는 목자만.
drop policy if exists cell_reports_insert on public.cell_reports;
create policy cell_reports_insert on public.cell_reports
  for insert with check (
    author_id = auth.uid()
    and can_see_cell(cell_id)
    and (kind = 'note' or is_cell_leader_of(cell_id) or can_see_all_cells())
  );

drop policy if exists cell_reports_update on public.cell_reports;
create policy cell_reports_update on public.cell_reports
  for update using (author_id = auth.uid() or can_see_all_cells())
  with check (author_id = auth.uid() or can_see_all_cells());

-- ════════════════════════════════════════════════════════════════════
-- 4. cell_visit_requests — 심방 신청
-- ════════════════════════════════════════════════════════════════════
--
-- 목자가 담임목사에게 심방을 청한다. **목자에게만 단추가 보인다.**
--
-- 이 표는 두 앱이 함께 읽는다 — 데이빗바이블이 넣고, 스마트주보의 목양 화면이
-- 읽는다. 같은 데이터베이스를 쓰므로 앱끼리 서로를 부를 필요가 없다.
-- 심방을 다녀오면 주보에서 care_records(record_type='visit')로 옮겨 적고
-- 여기 status 를 'done' 으로 내린다.

create table if not exists public.cell_visit_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  cell_id uuid not null references org_units(id) on delete cascade,
  -- 신청한 목자
  requester_id uuid not null references auth.users(id) on delete cascade,
  -- 심방받을 사람(교적). 목장 전체를 청할 수도 있어 비워 둘 수 있다.
  member_id uuid references members(id) on delete set null,
  reason text not null,
  -- 언제쯤이면 좋은지. 자유롭게 적는다("주중 저녁", "이번 주 토요일").
  preferred_when text,
  urgency text not null default 'normal' check (urgency in ('normal', 'soon', 'urgent')),
  status text not null default 'open' check (status in ('open', 'scheduled', 'done', 'cancelled')),
  -- 목양 쪽에서 남기는 답
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  handler_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cell_visit_requests_church_idx
  on public.cell_visit_requests (church_id, status, created_at desc);
create index if not exists cell_visit_requests_cell_idx
  on public.cell_visit_requests (cell_id, created_at desc);

alter table public.cell_visit_requests enable row level security;

-- 신청한 목자 본인과, 목양을 보는 사람들이 읽는다.
-- 목원에게는 보이지 않는다 — 심방 사유에는 사정이 담긴다.
drop policy if exists cell_visit_requests_select on public.cell_visit_requests;
create policy cell_visit_requests_select on public.cell_visit_requests
  for select using (requester_id = auth.uid() or can_see_all_cells());

drop policy if exists cell_visit_requests_insert on public.cell_visit_requests;
create policy cell_visit_requests_insert on public.cell_visit_requests
  for insert with check (
    requester_id = auth.uid()
    and is_cell_leader_of(cell_id)
  );

-- 목양 쪽에서 처리한다. 목자는 자기가 낸 것을 취소할 수 있다.
drop policy if exists cell_visit_requests_update on public.cell_visit_requests;
create policy cell_visit_requests_update on public.cell_visit_requests
  for update using (can_see_all_cells() or requester_id = auth.uid())
  with check (can_see_all_cells() or requester_id = auth.uid());

-- ── updated_at 자동 갱신 ────────────────────────────────────────────
create or replace function public.cell_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists cell_notices_touch on public.cell_notices;
create trigger cell_notices_touch before update on public.cell_notices
  for each row execute function public.cell_set_updated_at();

drop trigger if exists cell_reports_touch on public.cell_reports;
create trigger cell_reports_touch before update on public.cell_reports
  for each row execute function public.cell_set_updated_at();

drop trigger if exists cell_visit_requests_touch on public.cell_visit_requests;
create trigger cell_visit_requests_touch before update on public.cell_visit_requests
  for each row execute function public.cell_set_updated_at();
