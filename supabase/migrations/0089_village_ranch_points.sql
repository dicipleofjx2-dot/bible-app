-- 0089 · 방주 목장 점수 + 전도·정착 지원
--
-- 두 갈래다. **서로 섞지 않는다.**
--
--   1. 활동 점수(ranch_activity) — 예배·목장 출석과, 목장모임 때 적은 기도 시간·통독량.
--      목장의 먹이가 될 뿐 돈으로 바뀌지 않는다(points-shop-no-cashback 과 같은 선).
--   2. 전도·정착 지원(cell_evangelism) — 새가족이 정착하면 목장 활동비로 가는
--      지원금. 신청 → 승인 → 지급 기록의 사람 손을 거친다. 포인트로 환전되지 않는다.
--
-- 활동 점수는 합계만 돌려준다. 누가 몇 점인지 순위가 되지 않게, 목장 전체 합과
-- 「내 것」 둘뿐이다.

-- ════════════════════════════════════════════════════════════════════
-- 1. 활동 점수
-- ════════════════════════════════════════════════════════════════════
--
-- 기준: 한 사람이 **한 주에** 기도 7시간, 통독 23장.
-- 목장 식구가 3명이면 한 주 목표는 기도 21시간, 통독 69장이다.
--
-- 기도와 통독은 **목장모임에서 적는다**(cell_gathering_habits). 모임 때 「이번 주 기도한
-- 시간」과 「읽은 장 수」를 식구마다 적고, 목표에 얼마나 닿았는지 비율로 점수가 된다.
-- 목표를 넘겨 읽어도 점수는 목표까지만 센다(부풀려 경쟁하지 않게). 칭찬은 숫자 밖에서.
--
-- 예배·목장 출석은 하루 한 번씩 센다:
--   sunday  주일예배      attendance_sessions.meeting_type = 'sunday_service'
--   midweek 수요·금요·새벽  'wednesday' | 'friday' | 'dawn_prayer'
--   cell    목장모임      'cell_meeting' + 목장모임 방(cell_gatherings)의 참석 — 같은 날이면 1
--
-- p_since 를 두는 까닭: 교적에 쌓인 옛 출석을 다 세면 처음 여는 날 방주가 한꺼번에
-- 가득 찬다. 「첫 수집은 하루치가 아니다」. 기본값은 이 기능을 연 날이다.

create table if not exists public.cell_gathering_habits (
  gathering_id uuid not null references public.cell_gatherings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 이 모임까지 한 주 동안 기도한 시간(분)과 읽은 성경 장 수
  prayer_minutes integer not null default 0 check (prayer_minutes between 0 and 3000),
  chapters integer not null default 0 check (chapters between 0 and 1200),
  recorded_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (gathering_id, user_id)
);

alter table public.cell_gathering_habits enable row level security;

-- 본인 것은 본인이, 목자·관리자는 자기 목장 식구 것을 적고 고친다. 읽기는 같은 목장.
-- (개인별 숫자는 목장 안에서만 보이고, 점수 합계 함수는 합계만 돌려준다.)
drop policy if exists cell_habits_select on public.cell_gathering_habits;
create policy cell_habits_select on public.cell_gathering_habits
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.cell_gatherings g
                where g.id = gathering_id and (is_cell_leader_of(g.cell_id) or can_see_all_cells()))
  );

drop policy if exists cell_habits_write on public.cell_gathering_habits;
create policy cell_habits_write on public.cell_gathering_habits
  for insert with check (
    exists (select 1 from public.cell_gatherings g
             where g.id = gathering_id
               and (user_id = auth.uid() or is_cell_leader_of(g.cell_id) or can_see_all_cells())
               and can_see_cell(g.cell_id))
  );

