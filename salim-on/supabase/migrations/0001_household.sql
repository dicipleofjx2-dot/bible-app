-- 살림ON — 집안일 분류 · 담당자 배치 · 시간 배치 · 확인 · 점수
--
-- 데이빗바이블과 **같은 Supabase 프로젝트**를 쓴다(계정을 또 만들게 하지 않는다).
-- 표는 전부 home_ 로 따로 둔다.
--
-- 이 파일은 사람이 Supabase SQL 편집기에서 실행한다. 실행 전에는 화면이 열려도
-- 아무것도 저장되지 않는다.

create extension if not exists pgcrypto;

-- ── 집 ──────────────────────────────────────────────────────────────

create table if not exists home_households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  -- 한 주가 언제 시작하는지. 점수판의 「이번 주」가 여기에 달려 있다.
  week_start  smallint not null default 1 check (week_start between 0 and 6),
  -- 예정 시각보다 이만큼 늦어도 「정시」로 본다. 집안일은 분 단위로 다그칠
  -- 일이 아니다.
  grace_min   smallint not null default 30 check (grace_min between 0 and 240),
  created_at  timestamptz not null default now()
);

-- ── 식구 ────────────────────────────────────────────────────────────
--
-- **계정이 없어도 식구가 된다.** 아이에게 이메일을 만들게 하지 않는다.
-- user_id 가 비어 있는 줄은 「이름만 있는 식구」이고, 나중에 그 사람이
-- 초대코드로 들어오면 같은 줄에 계정이 붙는다(home_join_household).

