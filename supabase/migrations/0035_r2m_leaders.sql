-- R2M 리더 체계 — 회원 중 일부에게 리더 자격을 주고, 멤버를 그 리더에게 배정한다.
-- 리더는 자기에게 배정된 멤버의 훈련 "완료 여부"만 본다.
--
-- 0030에 적어 둔 원칙을 그대로 지킨다: 서버에는 불리언과 타임스탬프만 있고 묵상·기도·
-- 일기 내용은 애초에 올라오지 않는다. 그러므로 리더 권한을 넓혀도 내용이 새어 나갈
-- 경로가 구조적으로 없다.

-- ── 권한 판정 헬퍼 ─────────────────────────────────────────────────────
--
-- security definer로 두는 이유: 아래 정책들이 다른 테이블(profiles,
-- r2m_leader_members)을 들여다보는데, 그 테이블에도 RLS가 걸려 있어 정책 안에서
-- 정책을 또 타면 재귀가 생긴다. 정의자 권한으로 한 번에 판정한다.
--
-- search_path를 고정하지 않으면 호출자가 자기 스키마를 앞에 끼워 넣어 같은 이름의
-- 가짜 테이블을 보게 만들 수 있다.

create or replace function public.r2m_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and is_admin);
$$;

create or replace function public.r2m_is_leader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from r2m_leaders where user_id = auth.uid());
$$;

/** 지금 로그인한 사람이 target의 리더인가 */
create or replace function public.r2m_leads(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from r2m_leader_members
    where leader_id = auth.uid() and member_id = target
  );
$$;

-- ── 리더 자격 ──────────────────────────────────────────────────────────
--
-- profiles에 is_leader 컬럼을 더하지 않고 따로 테이블을 둔다. profiles의 수정
-- 정책이 "자기 행이면 수정 가능"이라 컬럼을 더하는 순간 누구나 스스로 리더가 될 수
-- 있기 때문이다(같은 이유로 아래에서 is_admin 구멍도 막는다).

create table if not exists r2m_leaders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table r2m_leaders enable row level security;

-- 누가 리더인지는 이름과 마찬가지로 가릴 정보가 아니다(멤버도 자기 리더가 누군지
-- 알아야 한다). 대신 자격을 주고 뺏는 건 관리자만 한다.
drop policy if exists "anyone can read r2m leaders" on r2m_leaders;
create policy "anyone can read r2m leaders" on r2m_leaders
  for select using (true);

drop policy if exists "admin can manage r2m leaders" on r2m_leaders;
create policy "admin can manage r2m leaders" on r2m_leaders
  for all
  using (public.r2m_is_admin())
  with check (public.r2m_is_admin());

-- ── 리더-멤버 배정 ─────────────────────────────────────────────────────
--
-- member_id가 기본키다 — 한 사람은 한 리더에게만 속한다. 리더를 바꾸는 것은
-- 삭제 후 추가가 아니라 upsert 한 번으로 끝난다.

create table if not exists r2m_leader_members (
  member_id uuid primary key references auth.users(id) on delete cascade,
  leader_id uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null,
  constraint r2m_leader_not_self check (leader_id <> member_id)
);

create index if not exists r2m_leader_members_leader_idx on r2m_leader_members (leader_id);

alter table r2m_leader_members enable row level security;

drop policy if exists "read own r2m leader assignment" on r2m_leader_members;
create policy "read own r2m leader assignment" on r2m_leader_members
  for select using (
    auth.uid() = member_id
    or auth.uid() = leader_id
    or public.r2m_is_admin()
  );

drop policy if exists "admin can manage r2m leader assignments" on r2m_leader_members;
create policy "admin can manage r2m leader assignments" on r2m_leader_members
  for all
  using (public.r2m_is_admin())
  with check (public.r2m_is_admin());

-- ── 리더가 자기 멤버의 훈련 현황을 읽을 수 있게 ─────────────────────────
--
-- 0030에서 관리자에게만 열어 둔 네 테이블에, 리더는 "자기 멤버 행만" 읽는 정책을
-- 나란히 붙인다. r2m_leads()가 배정표를 확인하므로 남의 멤버는 보이지 않는다.

drop policy if exists "leader can read own members r2m checkins" on r2m_daily_checkins;
create policy "leader can read own members r2m checkins" on r2m_daily_checkins
  for select using (public.r2m_leads(user_id));

drop policy if exists "leader can read own members prayer logs" on prayer_logs;
create policy "leader can read own members prayer logs" on prayer_logs
  for select using (public.r2m_leads(user_id));

drop policy if exists "leader can read own members reading helper records" on reading_helper_day_records;
create policy "leader can read own members reading helper records" on reading_helper_day_records
  for select using (public.r2m_leads(user_id));

drop policy if exists "leader can read own members r2m enrollments" on r2m_enrollments;
create policy "leader can read own members r2m enrollments" on r2m_enrollments
  for select using (public.r2m_leads(user_id));

-- ── 스스로 관리자가 되는 구멍 막기 ──────────────────────────────────────
--
-- 0001의 "users can update their own profile"은 using만 있고 with check이 없다.
-- 이 경우 Postgres는 using을 검사식으로도 쓰는데, 조건이 auth.uid() = id뿐이라
-- 어느 컬럼을 바꾸든 통과한다. 즉 로그인한 사람이면 누구나 자기 행의
-- is_admin을 true로 바꿔 전체 훈련 현황과 관리 기능을 열 수 있었다.
--
-- 정책은 컬럼 단위로 조건을 걸기 어려우므로 트리거로 막는다. 관리자가 아닌
-- 사람이 자기 프로필을 고치면 is_admin은 원래 값으로 되돌린다. 이름·사진 수정은
-- 지금처럼 그대로 된다.
--
-- auth.uid()가 없으면(서비스 키로 도는 서버 작업, SQL 편집기) 손대지 않는다.
create or replace function public.protect_profile_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.r2m_is_admin() then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_admin_flag on public.profiles;
create trigger protect_profile_admin_flag
  before update on public.profiles
  for each row
  execute function public.protect_profile_admin_flag();
