-- 샬롬기도단 (prayer group): login-only intercessory prayer requests + comments,
-- with a per-comment "hide" feature (hidden comments are only visible to the
-- comment's own author, the prayer request's author, and admins).
-- Run this in the Supabase SQL editor.

-- ── admin flag ──────────────────────────────────────────────────────────
-- No self-serve admin UI exists yet — grant admin manually via the Supabase
-- dashboard/SQL editor: `update public.profiles set is_admin = true where id = '<uuid>';`
alter table public.profiles add column is_admin boolean not null default false;

-- ── prayer_requests ─────────────────────────────────────────────────────
create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.prayer_requests enable row level security;

-- Login-required feature: only authenticated users can read prayer requests.
create policy "authenticated users view prayer requests"
  on public.prayer_requests for select
  using (auth.uid() is not null);

create policy "users insert their own prayer requests"
  on public.prayer_requests for insert
  with check (auth.uid() = user_id);

create policy "users delete their own prayer requests"
  on public.prayer_requests for delete
  using (auth.uid() = user_id);

-- ── prayer_comments ─────────────────────────────────────────────────────
create table public.prayer_comments (
  id uuid primary key default gen_random_uuid(),
  prayer_request_id uuid not null references public.prayer_requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.prayer_comments enable row level security;

-- A hidden comment is only visible to: its own author, the prayer request's
-- author, or an admin. Everyone else simply doesn't see the row.
create policy "prayer comments visible per hide rules"
  on public.prayer_comments for select
  using (
    not hidden
    or auth.uid() = user_id
    or auth.uid() = (select pr.user_id from public.prayer_requests pr where pr.id = prayer_request_id)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy "users insert their own prayer comments"
  on public.prayer_comments for insert
  with check (auth.uid() = user_id);

-- Hide/unhide is implemented as an update of the `hidden` column, allowed for
-- the comment's own author, the prayer request's author (post-owner
-- moderation), or an admin.
create policy "hide prayer comments per rules"
  on public.prayer_comments for update
  using (
    auth.uid() = user_id
    or auth.uid() = (select pr.user_id from public.prayer_requests pr where pr.id = prayer_request_id)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() = (select pr.user_id from public.prayer_requests pr where pr.id = prayer_request_id)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy "delete prayer comments per rules"
  on public.prayer_comments for delete
  using (
    auth.uid() = user_id
    or auth.uid() = (select pr.user_id from public.prayer_requests pr where pr.id = prayer_request_id)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
