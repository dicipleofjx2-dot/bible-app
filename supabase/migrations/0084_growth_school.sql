-- 데이빗스톤 성장ON — 대안학교 성장기록 (기획서 1단계 MVP)
--
-- ── 왜 서버인가 ─────────────────────────────────────────────────────
-- 교사·학생·보호자 세 사람이 같은 기록을 본다. 기기 안에 두면 공유 자체가
-- 성립하지 않는다. 사명기록관(0079)과 반대 방향의 판단이다.
--
-- ── 아동 기록이다 (기획서 §10) ──────────────────────────────────────
-- 미성년 20명의 학습·건강·상담·기도제목이 한 표에 쌓인다. 그래서
--   1) 기본값을 「교사만」으로 두었다. 손대지 않으면 보호자에게 안 나간다.
--      실수로 새는 쪽이 아니라 실수로 안 보이는 쪽으로 기울였다.
--   2) 보호자는 **자기 자녀만** 본다. 반 전체가 아니라 링크된 학생만이다.
--   3) 상담(mentoring)은 교사 전용 표로 아예 갈랐다. 같은 표에 두고 칼럼
--      하나로 가리면, 정책을 한 번 잘못 고칠 때 통째로 샌다.
--   4) 역할 판정은 security definer 함수로 뺐다. 정책 안에서 구성원 표를
--      다시 읽으면 재귀가 걸린다.
--
-- ── 평가가 아니라 관찰이다 (기획서 §2) ──────────────────────────────
-- level 은 점수가 아니라 네 단계 관찰값이고, 학생끼리 비교하는 순위를
-- 만들지 않는다. 월간보고서도 남과 견주지 않고 그 학생의 지난달과 견준다.

-- ───────────────────────── 학교와 구성원 ─────────────────────────

create table if not exists public.growth_schools (
  id uuid primary key default gen_random_uuid(),
  -- 이 앱의 교회 울타리(0038)와 이어 둔다. 없어도 학교는 선다.
  church_id uuid,
  name text not null,
  -- 기획서 §12: 처음엔 학교 하나지만 여러 학교를 받을 수 있게 school_id 를 둔다.
  motto text not null default '오늘의 배움이 믿음의 사람을 세웁니다',
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.growth_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.growth_schools (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 한 사람이 여러 역할을 겸할 수 있다(기획서 §3). 행을 여러 개 둔다.
  role text not null check (role in ('owner', 'teacher', 'activity', 'guardian', 'student')),
  display_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (school_id, user_id, role)
);

create index if not exists growth_members_user_idx on public.growth_members (user_id, active);

-- 초대 코드. 교사·보호자가 계정을 만들고 이 코드로 학교에 들어온다.
-- (이 앱의 redeem_invite 와 같은 방식 — 목록에서 아무 학교나 고르게 두면
--  남의 학교 아이들 기록으로 걸어 들어갈 수 있다.)
create table if not exists public.growth_invites (
  code text primary key,
  school_id uuid not null references public.growth_schools (id) on delete cascade,
  role text not null check (role in ('owner', 'teacher', 'activity', 'guardian', 'student')),
  -- 보호자·학생 초대는 어느 아이에게 붙는지까지 정해서 낸다.
  student_id uuid,
  expires_at timestamptz,
  used_at timestamptz,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ───────────────────────── 학생 ─────────────────────────

create table if not exists public.growth_students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.growth_schools (id) on delete cascade,
  name text not null,
  birth_date date,
  grade text not null default '',
  photo_path text,
  interests text not null default '',
  dream text not null default '',
  gifts text not null default '',
  learning_note text not null default '',
  -- 동의 범위(기획서 §10). 기본은 전부 꺼짐 — 동의서를 받고 켠다.
  consent_photo_internal boolean not null default false,
  consent_photo_public boolean not null default false,
  consent_report_guardian boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists growth_students_school_idx on public.growth_students (school_id, active, name);

-- 초대 표가 학생 표보다 먼저 만들어져서 외래키를 나중에 건다.
-- (두 번 실행해도 터지지 않도록 감쌌다 — 이 리포의 마이그레이션은 사람이
--  SQL 편집기에 손으로 붙여 넣는다.)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'growth_invites_student_fk') then
    alter table public.growth_invites
      add constraint growth_invites_student_fk
      foreign key (student_id) references public.growth_students (id) on delete cascade;
  end if;
end $$;

-- 보호자 ↔ 자녀. 보호자가 볼 수 있는 범위는 전부 이 표에서 나온다.
create table if not exists public.growth_guardian_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.growth_students (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  relation text not null default '',
  created_at timestamptz not null default now(),
  unique (student_id, user_id)
);

-- 학생 본인 계정(있을 때만). 저학년은 계정 없이 교사 기기로 쓴다.
create table if not exists public.growth_student_accounts (
  student_id uuid primary key references public.growth_students (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id)
);

-- ───────────────────────── 권한 판정 함수 ─────────────────────────

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

-- ───────────────────────── 출결 ─────────────────────────

create table if not exists public.growth_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.growth_students (id) on delete cascade,
  -- 날짜는 화면이 서울 기준으로 만들어 넣는다(0077 의 판단과 같다).
  on_date date not null,
  status text not null check (status in ('present', 'late', 'absent', 'excused', 'early', 'field')),
  reason text not null default '',
  note text not null default '',
  recorded_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (student_id, on_date)
);

