-- 개인 서재(전자책) 기능 — 홈 화면의 "전자책" 메뉴에서 쓰는 책/구매/구독 테이블.
-- personal-library-app(별도 웹앱) 세션에서 설계한 스키마를 이 프로젝트에 맞게 가져옴:
-- 관리자 판단은 새 profiles.role 컬럼을 추가하는 대신, 기존에 이미 쓰고 있는
-- profiles.is_admin(0019_admin_can_delete_rooms.sql 등에서 이미 사용 중)을 그대로 재사용한다.

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  format text not null default 'epub' check (format in ('epub', 'pdf')),
  file_path text,
  cover_url text,
  category text not null check (category in ('저서', '성경공부교재')),
  description text not null default '',
  price integer not null default 0,
  access_tier text not null default 'purchase_only'
    check (access_tier in ('free', 'purchase_only', 'subscription_included', 'both')),
  language text not null default 'ko' check (language in ('ko', 'en')),
  translation_group_id text,
  is_published boolean not null default true,
  -- 문단은 프론트에서 빈 줄(\n\n) 기준으로 나눈다.
  body_text text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table books enable row level security;

create policy "public can read published books" on books
  for select using (is_published = true);

create policy "admin can read all books" on books
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin can insert books" on books
  for insert with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin can update books" on books
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin can delete books" on books
  for delete using (exists (select 1 from profiles where id = auth.uid() and is_admin));

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  payment_id text,
  amount integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded')),
  purchased_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null default 'default',
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due')),
  billing_key text,
  current_period_end timestamptz,
  next_billing_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table purchases enable row level security;
alter table subscriptions enable row level security;

create policy "select own purchases" on purchases
  for select using (auth.uid() = user_id);

create policy "select own subscriptions" on subscriptions
  for select using (auth.uid() = user_id);

-- 본인 명의로만 "pending" 구매를 만들 수 있다. status를 'paid'로 바로
-- insert/update하는 건 클라이언트에 허용하지 않는다 — 실제 포트원 결제 검증을
-- 마친 서버(edge function, service role)만 할 수 있어야 한다.
create policy "insert own pending purchase" on purchases
  for insert with check (auth.uid() = user_id and status = 'pending');

create policy "update own pending purchase" on purchases
  for update using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'pending');

-- 구독은 결제 연동 전까지 임시로 클라이언트가 직접 켜고 끌 수 있게 둔다
-- (실제 정기결제가 붙기 전 데모/QA 용도).
create policy "manage own subscription" on subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- DEV ONLY — 포트원 키가 아직 없어 실결제 검증 서버를 못 붙인 동안,
-- 구매 플로우를 눈으로 확인해보고 싶을 때만 아래 주석을 풀어서 켤 것.
-- 이 정책이 켜져 있으면 "결제 안 하고 책을 공짜로 얻는" 게 가능해지므로,
-- 실제 포트원 연동 후에는 반드시 DROP POLICY로 제거해야 한다.
-- ============================================================
-- create policy "DEV ONLY client can mark own purchase paid" on purchases
--   for update using (auth.uid() = user_id)
--   with check (auth.uid() = user_id and status in ('pending', 'paid'));
--
-- 제거할 때: drop policy "DEV ONLY client can mark own purchase paid" on purchases;
