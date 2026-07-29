-- R2M 훈련과정 — 코스(course) + 주차별 커리큘럼(week) + 주차별 미션(mission) + 등록(enrollment).
-- books/shepherd_letters와 동일한 is_admin 기반 RLS 패턴. current_week은 컬럼으로 두지 않고
-- started_at + total_weeks에서 클라이언트가 계산한다(스키마 단순화).

create table if not exists r2m_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  total_weeks integer not null,
  leader_message text not null default '',
  is_published boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists r2m_course_weeks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references r2m_courses(id) on delete cascade,
  week_number integer not null,
  title text not null,
  theme text not null default '',
  description text not null default '',
  unique (course_id, week_number)
);

create table if not exists r2m_missions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references r2m_courses(id) on delete cascade,
  week_number integer not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists r2m_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references r2m_courses(id) on delete cascade,
  started_at date not null default current_date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table r2m_courses enable row level security;
alter table r2m_course_weeks enable row level security;
alter table r2m_missions enable row level security;
alter table r2m_enrollments enable row level security;

create policy "public can read published r2m courses" on r2m_courses
  for select using (is_published = true);
create policy "admin can read all r2m courses" on r2m_courses
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "admin can insert r2m courses" on r2m_courses
  for insert with check (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "admin can update r2m courses" on r2m_courses
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "admin can delete r2m courses" on r2m_courses
  for delete using (exists (select 1 from profiles where id = auth.uid() and is_admin));

-- weeks/missions: 공개 여부는 상위 course.is_published를 따른다.
create policy "public can read weeks of published courses" on r2m_course_weeks
  for select using (
    exists (select 1 from r2m_courses c where c.id = course_id and c.is_published)
  );
create policy "admin can manage r2m course weeks" on r2m_course_weeks
  for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "public can read missions of published courses" on r2m_missions
  for select using (
    exists (select 1 from r2m_courses c where c.id = course_id and c.is_published)
  );
create policy "admin can manage r2m missions" on r2m_missions
  for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

-- enrollments: 본인 것만 관리, admin은 전체 조회(리더관리 화면 — 등록 메타데이터만, 콘텐츠 아님).
create policy "select own r2m enrollments" on r2m_enrollments
  for select using (auth.uid() = user_id);
create policy "admin can read all r2m enrollments" on r2m_enrollments
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "insert own r2m enrollment" on r2m_enrollments
  for insert with check (auth.uid() = user_id);
create policy "update own r2m enrollment" on r2m_enrollments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