create index if not exists growth_attendance_date_idx on public.growth_attendance (on_date);

-- ───────────────────────── 매일 성장 기록 ─────────────────────────

create table if not exists public.growth_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.growth_students (id) on delete cascade,
  school_id uuid not null references public.growth_schools (id) on delete cascade,
  on_date date not null,
  -- 기획서 §4.2 의 여섯 영역.
  area text not null check (area in ('learning', 'attitude', 'relation', 'faith', 'health', 'teacher')),
  -- 네 단계. 「도움 필요」까지가 끝이다 — 낙인이 되는 표현은 두지 않는다.
  level text check (level in ('great', 'good', 'ok', 'help')),
  subject text not null default '',
  body text not null default '',
  -- 공개 범위. **기본이 교사만이다.** 손대지 않으면 밖으로 안 나간다.
  visibility text not null default 'teacher'
    check (visibility in ('teacher', 'guardian', 'open')),
  photo_path text,
  audio_path text,
  audio_seconds integer,
  -- 「다음 지도 행동」(기획서 §6). 기록이 지도로 이어지는 자리다.
  next_action text not null default '',
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists growth_records_student_idx on public.growth_records (student_id, on_date desc);
create index if not exists growth_records_school_date_idx on public.growth_records (school_id, on_date desc);

-- ───────────────────────── 체험활동 ─────────────────────────

create table if not exists public.growth_activities (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.growth_schools (id) on delete cascade,
  title text not null,
  on_date date not null,
  place text not null default '',
  leader text not null default '',
  goal text not null default '',
  subject_link text not null default '',
  supplies text not null default '',
  transport text not null default '',
  emergency text not null default '',
  safety text not null default '',
  story text not null default '',
  -- 보호자 공개는 교사가 검토한 뒤 켠다(기획서 §6 체험활동 흐름 5).
  shared_with_guardians boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists growth_activities_school_idx on public.growth_activities (school_id, on_date desc);

create table if not exists public.growth_activity_participants (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.growth_activities (id) on delete cascade,
  student_id uuid not null references public.growth_students (id) on delete cascade,
  role text not null default '',
  observation text not null default '',
  -- 학생이 직접 쓰는 칸. 교사 관찰과 섞지 않는다.
  reflection text not null default '',
  learned text not null default '',
  thanks text not null default '',
  next_step text not null default '',
  photo_path text,
  updated_at timestamptz not null default now(),
  unique (activity_id, student_id)
);

-- ───────────────────────── 목표·상담 ─────────────────────────

create table if not exists public.growth_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.growth_students (id) on delete cascade,
  -- 장기 → 학기 → 이번 달 → 이번 주(기획서 §4.4)
  horizon text not null check (horizon in ('long', 'term', 'month', 'week')),
  body text not null,
  method text not null default '',
  -- 'YYYY-MM'. 달·주 목표가 어느 달 것인지.
  period text not null default '',
  status text not null default 'active' check (status in ('active', 'done', 'paused')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists growth_goals_student_idx on public.growth_goals (student_id, horizon);

-- 상담·비공개 메모. **표를 아예 갈랐다** — 교직원만 읽는다.
create table if not exists public.growth_mentoring_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.growth_students (id) on delete cascade,
  on_date date not null,
  kind text not null default 'counsel' check (kind in ('counsel', 'health', 'family', 'other')),
  body text not null,
  follow_up text not null default '',
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists growth_mentoring_student_idx on public.growth_mentoring_notes (student_id, on_date desc);

-- ───────────────────────── 월간 성장보고서 ─────────────────────────

create table if not exists public.growth_monthly_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.growth_students (id) on delete cascade,
  -- 'YYYY-MM'
  period text not null,
  body text not null default '',
  teacher_letter text not null default '',
  next_goals text not null default '',
  home_suggestion text not null default '',
  -- draft: 교사 작성 중 / approved: 책임자 승인 / sent: 보호자 공개
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent')),
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, period)
);

