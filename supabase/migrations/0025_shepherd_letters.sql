-- 목자의 편지(담임목사 블로그) — 홈 화면 아이콘에서 진입. 관리자가 사진 포함
-- 블로그 형식으로 글을 쓰면 전체 사용자에게 공개된다. books 테이블(0021)과
-- 동일한 is_admin 기반 RLS 패턴을 그대로 재사용.

create table if not exists shepherd_letters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cover_url text,
  -- 문단은 프론트에서 빈 줄(\n\n) 기준으로 나눈다 (books.body_text와 동일 규칙).
  body_text text not null default '',
  -- 본문 아래 갤러리로 보여줄 추가 사진들.
  image_urls text[] not null default '{}',
  is_published boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table shepherd_letters enable row level security;

create policy "public can read published shepherd letters" on shepherd_letters
  for select using (is_published = true);

create policy "admin can read all shepherd letters" on shepherd_letters
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin can insert shepherd letters" on shepherd_letters
  for insert with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin can update shepherd letters" on shepherd_letters
  for update using (exists (select 1 from profiles where id = auth.uid() and is_admin));

create policy "admin can delete shepherd letters" on shepherd_letters
  for delete using (exists (select 1 from profiles where id = auth.uid() and is_admin));
