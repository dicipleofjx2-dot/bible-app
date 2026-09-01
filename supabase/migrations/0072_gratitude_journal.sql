-- 감사일기장 — 사진이 들어가고, 원하면 함께 나눌 수 있는 감사 기록.
--
-- ── 왜 서버로 옮기나 ────────────────────────────────────────────────
-- 여태 감사 기록은 **기기 안 SQLite** 에만 있었다(0030 이 세운 원칙 — 리더는
-- 「했는가」만 보고 내용은 구조적으로 못 본다). 그런데 그러면
--   · 휴대폰을 바꾸면 지난 감사가 통째로 사라지고
--   · 사진을 넣을 자리가 없다(기기 안 파일 주소는 기기를 나가면 죽는다).
-- 감사일기는 몇 해 뒤에 다시 읽을 때 값이 나오는 기록이라, 사라지면 안 된다.
--
-- ── 사생활은 그대로 지킨다 ──────────────────────────────────────────
-- 기본은 **나만 본다**. 글마다 「함께 나누기」를 켠 것만 남에게 보인다.
-- 리더·관리자에게도 예외를 두지 않는다 — 켜지 않은 글은 아무도 못 읽는다.
-- R2M 「오늘의 훈련」 체크는 예전처럼 r2m_daily_checkins 의 불리언으로만 간다.
--
-- ── 사진 ────────────────────────────────────────────────────────────
-- 통 `gratitude-photos`. 이 앱의 다른 통과 같이 공개 읽기이고, 경로에 uuid 를
-- 넣어 남이 짐작할 수 없게 한다. 함께 나눈 글의 사진을 남이 보려면 공개 읽기가
-- 가장 단순하다(서명 주소는 만료 때문에 목록 화면에서 자꾸 깨진다).
-- **표에는 공개 주소가 아니라 경로만 담는다** — 프로젝트를 옮기면 예전 절대
-- 주소는 통째로 죽는다(서재 표지가 그렇게 깨진 적이 있다).

create table if not exists public.gratitude_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  -- 세 가지 감사. 빈 칸이어도 된다 — 하나만 적는 날도 있다.
  item1 text not null default '',
  item2 text not null default '',
  item3 text not null default '',
  -- 일기처럼 길게 쓰고 싶은 사람을 위한 자리.
  note text not null default '',
  -- 사진 **경로** 목록(공개 주소 아님). 최대 3장은 화면에서 막는다.
  photo_paths text[] not null default '{}',
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists gratitude_entries_user_date_idx
  on public.gratitude_entries (user_id, date desc);
create index if not exists gratitude_entries_shared_idx
  on public.gratitude_entries (date desc) where is_shared;

drop trigger if exists gratitude_entries_touch on public.gratitude_entries;
create or replace function public.gratitude_touch()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger gratitude_entries_touch before update on public.gratitude_entries
  for each row execute function public.gratitude_touch();

alter table public.gratitude_entries enable row level security;

drop policy if exists "gratitude read own or shared" on public.gratitude_entries;
create policy "gratitude read own or shared" on public.gratitude_entries
  for select using (user_id = auth.uid() or is_shared);

drop policy if exists "gratitude insert own" on public.gratitude_entries;
create policy "gratitude insert own" on public.gratitude_entries
  for insert with check (user_id = auth.uid());

drop policy if exists "gratitude update own" on public.gratitude_entries;
create policy "gratitude update own" on public.gratitude_entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "gratitude delete own" on public.gratitude_entries;
create policy "gratitude delete own" on public.gratitude_entries
  for delete using (user_id = auth.uid());

-- ── 사진 통 ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('gratitude-photos', 'gratitude-photos', true)
on conflict (id) do nothing;

drop policy if exists "gratitude photos are readable" on storage.objects;
create policy "gratitude photos are readable" on storage.objects
  for select using (bucket_id = 'gratitude-photos');

-- 올리기·지우기는 **자기 폴더에서만**. 경로 첫 칸이 그 사람의 uuid 다.
drop policy if exists "gratitude photos upload own" on storage.objects;
create policy "gratitude photos upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gratitude-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "gratitude photos delete own" on storage.objects;
create policy "gratitude photos delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'gratitude-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── 함께 나눈 감사 — 글쓴이 이름 ────────────────────────────────────
-- 이름은 profiles 를 직접 읽게 두지 않는다(이메일이 그대로 들어 있는 계정이
-- 많다). 교적 이름이 있으면 그것을, 없으면 별명을 돌려준다.
-- 0056·0066 의 real-name 함수와 같은 방식이다.
create or replace function public.gratitude_shared_feed(p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  author_name text,
  date date,
  item1 text,
  item2 text,
  item3 text,
  note text,
  photo_paths text[],
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select g.id, g.user_id,
         coalesce(nullif(m.name, ''), nullif(bp.display_name, ''), '이름 없음') as author_name,
         g.date, g.item1, g.item2, g.item3, g.note, g.photo_paths, g.created_at
    from gratitude_entries g
    left join members m on m.user_id = g.user_id
    left join bulletin_profiles bp on bp.user_id = g.user_id
   where g.is_shared
   order by g.date desc, g.created_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

revoke all on function public.gratitude_shared_feed(int) from public, anon;
grant execute on function public.gratitude_shared_feed(int) to authenticated;

comment on table public.gratitude_entries is
  '감사일기. 기본은 본인만 본다. is_shared 를 켠 글만 남에게 보인다.';