-- 보호자 응원 댓글(기획서 §4.8).
create table if not exists public.growth_report_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.growth_monthly_reports (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── 공지 ─────────────────────────

create table if not exists public.growth_notices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.growth_schools (id) on delete cascade,
  title text not null,
  body text not null default '',
  on_date date,
  pinned boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── RLS ─────────────────────────

alter table public.growth_schools enable row level security;
alter table public.growth_members enable row level security;
alter table public.growth_invites enable row level security;
alter table public.growth_students enable row level security;
alter table public.growth_guardian_links enable row level security;
alter table public.growth_student_accounts enable row level security;
alter table public.growth_attendance enable row level security;
alter table public.growth_records enable row level security;
alter table public.growth_activities enable row level security;
alter table public.growth_activity_participants enable row level security;
alter table public.growth_goals enable row level security;
alter table public.growth_mentoring_notes enable row level security;
alter table public.growth_monthly_reports enable row level security;
alter table public.growth_report_comments enable row level security;
alter table public.growth_notices enable row level security;

drop policy if exists growth_schools_read on public.growth_schools;
create policy growth_schools_read on public.growth_schools for select
  using (public.growth_has_role(id, array['owner','teacher','activity','guardian','student']));

drop policy if exists growth_schools_insert on public.growth_schools;
create policy growth_schools_insert on public.growth_schools for insert
  with check (created_by = auth.uid());

drop policy if exists growth_schools_write on public.growth_schools;
create policy growth_schools_write on public.growth_schools for update
  using (public.growth_has_role(id, array['owner']))
  with check (public.growth_has_role(id, array['owner']));

-- 구성원: 자기 행은 늘 보이고, 교직원은 학교 전체가 보인다.
drop policy if exists growth_members_read on public.growth_members;
create policy growth_members_read on public.growth_members for select
  using (user_id = auth.uid() or public.growth_is_staff(school_id));

-- 첫 행(학교를 만든 사람이 자신을 owner 로 넣는 것)만 스스로 넣을 수 있다.
drop policy if exists growth_members_insert_self on public.growth_members;
create policy growth_members_insert_self on public.growth_members for insert
  with check (
    user_id = auth.uid()
    and (role = 'owner' or public.growth_is_staff(school_id))
  );

drop policy if exists growth_members_manage on public.growth_members;
create policy growth_members_manage on public.growth_members for update
  using (public.growth_has_role(school_id, array['owner']))
  with check (public.growth_has_role(school_id, array['owner']));

drop policy if exists growth_members_delete on public.growth_members;
create policy growth_members_delete on public.growth_members for delete
  using (public.growth_has_role(school_id, array['owner']));

-- 초대: 만들고 보는 것은 교직원만. 쓰는 것은 아래 rpc 가 한다.
drop policy if exists growth_invites_staff on public.growth_invites;
create policy growth_invites_staff on public.growth_invites for all
  using (public.growth_is_staff(school_id))
  with check (public.growth_is_staff(school_id));

drop policy if exists growth_students_read on public.growth_students;
create policy growth_students_read on public.growth_students for select
  using (public.growth_can_read_student(id));

drop policy if exists growth_students_write on public.growth_students;
create policy growth_students_write on public.growth_students for all
  using (public.growth_is_staff(school_id))
  with check (public.growth_is_staff(school_id));

drop policy if exists growth_guardian_links_read on public.growth_guardian_links;
create policy growth_guardian_links_read on public.growth_guardian_links for select
  using (user_id = auth.uid() or public.growth_can_write_student(student_id));

drop policy if exists growth_guardian_links_write on public.growth_guardian_links;
create policy growth_guardian_links_write on public.growth_guardian_links for all
  using (public.growth_can_write_student(student_id))
  with check (public.growth_can_write_student(student_id));

drop policy if exists growth_student_accounts_read on public.growth_student_accounts;
create policy growth_student_accounts_read on public.growth_student_accounts for select
  using (user_id = auth.uid() or public.growth_can_write_student(student_id));

drop policy if exists growth_student_accounts_write on public.growth_student_accounts;
create policy growth_student_accounts_write on public.growth_student_accounts for all
  using (public.growth_can_write_student(student_id))
  with check (public.growth_can_write_student(student_id));

drop policy if exists growth_attendance_read on public.growth_attendance;
create policy growth_attendance_read on public.growth_attendance for select
  using (public.growth_can_read_student(student_id));

drop policy if exists growth_attendance_write on public.growth_attendance;
create policy growth_attendance_write on public.growth_attendance for all
  using (public.growth_can_write_student(student_id))
  with check (public.growth_can_write_student(student_id));

-- 일일 기록: 교직원은 전부, 보호자는 자기 자녀의 'guardian' 이상, 학생 본인은 'open'.
drop policy if exists growth_records_read on public.growth_records;
create policy growth_records_read on public.growth_records for select
  using (
    public.growth_is_staff(school_id)
    or (visibility in ('guardian', 'open') and public.growth_is_guardian_of(student_id))
    or (visibility = 'open' and public.growth_is_student_self(student_id))
  );

drop policy if exists growth_records_write on public.growth_records;
create policy growth_records_write on public.growth_records for all
  using (public.growth_is_staff(school_id))
  with check (public.growth_is_staff(school_id));

drop policy if exists growth_activities_read on public.growth_activities;
create policy growth_activities_read on public.growth_activities for select
  using (
    public.growth_is_staff(school_id)
    or (shared_with_guardians and public.growth_has_role(school_id, array['guardian','student']))
  );

drop policy if exists growth_activities_write on public.growth_activities;
create policy growth_activities_write on public.growth_activities for all
  using (public.growth_is_staff(school_id))
  with check (public.growth_is_staff(school_id));

drop policy if exists growth_participants_read on public.growth_activity_participants;
create policy growth_participants_read on public.growth_activity_participants for select
  using (public.growth_can_read_student(student_id));

drop policy if exists growth_participants_write on public.growth_activity_participants;
create policy growth_participants_write on public.growth_activity_participants for all
  using (public.growth_can_write_student(student_id) or public.growth_is_student_self(student_id))
  with check (public.growth_can_write_student(student_id) or public.growth_is_student_self(student_id));

drop policy if exists growth_goals_read on public.growth_goals;
create policy growth_goals_read on public.growth_goals for select
  using (public.growth_can_read_student(student_id));

drop policy if exists growth_goals_write on public.growth_goals;
create policy growth_goals_write on public.growth_goals for all
  using (public.growth_can_write_student(student_id))
  with check (public.growth_can_write_student(student_id));

-- 상담 메모: 교직원만. 보호자·학생에게 열지 않는다.
drop policy if exists growth_mentoring_staff on public.growth_mentoring_notes;
create policy growth_mentoring_staff on public.growth_mentoring_notes for all
  using (public.growth_can_write_student(student_id))
  with check (public.growth_can_write_student(student_id));

-- 월간보고서: 보호자는 **발송(sent)된 것만** 본다. 작성 중인 초안은 안 나간다.
drop policy if exists growth_reports_read on public.growth_monthly_reports;
create policy growth_reports_read on public.growth_monthly_reports for select
  using (
    public.growth_can_write_student(student_id)
    or (status = 'sent'
        and (public.growth_is_guardian_of(student_id) or public.growth_is_student_self(student_id)))
  );

drop policy if exists growth_reports_write on public.growth_monthly_reports;
create policy growth_reports_write on public.growth_monthly_reports for all
  using (public.growth_can_write_student(student_id))
  with check (public.growth_can_write_student(student_id));

drop policy if exists growth_report_comments_read on public.growth_report_comments;
create policy growth_report_comments_read on public.growth_report_comments for select
  using (exists (select 1 from public.growth_monthly_reports r
                 where r.id = report_id and (
                   public.growth_can_write_student(r.student_id)
                   or (r.status = 'sent' and public.growth_is_guardian_of(r.student_id)))));

drop policy if exists growth_report_comments_write on public.growth_report_comments;
create policy growth_report_comments_write on public.growth_report_comments for insert
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.growth_monthly_reports r
                where r.id = report_id and (
                  public.growth_can_write_student(r.student_id)
                  or (r.status = 'sent' and public.growth_is_guardian_of(r.student_id)))));

