-- Initial schema: profiles, verse marks (notes/highlights) sync, reading plans,
-- and community (posts/comments). Run this in the Supabase SQL editor, or via
-- `supabase db push` if you use the Supabase CLI.

-- ── profiles ────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── verse_marks (highlights + notes, mirrors the local expo-sqlite schema) ─
create table public.verse_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id integer not null,
  chapter integer not null,
  verse integer not null,
  translation text not null,
  color text,
  note text,
  updated_at timestamptz not null default now(),
  unique (user_id, book_id, chapter, verse, translation)
);

alter table public.verse_marks enable row level security;

create policy "users manage their own verse marks"
  on public.verse_marks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── reading plans (admin-managed content, public read-only) ──────────────
create table public.reading_plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.reading_plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.reading_plans (id) on delete cascade,
  day_number integer not null,
  book_id integer not null,
  chapter integer not null,
  unique (plan_id, day_number, book_id, chapter)
);

alter table public.reading_plans enable row level security;
alter table public.reading_plan_days enable row level security;

create policy "reading plans are viewable by everyone"
  on public.reading_plans for select
  using (true);

create policy "reading plan days are viewable by everyone"
  on public.reading_plan_days for select
  using (true);

-- ── per-user reading plan progress ────────────────────────────────────────
create table public.reading_plan_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.reading_plans (id) on delete cascade,
  day_number integer not null,
  completed_at timestamptz not null default now(),
  unique (user_id, plan_id, day_number)
);

alter table public.reading_plan_progress enable row level security;

create policy "users manage their own reading plan progress"
  on public.reading_plan_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── community: posts + comments ───────────────────────────────────────────
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id integer,
  chapter integer,
  verse integer,
  translation text,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;
alter table public.comments enable row level security;

create policy "posts are viewable by everyone"
  on public.posts for select
  using (true);

create policy "users insert their own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "users update or delete their own posts"
  on public.posts for update using (auth.uid() = user_id);

create policy "users delete their own posts"
  on public.posts for delete using (auth.uid() = user_id);

create policy "comments are viewable by everyone"
  on public.comments for select
  using (true);

create policy "users insert their own comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "users delete their own comments"
  on public.comments for delete using (auth.uid() = user_id);
