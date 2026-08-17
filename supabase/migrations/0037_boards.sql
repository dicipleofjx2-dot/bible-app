-- 게시판을 독립 기능으로 뺀다.
--
-- 0036에서 연재를 목자편지(shepherd_letters)에 얹었는데 그것이 잘못이었다.
-- 목자편지는 관리자만 쓸 수 있는 테이블이라, 거기에 연재를 붙이면 교회 게시판이
-- 관리자 전용이 되어 버린다. 옛 홈페이지의 게시판은 성도 누구나 쓰던 곳이다.
--
-- 목자편지는 원래대로 두고(관리자가 성도에게 보내는 편지), 게시판은 따로 만든다.

-- ── 0036에서 잘못 붙인 것을 떼어낸다 ────────────────────────────────────
alter table shepherd_letters drop column if exists series_id;
alter table shepherd_letters drop column if exists author_name;
drop table if exists letter_series;

-- ── 게시판 ──────────────────────────────────────────────────────────────

create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  -- 교회 홈페이지의 옛 게시판과 잇는 열쇠. 같은 값을 쓰면 옛 글 뒤에 이어진다.
  slug text not null unique,
  name text not null,
  description text not null default '',
  -- 'member'면 로그인한 교인 누구나, 'admin'이면 관리자만 글을 쓴다.
  -- 교회소식·일정표처럼 공지 성격인 곳까지 열어 두면 곤란해서 게시판마다 정한다.
  write_access text not null default 'member' check (write_access in ('member', 'admin')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists boards_order_idx on boards (sort_order);

alter table boards enable row level security;

drop policy if exists "anyone can read boards" on boards;
create policy "anyone can read boards" on boards
  for select using (true);

drop policy if exists "admin can manage boards" on boards;
create policy "admin can manage boards" on boards
  for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

-- ── 글 ──────────────────────────────────────────────────────────────────

create table if not exists board_posts (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  -- 쓴 사람 이름을 그대로 남긴다. 나중에 이름을 바꿔도 그때 쓴 이름이 유지되고,
  -- 글 목록을 그릴 때 프로필을 매번 조인하지 않아도 된다.
  author_name text not null default '',
  title text not null,
  body_text text not null default '',
  image_urls text[] not null default '{}',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists board_posts_board_idx on board_posts (board_id, created_at desc);

alter table board_posts enable row level security;

-- 홈페이지가 로그인 없이 읽어 가므로 공개 글은 누구나 볼 수 있어야 한다.
drop policy if exists "anyone can read published posts" on board_posts;
create policy "anyone can read published posts" on board_posts
  for select using (is_published = true and deleted_at is null);

-- 자기 글은 감춰 두었어도 본인이 볼 수 있어야 한다.
drop policy if exists "author can read own posts" on board_posts;
create policy "author can read own posts" on board_posts
  for select using (auth.uid() = author_id);

/** 이 게시판에 글을 쓸 수 있는가 — 게시판 설정과 관리자 여부를 함께 본다. */
create or replace function public.can_write_board(target_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from profiles where id = auth.uid() and is_admin)
    or exists (
      select 1 from boards
      where id = target_board_id and is_active = true and write_access = 'member'
    );
$$;

drop policy if exists "members can write posts" on board_posts;
create policy "members can write posts" on board_posts
  for insert with check (auth.uid() = author_id and public.can_write_board(board_id));

-- 고치고 지우는 것은 쓴 사람과 관리자만.
drop policy if exists "author or admin can update posts" on board_posts;
create policy "author or admin can update posts" on board_posts
  for update
  using (auth.uid() = author_id or exists (select 1 from profiles where id = auth.uid() and is_admin))
  with check (auth.uid() = author_id or exists (select 1 from profiles where id = auth.uid() and is_admin));

drop policy if exists "author or admin can delete posts" on board_posts;
create policy "author or admin can delete posts" on board_posts
  for delete
  using (auth.uid() = author_id or exists (select 1 from profiles where id = auth.uid() and is_admin));

-- ── 지금 홈페이지에 있는 게시판을 그대로 심는다 ─────────────────────────
--
-- slug를 홈페이지의 것과 똑같이 맞춰야 옛 글과 새 글이 한 게시판에서 이어진다.
-- 교회소식과 일정표는 공지 성격이라 관리자만 쓰게 두고 나머지는 열어 둔다.
insert into boards (slug, name, description, write_access, sort_order)
values
  ('testimony',       '은혜나눔',        '받은 은혜를 함께 나눕니다.',                     'member', 10),
  ('testimony-series','김지혜 사모 간증', '목회자의 아내로 걸어온 길을 한 편씩 나눕니다.',   'member', 20),
  ('pastor-testimony','김치훈 목사 간증', '부르심에서 개척까지의 여정을 한 편씩 나눕니다.',  'member', 30),
  ('mission-news',    '소식나눔',        '교우들의 소식을 나눕니다.',                      'member', 40),
  ('evangelism',      '70인 전도팀',     '전도팀 소식과 나눔입니다.',                      'member', 50),
  ('davidstone',      '데이빗스톤',      '데이빗스톤 사역 소식입니다.',                    'member', 60),
  ('police-mission',  '경찰선교',        '경찰선교 소식입니다.',                          'member', 70),
  ('world-mission',   '해외선교',        '해외선교지 소식입니다.',                        'member', 80),
  ('resources',       '자료실',          '함께 나눌 자료를 올립니다.',                     'member', 90),
  ('news',            '교회소식',        '교회에서 알리는 소식입니다.',                    'admin',  100),
  ('calendar',        '교회일정표',      '교회 일정입니다.',                              'admin',  110)
on conflict (slug) do nothing;