drop policy if exists growth_notices_read on public.growth_notices;
create policy growth_notices_read on public.growth_notices for select
  using (public.growth_has_role(school_id, array['owner','teacher','activity','guardian','student']));

drop policy if exists growth_notices_write on public.growth_notices;
create policy growth_notices_write on public.growth_notices for all
  using (public.growth_is_staff(school_id))
  with check (public.growth_is_staff(school_id));

-- ───────────────────────── 초대 코드 사용 ─────────────────────────
--
-- 초대 표는 잠겨 있다(교직원만 읽는다). 코드를 들고 온 사람은 그 표를 읽지
-- 못하므로, 넣어 주는 함수 하나만 연다. 코드를 맞히려 해도 돌려주는 것이
-- 「들어갔다/못 들어갔다」뿐이라 학교 이름도 새지 않는다.
create or replace function public.growth_redeem_invite(p_code text, p_name text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v public.growth_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into v from public.growth_invites
   where code = upper(trim(p_code))
     and used_at is null
     and (expires_at is null or expires_at > now());

  if not found then
    raise exception '쓸 수 없는 초대 코드입니다.';
  end if;

  insert into public.growth_members (school_id, user_id, role, display_name)
  values (v.school_id, auth.uid(), v.role, coalesce(nullif(trim(p_name), ''), ''))
  on conflict (school_id, user_id, role) do update set active = true;

  if v.role = 'guardian' and v.student_id is not null then
    insert into public.growth_guardian_links (student_id, user_id)
    values (v.student_id, auth.uid())
    on conflict (student_id, user_id) do nothing;
  end if;

  if v.role = 'student' and v.student_id is not null then
    insert into public.growth_student_accounts (student_id, user_id)
    values (v.student_id, auth.uid())
    on conflict (student_id) do update set user_id = excluded.user_id;
  end if;

  -- 한 코드는 한 사람. 보호자 둘이면 코드를 둘 낸다.
  update public.growth_invites set used_at = now() where code = v.code;

  return v.school_id;
end;
$$;

grant execute on function public.growth_redeem_invite(text, text) to authenticated;

-- ───────────────────────── 사진·음성 통 ─────────────────────────
--
-- **비공개 통이다.** 미성년의 얼굴과 목소리가 들어간다. 주소가 한 번 새면
-- 되돌릴 길이 없어서, 0080 의 사역 자료 통과 같이 서명 주소로만 연다.
insert into storage.buckets (id, name, public)
values ('growth-media', 'growth-media', false)
on conflict (id) do nothing;

drop policy if exists growth_media_read on storage.objects;
create policy growth_media_read on storage.objects for select
  using (bucket_id = 'growth-media' and auth.uid() is not null);

drop policy if exists growth_media_write on storage.objects;
create policy growth_media_write on storage.objects for insert
  with check (bucket_id = 'growth-media' and auth.uid() is not null);

drop policy if exists growth_media_update on storage.objects;
create policy growth_media_update on storage.objects for update
  using (bucket_id = 'growth-media' and auth.uid() is not null);
