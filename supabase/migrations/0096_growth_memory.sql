-- 0096 — 데이빗스톤 성장ON: 점심 전 암송(월~금) 통과 기록.
--
-- 0084 다음에 실행한다. 편성(열두 주·구절 본문)은 앱 코드
-- (src/lib/growthMemory.ts)에 있고, 여기는 「누가 그날 통과했는가」만 담는다.
--
-- 정책은 출결과 같다: 교직원은 쓰고, 보호자는 자기 자녀 것만, 학생은 자기 것만 읽는다.

-- 권한 판정 함수 — 0084 와 똑같은 정의를 다시 둔다. 라이브 DB 에
-- growth_can_write_student 가 없는 것이 확인됐다(2026-11-02, 0084 붙여넣기에서
-- 빠진 것으로 보인다). create or replace 라 이미 있으면 같은 내용으로 덮일 뿐이다.


create or replace function public.growth_has_role(p_school uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.growth_members m
    where m.school_id = p_school and m.user_id = auth.uid()
      and m.active and m.role = any (p_roles)
  );
$$;

-- 교직원(=학생 전체를 보는 사람). 보호자·학생은 여기 들어오지 않는다.
create or replace function public.growth_is_staff(p_school uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.growth_has_role(p_school, array['owner', 'teacher', 'activity']);
$$;

create or replace function public.growth_student_school(p_student uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from public.growth_students where id = p_student;
$$;

-- 이 학생을 볼 수 있는가. 교직원이거나, 이 아이의 보호자이거나, 본인이거나.
create or replace function public.growth_can_read_student(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.growth_is_staff(public.growth_student_school(p_student))
    or exists (select 1 from public.growth_guardian_links g
               where g.student_id = p_student and g.user_id = auth.uid())
    or exists (select 1 from public.growth_student_accounts a
               where a.student_id = p_student and a.user_id = auth.uid());
$$;

create or replace function public.growth_is_guardian_of(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.growth_guardian_links g
                 where g.student_id = p_student and g.user_id = auth.uid());
$$;

create or replace function public.growth_is_student_self(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.growth_student_accounts a
                 where a.student_id = p_student and a.user_id = auth.uid());
$$;

create or replace function public.growth_can_write_student(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.growth_is_staff(public.growth_student_school(p_student));
$$;

-- 몇 주차인지 셀 기준(그 주 월요일). 기본은 이 마이그레이션을 돌린 주다.
alter table public.growth_schools
  add column if not exists memory_start date not null
  default (date_trunc('week', now() at time zone 'Asia/Seoul'))::date;

create table if not exists public.growth_memory_checks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.growth_students (id) on delete cascade,
  -- 날짜는 화면이 서울 기준으로 만들어 넣는다(0084 출결과 같다).
  on_date date not null,
  -- 그날 외운 것('w3-d2', 'w3-review'). 편성이 바뀌어도 기록은 남는다.
  verse_key text not null default '',
  status text not null check (status in ('passed', 'retry')),
  -- 몇 번째 도전에 통과했는가. 견주려는 숫자가 아니라 격려하려는 숫자다.
  tries int not null default 1 check (tries >= 1),
  checked_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (student_id, on_date)
);

create index if not exists growth_memory_checks_date_idx on public.growth_memory_checks (on_date);

alter table public.growth_memory_checks enable row level security;

drop policy if exists growth_memory_checks_read on public.growth_memory_checks;
create policy growth_memory_checks_read on public.growth_memory_checks for select
  using (public.growth_can_read_student(student_id));

drop policy if exists growth_memory_checks_write on public.growth_memory_checks;
create policy growth_memory_checks_write on public.growth_memory_checks for all
  using (public.growth_can_write_student(student_id))
  with check (public.growth_can_write_student(student_id));