create table if not exists home_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references home_households(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  display_name text not null,
  emoji        text not null default '🙂',
  role         text not null default 'member' check (role in ('manager', 'member')),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create unique index if not exists home_members_user_uniq
  on home_members (household_id, user_id) where user_id is not null;
create index if not exists home_members_household_idx on home_members (household_id);

-- ── 분류 ────────────────────────────────────────────────────────────

create table if not exists home_categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references home_households(id) on delete cascade,
  name         text not null,
  emoji        text not null default '🏠',
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists home_categories_household_idx on home_categories (household_id);

-- ── 집안일 ──────────────────────────────────────────────────────────
--
-- 「할 일의 정의」다. 실제로 오늘 누가 하는가는 home_tasks 가 담는다.

create table if not exists home_chores (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references home_households(id) on delete cascade,
  category_id       uuid references home_categories(id) on delete set null,
  title             text not null,
  notes             text not null default '',
  minutes           smallint not null default 15 check (minutes between 1 and 600),
  difficulty        smallint not null default 2 check (difficulty between 1 and 5),
  repeat_kind       text not null default 'weekly'
                    check (repeat_kind in ('once', 'daily', 'weekly', 'biweekly', 'monthly')),
  -- 0=일요일 … 6=토요일. weekly/biweekly 에서만 쓴다.
  weekdays          smallint[] not null default '{}',
  -- 1~31. monthly 에서만 쓴다. 그 달에 없는 날이면 그 달은 건너뛴다.
  month_day         smallint check (month_day between 1 and 31),
  -- 'HH:MM'. 시간 배치의 기준이자 「정시」의 기준이다.
  at_time           time not null default '09:00',
  -- 반복의 기준일. biweekly 가 어느 주부터인지도 여기서 센다.
  start_date        date not null default current_date,
  -- 늘 같은 사람이 하는 일(예: 아빠의 분리수거). 비워 두면 자동 배정이 고른다.
  default_member_id uuid references home_members(id) on delete set null,
  -- 끝내면 관리자가 확인해야 점수가 붙는지.
  needs_review      boolean not null default false,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);
create index if not exists home_chores_household_idx on home_chores (household_id, active);

-- ── 그날의 일감 ─────────────────────────────────────────────────────

create table if not exists home_tasks (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references home_households(id) on delete cascade,
  chore_id     uuid not null references home_chores(id) on delete cascade,
  member_id    uuid references home_members(id) on delete set null,
  on_date      date not null,
  at_time      time not null,
  status       text not null default 'todo'
               check (status in ('todo', 'done', 'approved', 'rejected', 'skipped')),
  -- 1~5 별. 확인하는 사람이 매긴다.
  quality      smallint check (quality between 1 and 5),
  review_note  text not null default '',
  reviewer_id  uuid references home_members(id) on delete set null,
  -- 아래 셋은 **표의 트리거가 채운다**. 화면이 채우면 기기 시계가 틀어진
  -- 만큼 기록이 틀어진다 — 점수가 걸린 시각이라 더 그렇다.
  done_at      timestamptz,
  reviewed_at  timestamptz,
  late_minutes integer,
  points       integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (chore_id, on_date)
);
create index if not exists home_tasks_board_idx on home_tasks (household_id, on_date);
create index if not exists home_tasks_member_idx on home_tasks (member_id, on_date);

-- ── 점수 ────────────────────────────────────────────────────────────
--
-- **점수는 오직 여기서만 매긴다.** 화면에서 매기면 기기 시계를 믿는 셈이고,
-- 점수는 식구끼리 다툼이 나는 자리라 그러면 안 된다. 화면이 보여 주는 숫자는
-- 「예상 점수」(기본점)일 뿐이고, 실제 점수는 이 함수가 적는다.
--
--   기본점  = 난이도×4 + 올림(분÷5)×2        — 어렵고 오래 걸릴수록 높다
--   정시    = 예정시각 + 봐주는 시간 안 → +5
--             같은 날 안에 늦게          →  0
--             하루를 넘김                → −5
--   품질    = ★1 0.4 · ★2 0.7 · ★3 1.0 · ★4 1.15 · ★5 1.3
--   반려    = 0
--
-- 확인이 필요 없는 일은 끝낸 그 자리에서 ★3(1.0)으로 셈한다.

create or replace function home_score_task() returns trigger
language plpgsql as $$
declare
  ch    home_chores%rowtype;
  hh    home_households%rowtype;
  due   timestamptz;
  base  numeric;
  bonus numeric;
  mult  numeric;
begin
  select * into ch from home_chores where id = new.chore_id;
  select * into hh from home_households where id = new.household_id;
  if ch.id is null then return new; end if;

  -- 끝낸 시각·확인한 시각은 서버가 찍는다.
  if new.status in ('done', 'approved', 'rejected') and new.done_at is null then
    new.done_at := now();
  end if;
  if new.status in ('approved', 'rejected') and new.reviewed_at is null then
    new.reviewed_at := now();
  end if;
  -- 「아직 안 함」으로 되돌리면 흔적도 같이 지운다. 안 그러면 되돌린 일에
  -- 지난번 점수가 남는다.
  if new.status in ('todo', 'skipped') then
    new.done_at := null; new.reviewed_at := null;
    new.late_minutes := null; new.points := 0;
    return new;
  end if;

  -- 서울 기준으로 잰다. UTC 자정으로 끊으면 저녁 설거지가 어제 일이 된다.
  due := ((new.on_date + new.at_time) at time zone 'Asia/Seoul')
         + make_interval(mins => coalesce(hh.grace_min, 30));
  new.late_minutes := greatest(0, floor(extract(epoch from (new.done_at - due)) / 60)::int);

  if new.status = 'rejected' then
    new.points := 0;
    return new;
  end if;

  -- 확인이 필요한 일인데 아직 확인 전이면 점수를 붙이지 않는다. 확인이
  -- 형식이 되어 버리면 확인할 이유가 없다.
  if ch.needs_review and new.status = 'done' then
    new.points := 0;
    return new;
  end if;

  base  := ch.difficulty * 4 + ceil(ch.minutes / 5.0) * 2;
  bonus := case
             when new.late_minutes = 0 then 5
             when (new.done_at at time zone 'Asia/Seoul')::date <= new.on_date then 0
             else -5
           end;
  mult  := case coalesce(new.quality, 3)
             when 1 then 0.4 when 2 then 0.7 when 4 then 1.15 when 5 then 1.3 else 1.0
           end;
  new.points := greatest(0, round((base + bonus) * mult))::int;
  return new;
end;
$$;

drop trigger if exists home_tasks_score on home_tasks;
create trigger home_tasks_score
  before insert or update of status, quality, member_id on home_tasks
  for each row execute function home_score_task();

-- ── 누가 이 집 식구인가 ─────────────────────────────────────────────
--
-- 정책 안에서 home_members 를 직접 읽으면 그 표의 정책이 다시 불려 끝없이
-- 돈다. security definer 함수로 한 번 끊는다.

create or replace function home_is_member(hid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from home_members m
    where m.household_id = hid and m.user_id = auth.uid() and m.active
  );
$$;

create or replace function home_is_manager(hid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from home_members m
    where m.household_id = hid and m.user_id = auth.uid() and m.active and m.role = 'manager'
  );
$$;

-- ── 정책 ────────────────────────────────────────────────────────────
--
-- 남의 집 살림은 한 줄도 보이지 않는다. 읽기는 식구면 되고, 살림의 틀을
-- 바꾸는 일(집안일 만들기·지우기, 식구 넣고 빼기, 확인하기)은 관리자만 한다.
-- **자기 일감의 상태는 누구나 바꿀 수 있다** — 아이가 자기가 한 일을 스스로
-- 체크하지 못하면 이 앱을 쓸 이유가 없다.

alter table home_households enable row level security;
alter table home_members    enable row level security;
alter table home_categories enable row level security;
alter table home_chores     enable row level security;
alter table home_tasks      enable row level security;

drop policy if exists home_households_read on home_households;
create policy home_households_read on home_households
  for select using (home_is_member(id));
drop policy if exists home_households_write on home_households;
create policy home_households_write on home_households
  for update using (home_is_manager(id)) with check (home_is_manager(id));
drop policy if exists home_households_delete on home_households;
create policy home_households_delete on home_households
  for delete using (owner_id = auth.uid());

drop policy if exists home_members_read on home_members;
create policy home_members_read on home_members
  for select using (home_is_member(household_id));
drop policy if exists home_members_manage on home_members;
create policy home_members_manage on home_members
  for all using (home_is_manager(household_id)) with check (home_is_manager(household_id));
-- 자기 줄(이름·그림글자)은 스스로 고친다. 역할까지 스스로 올리지는 못한다 —
-- 그건 아래 트리거가 막는다.
drop policy if exists home_members_self on home_members;
create policy home_members_self on home_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function home_members_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if home_is_manager(new.household_id) then return new; end if;
  if new.role <> old.role or new.household_id <> old.household_id
     or new.user_id is distinct from old.user_id or new.active <> old.active then
    raise exception '역할과 소속은 관리자만 바꿀 수 있습니다.';
  end if;
  return new;
end;
$$;
drop trigger if exists home_members_guard_t on home_members;
create trigger home_members_guard_t before update on home_members
  for each row execute function home_members_guard();

drop policy if exists home_categories_read on home_categories;
create policy home_categories_read on home_categories
  for select using (home_is_member(household_id));
drop policy if exists home_categories_manage on home_categories;
create policy home_categories_manage on home_categories
  for all using (home_is_manager(household_id)) with check (home_is_manager(household_id));

drop policy if exists home_chores_read on home_chores;
create policy home_chores_read on home_chores
  for select using (home_is_member(household_id));
drop policy if exists home_chores_manage on home_chores;
create policy home_chores_manage on home_chores
  for all using (home_is_manager(household_id)) with check (home_is_manager(household_id));

drop policy if exists home_tasks_read on home_tasks;
create policy home_tasks_read on home_tasks
  for select using (home_is_member(household_id));
drop policy if exists home_tasks_manage on home_tasks;
create policy home_tasks_manage on home_tasks
  for all using (home_is_manager(household_id)) with check (home_is_manager(household_id));
-- 식구는 「자기 일감」의 상태만 바꾼다. 담당자를 남에게 떠넘기거나 점수를
-- 손대는 것은 아래 트리거가 막는다.
drop policy if exists home_tasks_own on home_tasks;
create policy home_tasks_own on home_tasks
  for update using (
    home_is_member(household_id)
    and member_id in (select id from home_members where user_id = auth.uid())
  ) with check (
    home_is_member(household_id)
    and member_id in (select id from home_members where user_id = auth.uid())
  );

create or replace function home_tasks_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if home_is_manager(new.household_id) then return new; end if;
  if new.chore_id <> old.chore_id or new.on_date <> old.on_date
     or new.member_id is distinct from old.member_id then
    raise exception '담당자와 날짜는 관리자만 바꿀 수 있습니다.';
  end if;
  -- 스스로 별점을 주고 스스로 승인하는 길을 막는다.
  if new.status in ('approved', 'rejected') or new.quality is distinct from old.quality then
    raise exception '확인은 관리자만 할 수 있습니다.';
  end if;
  return new;
end;
$$;
drop trigger if exists home_tasks_guard_t on home_tasks;
create trigger home_tasks_guard_t before update on home_tasks
  for each row execute function home_tasks_guard();

-- ── 집 만들기 · 들어가기 ────────────────────────────────────────────
--
-- 표를 직접 열어 두면 「아무 집에나 들어가는 길」이 된다(데이빗바이블이
-- 0026 에서 겪은 그 자리다). 문은 이 함수 둘뿐이다.

create or replace function home_new_code() returns text
language sql volatile as $$
  -- 헷갈리는 글자(0/O, 1/I)는 뺐다. 전화로 불러 주는 코드다.
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                           floor(random() * 32 + 1)::int, 1), '')
  from generate_series(1, 6);
