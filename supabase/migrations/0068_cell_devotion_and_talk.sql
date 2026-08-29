-- 목장방 소통창 + 리더관리를 목장 기준으로.
--
-- ── 왜 상황표를 목장방에 두지 않는가 ────────────────────────────────
-- 처음에는 목장방 안에서 목원끼리 서로의 경건생활 상황표를 보게 하려 했다.
-- 그러나 그 표는 이미 **리더관리**에 있고, 거기 두는 편이 맞다:
--
--   · 자기 상황표는 자기만 본다. 서로 다 보이면 격려가 아니라 비교가 된다.
--   · 목자는 챙기려고 본다. 그것이 목자의 일이다.
--   · 목원에게는 리더관리 자체가 안 보인다.
--
-- 그래서 이 파일은 상황표를 **목자·관리자에게만** 연다.
--
-- ── 그리고 리더관리가 엉뚱한 사람을 보여 주고 있었다 ────────────────
-- 리더관리 명단은 r2m_leader_members(0035)에서 온다. 그런데 목장이 생기면서
-- 같은 사실이 두 군데가 되었고, 실제로 어긋났다 — 24건 중 7건.
--
--   최효정  엄세미목장인데 채미화 님에게 붙어 있음
--   문원근  홍동완목장인데 최민근 님에게
--   민두기  홍동완목장인데 최민근 님에게
--
-- 목장이 정본이다. 교적에서 목장을 옮기면 리더관리도 따라와야 한다. 그래서
-- 아래 함수는 **members.cell_id 만** 본다. r2m_leader_members 는 건드리지
-- 않고 남겨 둔다(옛 화면이 아직 쓴다) — 다만 새로 만드는 것은 이쪽을 쓴다.

-- ════════════════════════════════════════════════════════════════════
-- 1. 내가 목자인 목장
-- ════════════════════════════════════════════════════════════════════

create or replace function public.my_led_cell_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
    from org_units u
    join members m on m.id = u.leader_member_id
   where u.unit_type = 'cell'
     and u.is_active
     and m.user_id = auth.uid()
     and m.deleted_at is null
   limit 1;
$$;

revoke all on function public.my_led_cell_id() from public, anon;
grant execute on function public.my_led_cell_id() to authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 2. 경건생활 상황표 — 목자와 관리자만
-- ════════════════════════════════════════════════════════════════════
--
-- r2m_daily_checkins 의 RLS 를 넓히지 않는다. 0030 이 세운 원칙 때문이다 —
-- 서버에는 불리언과 타임스탬프만 있고 묵상·기도·일기 내용은 애초에 올라오지
-- 않는다. 그 표를 열어 두면 나중에 누군가 내용 칸을 하나 더하는 순간 그
-- 내용까지 함께 열린다. 그래서 표가 아니라 **셈한 결과만** 돌려준다.
--
-- 연락처를 함께 준다. 목자가 상황표를 보다가 "요즘 뜸하네" 싶을 때 바로
-- 문자로 격려할 수 있어야 표가 쓸모 있어진다. 보는 것으로 끝나면 감시다.

