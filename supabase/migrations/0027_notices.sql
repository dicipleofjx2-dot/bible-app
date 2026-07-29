-- 알림마당 — 홈 화면 달력 위젯과 아이콘 그리드 사이 한 줄 게시판에서 제목만
-- 노출되고, 탭하면 전체 목록/상세로 이동한다. shepherd_letters와 동일한
-- is_admin 기반 RLS 패턴.

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_text text not null default '',
  is_published boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table notices enable row level security;

create policy "public can read published notices" on notices
  for select using (is_published = true);

create policy "admin can read all notices" on notices
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin can insert notices" on notices
  for insert with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin can update notices" on notices
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin can delete notices" on notices
  for delete using (exists (select 1 from profiles where id = auth.uid() and is_admin));
