-- 부흥의 천사들 — 네 사역과 기도 신청.
--
-- 사역은 넷이고 **바뀌지 않는다**: 말씀과 예언 · 치유와 축사 · 찬양과 경배 · 천국의 재정.
-- 그래서 사역 자체를 표로 두지 않는다. 표로 둬야 하는 것은 둘뿐이다.
--
--   1. **언제 하는가** — 달마다 날짜가 바뀐다(revival_sessions).
--   2. **누가 신청했는가** — 그리고 기도받은 뒤 어땠는가(revival_requests).
--
-- ── 한 사람의 이야기가 한 줄에 다 있다 ───────────────────────────────
-- 신청(증상·사정)과 그 뒤의 기록(기도받고 어땠는지)을 **같은 줄**에 담는다.
-- 따로 두면 「누구의 어떤 기도에 대한 후기인가」를 늘 이어 붙여야 하고, 한쪽만
-- 지워지면 후기가 떠돌이가 된다. 한 신청에 후기는 하나다 — 고쳐 쓰면 된다.
--
-- ── 민감한 글이다 ────────────────────────────────────────────────────
-- 「무슨 병인지」, 「무엇에 눌려 있는지」가 적힌다. 교적부 전체에 열면 안 된다.
--   · 본인 — 자기 것만 읽고 쓴다
--   · 관리자(profiles.is_admin) — 자기 교회 것을 읽는다. 기도할 사람이 알아야 한다.
--   · 그 밖 — 아무것도 못 본다
-- 목록 화면에서도 이름을 다 펼치지 말고 꼭 필요한 자리에서만 본다(화면 쪽 약속).

-- ── 1. 이 달의 사역 일정 ────────────────────────────────────────────
create table if not exists revival_sessions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  /// WORD(말씀과 예언) | HEALING(치유와 축사) | WORSHIP(찬양과 경배) | FINANCE(천국의 재정)
  kind text not null check (kind in ('WORD', 'HEALING', 'WORSHIP', 'FINANCE')),
  meets_on date not null,
  /** "주일 2부 예배 후", "본당" 처럼 때와 자리를 한 줄로. 비어도 된다. */
  place text,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (church_id, kind, meets_on)
);

create index if not exists revival_sessions_month_idx on revival_sessions (church_id, meets_on);

alter table revival_sessions enable row level security;

-- 일정은 교회 식구가 다 본다. 언제 하는지 모르면 신청할 수가 없다.
drop policy if exists revival_sessions_read on revival_sessions;
create policy revival_sessions_read on revival_sessions
  for select using (church_id = my_church_id());

-- 넣고 고치는 것은 관리자만.
drop policy if exists revival_sessions_write on revival_sessions;
create policy revival_sessions_write on revival_sessions
  for all
  using (
    church_id = my_church_id()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (
    church_id = my_church_id()
    and exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ── 2. 기도 신청과 그 뒤의 기록 ─────────────────────────────────────
create table if not exists revival_requests (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  kind text not null check (kind in ('WORD', 'HEALING', 'WORSHIP', 'FINANCE')),
  /** 어느 날 모임에 신청한 것인가. 일정을 지워도 신청은 남긴다(set null). */
  session_id uuid references revival_sessions(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  /** 부를 이름. 교적을 못 찾는 경우가 있어 신청할 때 받아 둔다. */
  name text,
  /** 증상·사정. 치유와 축사면 어디가 어떻게 아픈지, 재정이면 무엇이 막혔는지. */
  body text not null,
  /** 받은 뒤 어땠는지. 비어 있으면 아직 안 적은 것이다. */
  after_note text,
  after_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists revival_requests_mine_idx on revival_requests (user_id, created_at desc);
create index if not exists revival_requests_board_idx on revival_requests (church_id, kind, created_at desc);

alter table revival_requests enable row level security;

/** 지금 로그인한 사람이 이 앱의 관리자인가. 정책 세 군데가 같은 말을 쓰지 않게 뺀다. */
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin);
$$;

revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

-- 읽기: 본인, 그리고 같은 교회 관리자.
drop policy if exists revival_requests_read on revival_requests;
create policy revival_requests_read on revival_requests
  for select using (
    user_id = auth.uid()
    or (church_id = my_church_id() and is_app_admin())
  );

-- 쓰기: 본인만 자기 이름으로 넣는다. church_id 는 아래 트리거가 채운다.
drop policy if exists revival_requests_insert on revival_requests;
create policy revival_requests_insert on revival_requests
  for insert with check (user_id = auth.uid());

-- 고치기: 본인만. 받은 뒤의 기록을 적거나 고치는 자리다.
drop policy if exists revival_requests_update on revival_requests;
create policy revival_requests_update on revival_requests
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 지우기: 본인만. 잘못 올린 것을 거두는 길은 본인에게 있어야 한다.
drop policy if exists revival_requests_delete on revival_requests;
create policy revival_requests_delete on revival_requests
  for delete using (user_id = auth.uid());

/**
 * church_id 를 화면에서 받지 않는다 — 보내 온 값을 믿으면 남의 교회 목록에
 * 글을 꽂을 수 있다. 로그인한 사람의 교회로 서버가 채운다.
 */
create or replace function public.revival_set_church()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.church_id is null then
    new.church_id := my_church_id();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists revival_requests_set_church on revival_requests;
create trigger revival_requests_set_church
  before insert or update on revival_requests
  for each row execute function public.revival_set_church();

do $$
begin
  if not exists (select 1 from information_schema.tables where table_name = 'revival_requests') then
    raise exception '부흥의 천사들 표가 만들어지지 않았습니다.';
  end if;
  raise notice '부흥의 천사들 — 일정과 기도 신청을 받을 준비가 됐습니다.';
end $$;

notify pgrst, 'reload schema';
