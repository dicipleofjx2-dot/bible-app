-- 성경통독도우미: the blog-driven 365-day reading plan + quiz + memorization
-- puzzle program, previously its own standalone app (bible-quiz-app), now
-- folded into 데이빗바이블 as a home-screen feature. Content itself (narrative/
-- quiz questions/memorization verse) is fetched live from the
-- biblereadinghelper.blogspot.com feed, not stored here — these tables only
-- hold each user's personal progress.
-- Run this in the Supabase SQL editor.

create table public.reading_helper_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  start_date date not null,
  created_at timestamptz not null default now()
);

alter table public.reading_helper_progress enable row level security;

create policy "users manage their own reading helper progress"
  on public.reading_helper_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.reading_helper_day_records (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  reading_complete boolean not null default false,
  quiz_score integer,
  memorization_success boolean,
  memorization_attempts integer,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.reading_helper_day_records enable row level security;

create policy "users manage their own reading helper day records"
  on public.reading_helper_day_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