drop policy if exists cell_habits_update on public.cell_gathering_habits;
create policy cell_habits_update on public.cell_gathering_habits
  for update using (
    user_id = auth.uid()
    or exists (select 1 from public.cell_gatherings g
                where g.id = gathering_id and (is_cell_leader_of(g.cell_id) or can_see_all_cells()))
  ) with check (
    user_id = auth.uid()
    or exists (select 1 from public.cell_gatherings g
                where g.id = gathering_id and (is_cell_leader_of(g.cell_id) or can_see_all_cells()))
  );

-- 합계. 기도 420분/주, 통독 23장/주 를 한도로 사람마다 잘라서 더한다.
create or replace function public.ranch_activity(
  p_cell uuid,
  p_only_me boolean default false,
  p_since date default date '2026-10-14'
)
returns table (
  sunday integer,
  midweek integer,
  cell integer,
  prayer_minutes integer,
  chapters integer,
  last_prayer_minutes integer,
  last_chapters integer,
  last_recorded integer,
  members_total integer,
  members_active integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (can_see_cell(p_cell) or can_see_all_cells()) then
    raise exception 'not_allowed';
  end if;

  return query
  with mem as (
    select m.id as member_id, m.user_id
      from members m
     where m.cell_id = p_cell
       and m.deleted_at is null
       and (not p_only_me or m.user_id = auth.uid())
  ),
  att as (
    select mem.member_id, s.meeting_date as d, s.meeting_type as t
      from mem
      join attendance_records r on r.member_id = mem.member_id
                               and r.status in ('present', 'online', 'late')
      join attendance_sessions s on s.id = r.session_id
     where s.meeting_date >= p_since
       and s.meeting_type in ('sunday_service', 'wednesday', 'friday', 'dawn_prayer', 'cell_meeting')
  ),
  room as (
    select mem.member_id, g.meet_on as d
      from mem
      join cell_gathering_attendance a on a.user_id = mem.user_id and a.attended is true
      join cell_gatherings g on g.id = a.gathering_id and g.deleted_at is null
     where g.meet_on >= p_since
  ),
  cell_days as (
    select member_id, d from att where t = 'cell_meeting'
    union
    select member_id, d from room
  ),
  hab as (
    select h.user_id, g.id as gid, g.meet_on,
           least(h.prayer_minutes, 420) as pm, least(h.chapters, 23) as ch,
           h.prayer_minutes as raw_pm, h.chapters as raw_ch
      from mem
      join cell_gathering_habits h on h.user_id = mem.user_id
      join cell_gatherings g on g.id = h.gathering_id and g.cell_id = p_cell and g.deleted_at is null
     where g.meet_on >= p_since
  ),
  last_g as (
    select gid from hab order by meet_on desc, gid limit 1
  ),
  active_recent as (
    select member_id from att where d >= current_date - 30
    union select member_id from cell_days where d >= current_date - 30
    union select mem.member_id from mem join hab on hab.user_id = mem.user_id
                                       where hab.meet_on >= current_date - 30
  )
  select
    (select count(distinct (member_id, d))::integer from att where t = 'sunday_service'),
    (select count(distinct (member_id, d))::integer from att where t in ('wednesday', 'friday', 'dawn_prayer')),
    (select count(*)::integer from cell_days),
    (select coalesce(sum(pm), 0)::integer from hab),
    (select coalesce(sum(ch), 0)::integer from hab),
    (select coalesce(sum(raw_pm), 0)::integer from hab where gid = (select gid from last_g)),
    (select coalesce(sum(raw_ch), 0)::integer from hab where gid = (select gid from last_g)),
    (select count(*)::integer from hab where gid = (select gid from last_g)),
    (select count(*)::integer from mem),
    (select count(*)::integer from active_recent);
end;
$$;

revoke all on function public.ranch_activity(uuid, boolean, date) from public, anon;
grant execute on function public.ranch_activity(uuid, boolean, date) to authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 2. 전도·정착 지원
-- ════════════════════════════════════════════════════════════════════
--
-- 흐름:  watching(지켜봄) → claimed(목자 신청) → approved(교회 관리자 승인) → paid(지급 기록)
--                                              ↘ rejected(반려)
--
-- 정착 = 등록한 날부터 8주(56일) 안에 주일예배·목장모임에 서로 다른 날 6번 출석.
-- 한 사람은 한 번만(unique). 금액은 **신청한 때의 값을 이 줄에 박아 둔다** —
-- 나중에 기준이 바뀌어도 이미 낸 신청의 금액이 변하지 않는다.
--
-- 쓰기는 모두 함수로만 한다. RLS 는 칸을 못 지키므로(상태·금액을 목자가 직접 바꾸면
-- 끝이다) 표에는 정책을 두지 않고, 읽기도 함수를 거친다.

create table if not exists public.cell_evangelism (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  cell_id uuid not null references org_units(id) on delete cascade,
  newcomer_member_id uuid not null references members(id) on delete cascade,
  -- 전도한 사람(교적). 앱 계정이 없어도 된다. 지원금은 이 사람이 아니라 목장으로 간다.
  referrer_member_id uuid references members(id) on delete set null,
  registered_on date not null default current_date,
  status text not null default 'watching'
    check (status in ('watching', 'claimed', 'approved', 'rejected', 'paid')),
  amount_evangelism integer,
  amount_growth integer,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  paid_by uuid references auth.users(id) on delete set null,
  paid_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (newcomer_member_id)
);

create index if not exists cell_evangelism_cell_idx on public.cell_evangelism (cell_id, status);

alter table public.cell_evangelism enable row level security;
-- 일부러 정책 없음: 직접 읽기·쓰기 모두 막고 아래 함수로만 다룬다.

-- 정착 출석 수(등록일 기준 8주 창). 신청 때와 화면이 같은 계산을 쓰도록 한 곳에 둔다.
create or replace function public.ranch_settled_days(p_member uuid, p_from date)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with m as (select id, user_id from members where id = p_member),
  a as (
    select s.meeting_date as d
      from m
      join attendance_records r on r.member_id = m.id and r.status in ('present', 'online', 'late')
      join attendance_sessions s on s.id = r.session_id
     where s.meeting_type in ('sunday_service', 'cell_meeting')
       and s.meeting_date >= p_from and s.meeting_date < p_from + 56
    union
    select g.meet_on
      from m
      join cell_gathering_attendance x on x.user_id = m.user_id and x.attended is true
      join cell_gatherings g on g.id = x.gathering_id and g.deleted_at is null
     where g.meet_on >= p_from and g.meet_on < p_from + 56
  )
  select count(*)::integer from a;
$$;

revoke all on function public.ranch_settled_days(uuid, date) from public, anon, authenticated;

-- 목록. 목장은 자기 목장 것, 교회 관리자는 모든 목장의 것(p_cell = null).
create or replace function public.ranch_evangelism_list(p_cell uuid default null)
returns table (
  id uuid,
  cell_id uuid,
  cell_name text,
  newcomer_member_id uuid,
  newcomer_name text,
  referrer_name text,
  registered_on date,
  status text,
  settled_days integer,
  amount_evangelism integer,
  amount_growth integer,
  claimed_at timestamptz,
  decided_at timestamptz,
  decision_note text,
  paid_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_cell is not null then
    if not (can_see_cell(p_cell) or can_see_all_cells()) then
      raise exception 'not_allowed';
    end if;
  elsif not exists (select 1 from members m where m.user_id = auth.uid() and is_church_admin(m.church_id))
        and not can_see_all_cells() then
    raise exception 'not_allowed';
  end if;

  return query
  select e.id, e.cell_id, u.name, e.newcomer_member_id, n.name, r.name,
         e.registered_on, e.status,
         public.ranch_settled_days(e.newcomer_member_id, e.registered_on),
         e.amount_evangelism, e.amount_growth,
         e.claimed_at, e.decided_at, e.decision_note, e.paid_at
    from cell_evangelism e
    join members n on n.id = e.newcomer_member_id
    left join members r on r.id = e.referrer_member_id
    join org_units u on u.id = e.cell_id
   where (p_cell is null or e.cell_id = p_cell)
   order by e.created_at desc;
end;
$$;

-- 새가족 기록. 목자(또는 전체 관리자)가 자기 목장의 교인을 올린다.
create or replace function public.ranch_evangelism_add(
  p_cell uuid,
  p_newcomer uuid,
  p_referrer uuid default null,
  p_registered_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_id uuid;
begin
  if not (is_cell_leader_of(p_cell) or can_see_all_cells()) then
    raise exception 'not_allowed';
  end if;
  select m.church_id into v_church
    from members m
   where m.id = p_newcomer and m.cell_id = p_cell and m.deleted_at is null;
  if v_church is null then
    raise exception 'newcomer_not_in_cell';
  end if;
  insert into cell_evangelism (church_id, cell_id, newcomer_member_id, referrer_member_id, registered_on, created_by)
  values (v_church, p_cell, p_newcomer, p_referrer, coalesce(p_registered_on, current_date), auth.uid())
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'already_recorded';
end;
$$;

-- 신청. 정착 조건을 **여기서 다시 센다** — 화면의 숫자를 믿지 않는다.
create or replace function public.ranch_evangelism_claim(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e cell_evangelism;
begin
  select * into e from cell_evangelism where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if not (is_cell_leader_of(e.cell_id) or can_see_all_cells()) then
    raise exception 'not_allowed';
  end if;
  if e.status <> 'watching' then raise exception 'already_claimed'; end if;
  if public.ranch_settled_days(e.newcomer_member_id, e.registered_on) < 6 then
    raise exception 'not_settled_yet';
  end if;
  update cell_evangelism
     set status = 'claimed', claimed_by = auth.uid(), claimed_at = now(),
         amount_evangelism = 100000, amount_growth = 30000
   where id = p_id;
end;
$$;

-- 승인·반려. 교회 관리자만.
create or replace function public.ranch_evangelism_decide(p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e cell_evangelism;
begin
  select * into e from cell_evangelism where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if not is_church_admin(e.church_id) then raise exception 'not_allowed'; end if;
  if e.status <> 'claimed' then raise exception 'not_claimed'; end if;
  update cell_evangelism
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(), decided_at = now(), decision_note = nullif(btrim(p_note), '')
   where id = p_id;
end;
$$;

-- 지급 기록. 돈이 실제로 나간 뒤 재정 담당이 남긴다 — 앱이 돈을 보내지는 않는다.
create or replace function public.ranch_evangelism_mark_paid(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e cell_evangelism;
begin
  select * into e from cell_evangelism where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if not is_church_admin(e.church_id) then raise exception 'not_allowed'; end if;
  if e.status <> 'approved' then raise exception 'not_approved'; end if;
  update cell_evangelism set status = 'paid', paid_by = auth.uid(), paid_at = now() where id = p_id;
end;
$$;

revoke all on function public.ranch_evangelism_list(uuid) from public, anon;
revoke all on function public.ranch_evangelism_add(uuid, uuid, uuid, date) from public, anon;
revoke all on function public.ranch_evangelism_claim(uuid) from public, anon;
revoke all on function public.ranch_evangelism_decide(uuid, boolean, text) from public, anon;
revoke all on function public.ranch_evangelism_mark_paid(uuid) from public, anon;
grant execute on function public.ranch_evangelism_list(uuid) to authenticated;
grant execute on function public.ranch_evangelism_add(uuid, uuid, uuid, date) to authenticated;
grant execute on function public.ranch_evangelism_claim(uuid) to authenticated;
grant execute on function public.ranch_evangelism_decide(uuid, boolean, text) to authenticated;
grant execute on function public.ranch_evangelism_mark_paid(uuid) to authenticated;