$$;

create or replace function home_create_household(p_name text, p_my_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  hid  uuid;
  code text;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  loop
    code := home_new_code();
    exit when not exists (select 1 from home_households where invite_code = code);
  end loop;

  insert into home_households (name, invite_code, owner_id)
  values (coalesce(nullif(trim(p_name), ''), '우리 집'), code, auth.uid())
  returning id into hid;

  insert into home_members (household_id, user_id, display_name, emoji, role)
  values (hid, auth.uid(), coalesce(nullif(trim(p_my_name), ''), '나'), '🏡', 'manager');

  insert into home_categories (household_id, name, emoji, sort_order) values
    (hid, '청소',   '🧹', 1),
    (hid, '요리',   '🍳', 2),
    (hid, '설거지', '🍽️', 3),
    (hid, '세탁',   '🧺', 4),
    (hid, '정리',   '🗄️', 5),
    (hid, '쓰레기', '🗑️', 6),
    (hid, '장보기', '🛒', 7),
    (hid, '돌봄',   '🌱', 8);

  return hid;
end;
$$;

create or replace function home_join_household(p_code text, p_my_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  hid  uuid;
  mine uuid;
  nm   text := coalesce(nullif(trim(p_my_name), ''), '식구');
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  select id into hid from home_households where invite_code = upper(trim(p_code));
  if hid is null then raise exception '그런 초대코드가 없습니다.'; end if;

  select id into mine from home_members
   where household_id = hid and user_id = auth.uid();
  if mine is not null then return hid; end if;

  -- 관리자가 이름만 적어 둔 식구가 있으면 그 줄에 계정을 붙인다. 새 줄을
  -- 만들면 그 사람이 여태 쌓은 점수가 남남이 된다.
  select id into mine from home_members
   where household_id = hid and user_id is null and lower(display_name) = lower(nm)
   limit 1;

  if mine is not null then
    update home_members set user_id = auth.uid(), active = true where id = mine;
  else
    insert into home_members (household_id, user_id, display_name) values (hid, auth.uid(), nm);
  end if;
  return hid;
end;
$$;

-- 내가 속한 집들. 정책이 home_is_member 에 걸려 있어 목록만 따로 열어 둔다.
create or replace function home_my_households()
returns table (id uuid, name text, invite_code text, week_start smallint,
               grace_min smallint, my_role text, my_member_id uuid)
language sql security definer stable set search_path = public as $$
  select h.id, h.name, h.invite_code, h.week_start, h.grace_min, m.role, m.id
  from home_households h
  join home_members m on m.household_id = h.id
  where m.user_id = auth.uid() and m.active
  order by h.created_at;
$$;

grant execute on function home_create_household(text, text) to authenticated;
grant execute on function home_join_household(text, text)   to authenticated;
grant execute on function home_my_households()              to authenticated;
