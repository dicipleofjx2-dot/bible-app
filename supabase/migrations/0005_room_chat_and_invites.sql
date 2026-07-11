-- room_members.user_id also needs to point at profiles(id) directly (same
-- reason as 0004: PostgREST can't auto-embed profiles(username) through a
-- shared reference to auth.users) so the member list can show usernames.
alter table public.room_members drop constraint room_members_user_id_fkey;
alter table public.room_members
  add constraint room_members_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

-- Chat messages for a room, shown interleaved with room_activity in one
-- timeline (see src/app/rooms/[id].tsx).
create table public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.reading_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.room_messages enable row level security;

create policy "members can view room messages"
  on public.room_messages for select
  using (
    exists (
      select 1 from public.room_members m
      where m.room_id = room_messages.room_id and m.user_id = auth.uid()
    )
  );

create policy "members can post their own room messages"
  on public.room_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.room_members m
      where m.room_id = room_messages.room_id and m.user_id = auth.uid()
    )
  );

-- Let the room owner add someone else as a member directly (no invite code
-- needed) — additive to the existing "users can join a room as themselves"
-- policy, since Postgres OR's multiple permissive policies together.
create policy "room owners can add members directly"
  on public.room_members for insert
  with check (
    auth.uid() = (select owner_id from public.reading_rooms where id = room_members.room_id)
  );
