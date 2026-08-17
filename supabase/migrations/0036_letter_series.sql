-- 목자편지에 "연재"를 붙인다.
--
-- 교회 홈페이지 게시판에 사모님과 목사님의 간증 연재 55편이 실려 있는데,
-- 그 게시판은 옛 홈페이지에서 한 번 긁어와 굳혀 둔 파일이라 더 쓸 수가 없다.
-- 설명문에는 "지금도 이어지고 있습니다"라고 적혀 있는데 이어갈 방법이 없었다.
--
-- 글을 쓸 수 있는 곳은 데이빗바이블의 목자편지 하나뿐이고, 그 글은 이미
-- 홈페이지로 흘러간다. 여기에 연재 구분만 붙이면 옛 글 뒤에 새 글이 그대로
-- 이어진다.
--
-- 연재 목록을 코드에 박지 않고 테이블로 두는 이유는, 앞으로 선교지 편지나
-- 신앙 칼럼처럼 다른 연재가 생길 때 배포 없이 추가하기 위해서다.

create table if not exists letter_series (
  id uuid primary key default gen_random_uuid(),
  -- 홈페이지 게시판의 옛 연재와 이어 붙이는 열쇠. 같은 값을 쓰면 한 줄로 이어진다.
  -- (지금 홈페이지의 값: testimony-series, pastor-testimony)
  slug text not null unique,
  name text not null,
  author text not null default '',
  description text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists letter_series_order_idx on letter_series (sort_order);

alter table letter_series enable row level security;

-- 연재 이름은 홈페이지에도 그대로 나가는 공개 정보다. 고치는 것은 관리자만.
drop policy if exists "anyone can read letter series" on letter_series;
create policy "anyone can read letter series" on letter_series
  for select using (true);

drop policy if exists "admin can manage letter series" on letter_series;
create policy "admin can manage letter series" on letter_series
  for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin));

-- ── 편지에 연재와 글쓴이를 붙인다 ───────────────────────────────────────
--
-- 연재에 속하지 않는 편지(그때그때 쓰는 목자편지)도 그대로 쓸 수 있어야 하므로
-- 비워 둘 수 있게 한다.
alter table shepherd_letters add column if not exists series_id uuid
  references letter_series(id) on delete set null;

-- 연재는 글쓴이가 곧 정체성이다. 연재의 기본 글쓴이를 두되, 편지마다 다르게
-- 적을 수 있게 컬럼을 따로 둔다(공동 연재, 대필 등).
alter table shepherd_letters add column if not exists author_name text;

create index if not exists shepherd_letters_series_idx
  on shepherd_letters (series_id, created_at desc);

-- ── 지금 홈페이지에 있는 두 연재를 심는다 ───────────────────────────────
--
-- slug를 홈페이지의 것과 똑같이 맞춰야 옛 글과 새 글이 한 게시판에서 이어진다.
insert into letter_series (slug, name, author, description, sort_order)
values
  (
    'testimony-series',
    '김지혜 사모 간증',
    '김지혜',
    '목회자의 아내로 걸어온 길에서 만난 하나님의 인도하심을 한 편씩 나눕니다.',
    10
  ),
  (
    'pastor-testimony',
    '김치훈 목사 간증',
    '김치훈',
    '부르심에서 개척까지, 성령의 인도하심을 따라 걸어온 목회의 여정을 한 편씩 나눕니다.',
    20
  )
on conflict (slug) do nothing;
