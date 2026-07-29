-- R2M "오늘의 훈련" 자동 체크인 — 순전히 기기-로컬(SQLite) 항목(QT/성경읽기/묵상/순종/감사)의
-- 완료 여부만 서버에 핑(ping)한다. 실제 노트/일기 내용은 이 테이블에 전혀 없으므로 리더가
-- 완료 여부는 볼 수 있어도 내용은 구조적으로 절대 열람할 수 없다.
create table if not exists r2m_daily_checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  qt boolean not null default false,
  reading boolean not null default false,
  meditation boolean not null default false,
  obedience boolean not null default false,
  gratitude boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table r2m_daily_checkins enable row level security;

create policy "select own r2m checkins" on r2m_daily_checkins
  for select using (auth.uid() = user_id);
create policy "admin can read all r2m checkins" on r2m_daily_checkins
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "manage own r2m checkins" on r2m_daily_checkins
  for insert with check (auth.uid() = user_id);
create policy "update own r2m checkins" on r2m_daily_checkins
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- R2M "기도" 오늘의 훈련 항목 — 내용 없이 타임스탬프만 남기는 가벼운 기도 기록.
-- 기도방(prayer_requests)과 별개: 실제 기도제목 글쓰기와 무관하게 "방금 기도했어요"를 기록.
create table if not exists prayer_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table prayer_logs enable row level security;

create policy "select own prayer logs" on prayer_logs
  for select using (auth.uid() = user_id);
create policy "admin can read all prayer logs" on prayer_logs
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "insert own prayer log" on prayer_logs
  for insert with check (auth.uid() = user_id);

-- 리더관리 화면이 암송 완료 여부를 전체 훈련생 기준으로 봐야 하는데, 기존
-- reading_helper_day_records(0022)에는 본인 행만 보는 정책만 있었다 — admin 조회 정책 추가.
create policy "admin can read all reading helper day records" on reading_helper_day_records
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin));