create or replace function public.cell_leader_board(target_cell_id uuid)
returns table (
  user_id uuid,
  display_name text,
  phone text,
  qt integer,
  reading integer,
  meditation integer,
  obedience integer,
  gratitude integer,
  bible_reading integer,
  memorization integer,
  last_active date
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- 그 목장의 목자이거나, 전체를 보는 사람이어야 한다.
  if not (my_led_cell_id() = target_cell_id or can_see_all_cells()) then
    raise exception '목자와 관리자만 볼 수 있습니다.';
  end if;

  return query
  with folk as (
    select m.user_id as uid, m.name, m.phone
      from members m
     where m.cell_id = target_cell_id
       and m.deleted_at is null
       and m.user_id is not null
  ),
  -- 지난 7일. 주일로 자르지 않는다 — 목장 모임 요일이 저마다 달라서,
  -- 어느 요일에 열어 봐도 "요즘 어떤가"가 보이는 편이 낫다.
  span as (select (current_date - interval '6 days')::date as from_day)
  select
    f.uid, f.name, f.phone,
    coalesce(c.qt, 0)::integer,
    coalesce(c.reading, 0)::integer,
    coalesce(c.meditation, 0)::integer,
    coalesce(c.obedience, 0)::integer,
    coalesce(c.gratitude, 0)::integer,
    coalesce(r.reading_done, 0)::integer,
    coalesce(r.memorized, 0)::integer,
    greatest(c.last_day, r.last_day)
  from folk f
  left join (
    select k.user_id,
           count(*) filter (where k.qt)         as qt,
           count(*) filter (where k.reading)    as reading,
           count(*) filter (where k.meditation) as meditation,
           count(*) filter (where k.obedience)  as obedience,
           count(*) filter (where k.gratitude)  as gratitude,
           max(k.date)                          as last_day
      from r2m_daily_checkins k, span s
     where k.date >= s.from_day
     group by k.user_id
  ) c on c.user_id = f.uid
  left join (
    select d.user_id,
           count(*) filter (where d.reading_complete)     as reading_done,
           count(*) filter (where d.memorization_success) as memorized,
           max(d.date)                                    as last_day
      from reading_helper_day_records d, span s
     where d.date >= s.from_day
     group by d.user_id
  ) r on r.user_id = f.uid
  order by f.name;
end;
$$;

revoke all on function public.cell_leader_board(uuid) from public, anon;
grant execute on function public.cell_leader_board(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 3. 소통창 — 목장 안에서 서로 격려하는 자리
-- ════════════════════════════════════════════════════════════════════
--
-- 이것은 목원 모두가 쓴다. 상황표와 정반대 성격이다 — 상황표는 목자가 챙기려고
-- 보는 것이고, 소통창은 서로 주고받는 자리다.
--
-- cell_reports(보고와 상황)와 표를 나눈 이유: 보고는 남겨 두고 나중에 돌아보는
-- 기록이고 이것은 오가는 말이다. 한 표에 섞으면 목록이 잡담으로 덮여 지난달
-- 모임 보고를 찾을 수 없게 된다.

create table if not exists public.cell_messages (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references org_units(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists cell_messages_cell_idx
  on public.cell_messages (cell_id, created_at desc)
  where deleted_at is null;

alter table public.cell_messages enable row level security;

drop policy if exists cell_messages_select on public.cell_messages;
create policy cell_messages_select on public.cell_messages
  for select using (deleted_at is null and can_see_cell(cell_id));

drop policy if exists cell_messages_insert on public.cell_messages;
create policy cell_messages_insert on public.cell_messages
  for insert with check (author_id = auth.uid() and can_see_cell(cell_id));

-- 지우는 것은 쓴 사람과 관리자만. **목자에게 남의 말을 지울 권한은 주지 않는다** —
-- 서로 격려하자고 만든 자리에 지우는 손이 있으면 말이 줄어든다.
drop policy if exists cell_messages_update on public.cell_messages;
create policy cell_messages_update on public.cell_messages
  for update using (author_id = auth.uid() or can_see_all_cells())
  with check (author_id = auth.uid() or can_see_all_cells());

-- ── 격려 누르기 ────────────────────────────────────────────────────
-- 열쇠가 (message_id, user_id) 라 두 번 눌러도 하나다.

create table if not exists public.cell_message_cheers (
  message_id uuid not null references cell_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.cell_message_cheers enable row level security;

drop policy if exists cell_message_cheers_select on public.cell_message_cheers;
create policy cell_message_cheers_select on public.cell_message_cheers
  for select using (
    exists (select 1 from cell_messages m
             where m.id = cell_message_cheers.message_id and can_see_cell(m.cell_id))
  );

drop policy if exists cell_message_cheers_write on public.cell_message_cheers;
create policy cell_message_cheers_write on public.cell_message_cheers
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from cell_messages m
                 where m.id = cell_message_cheers.message_id and can_see_cell(m.cell_id))
  );

-- ── 목장 사람들의 이름 ─────────────────────────────────────────────
--
-- profiles.username 에는 이메일이 그대로 들어 있는 계정이 많다(82명 중 65명).
-- 목장 안에서 서로를 이메일로 부를 수는 없다. 0066 과 같은 방식으로 그 목장
-- 사람들의 이름만 돌려준다 — 아무 user_id 나 넣어 캐낼 수는 없다.

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
  select m.user_id,
         coalesce(
           m.name,
           (select p.username from profiles p
             where p.id = m.user_id and position('@' in p.username) = 0),
           split_part((select p.username from profiles p where p.id = m.user_id), '@', 1),
           '이름 없음')
    from members m
   where m.cell_id = target_cell_id
     and m.deleted_at is null
     and m.user_id is not null;
end;
$$;

revoke all on function public.cell_member_names(uuid) from public, anon;
grant execute on function public.cell_member_names(uuid) to authenticated;
