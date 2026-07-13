-- Tracks whether a member has "seen" being added to a room, so the app can
-- surface a one-time notification when a room owner invites someone
-- directly (skip it for self-joins via invite code, and for the owner's own
-- auto-added membership, since neither needs an "invited" notice).
alter table public.room_members add column notified_at timestamptz default now();

create policy "members can mark their own invite notified"
  on public.room_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
