-- 중보기도 나무 — 열매 하나가 기도 대상자 한 사람.
--
-- ── 왜 서버인가 ─────────────────────────────────────────────────────
-- 기도 대상자와 기도제목은 몇 해를 두고 쌓이는 기록이다. 기기 안에만 두면
-- 휴대폰을 바꾸는 순간 통째로 사라지고, 사진 자리도 없다(기기 안 파일 주소는
-- 기기를 나가면 죽는다). 감사일기(0072)와 같은 판단이다.
--
-- ── 사생활 ──────────────────────────────────────────────────────────
-- **누구와도 나누지 않는다.** 「아무개의 병」, 「아무개의 이혼」 같은 것이
-- 그대로 적히는 표다. 관리자에게도 예외를 두지 않는다 — 정책은 전부
-- user_id = auth.uid() 하나뿐이고, 공유 스위치 자체를 두지 않는다.
--
-- ── 열매 위치 ───────────────────────────────────────────────────────
-- pos_x / pos_y 는 0~1 의 비율이다. 화면 크기를 저장하면 폰과 웹에서 열매가
-- 서로 다른 자리에 뜬다. 비율로 담고 그릴 때 곱한다.

create table if not exists public.prayer_fruits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  -- 사진 **경로**(공개 주소 아님). 프로젝트를 옮기면 절대 주소는 통째로 죽는다.
  photo_path text,
  memo text not null default '',
  pos_x real not null default 0.5,
  pos_y real not null default 0.5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prayer_fruits_pos_x_range check (pos_x >= 0 and pos_x <= 1),
  constraint prayer_fruits_pos_y_range check (pos_y >= 0 and pos_y <= 1)
);

create index if not exists prayer_fruits_user_idx
  on public.prayer_fruits (user_id, created_at);

create table if not exists public.prayer_fruit_topics (
  id uuid primary key default gen_random_uuid(),
  fruit_id uuid not null references public.prayer_fruits (id) on delete cascade,
  -- fruit_id 로도 주인을 알 수 있지만, 정책이 매번 열매 표를 되짚지 않도록
  -- 주인을 여기에도 적어 둔다(그래야 select 정책이 한 줄로 끝난다).
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  answered boolean not null default false,
  answered_at timestamptz,
  answer_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prayer_fruit_topics_fruit_idx
  on public.prayer_fruit_topics (fruit_id, created_at);

-- 응답 시각은 화면이 아니라 표가 채운다. 화면에서 채우면 앱마다 시계가 달라진다.
create or replace function public.prayer_topic_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.answered and not coalesce(old.answered, false) then
    new.answered_at := now();
  elsif not new.answered then
    new.answered_at := null;
  end if;
  return new;
end $$;

drop trigger if exists prayer_fruit_topics_touch on public.prayer_fruit_topics;
create trigger prayer_fruit_topics_touch before update on public.prayer_fruit_topics
  for each row execute function public.prayer_topic_touch();

create or replace function public.prayer_fruit_touch()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists prayer_fruits_touch on public.prayer_fruits;
create trigger prayer_fruits_touch before update on public.prayer_fruits
  for each row execute function public.prayer_fruit_touch();

-- 기도음악. 사람마다 자기 유튜브 재생목록을 건다.
create table if not exists public.prayer_tree_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  playlist_url text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists prayer_tree_settings_touch on public.prayer_tree_settings;
create trigger prayer_tree_settings_touch before update on public.prayer_tree_settings
  for each row execute function public.prayer_fruit_touch();

alter table public.prayer_fruits enable row level security;
alter table public.prayer_fruit_topics enable row level security;
alter table public.prayer_tree_settings enable row level security;

drop policy if exists "prayer fruits own" on public.prayer_fruits;
create policy "prayer fruits own" on public.prayer_fruits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "prayer topics own" on public.prayer_fruit_topics;
create policy "prayer topics own" on public.prayer_fruit_topics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "prayer tree settings own" on public.prayer_tree_settings;
create policy "prayer tree settings own" on public.prayer_tree_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 열매 사진 통 ────────────────────────────────────────────────────
-- 이 앱의 다른 통과 같이 공개 읽기다. 경로 첫 칸이 그 사람의 uuid 이고,
-- 올리기·지우기는 그 칸이 자기 것일 때만 된다.
insert into storage.buckets (id, name, public)
values ('prayer-fruit-photos', 'prayer-fruit-photos', true)
on conflict (id) do nothing;

drop policy if exists "prayer fruit photos read" on storage.objects;
create policy "prayer fruit photos read" on storage.objects
  for select using (bucket_id = 'prayer-fruit-photos');

drop policy if exists "prayer fruit photos write own" on storage.objects;
create policy "prayer fruit photos write own" on storage.objects
  for insert with check (
    bucket_id = 'prayer-fruit-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "prayer fruit photos delete own" on storage.objects;
create policy "prayer fruit photos delete own" on storage.objects
  for delete using (
    bucket_id = 'prayer-fruit-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
