-- Reading rooms: a room owner creates a room tied to one reading plan, invites
-- people via a short invite code, and members' daily-plan completions post
-- automatically to the room's activity feed (see src/app/(tabs)/read.tsx).

create table public.reading_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_id uuid not null references public.reading_plans (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.reading_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table public.room_activity (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.reading_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  day_number integer not null,
  book_id integer not null,
  chapter integer not null,
  created_at timestamptz not null default now(),
  unique (room_id, user_id, day_number)
);

alter table public.reading_rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_activity enable row level security;

-- Rooms themselves are discoverable by any signed-in user (needed so a client
-- can resolve an invite code to a room before joining) — but only members can
-- see who's in the room or what they've read (policies below).
create policy "signed-in users can view rooms"
  on public.reading_rooms for select
  using (auth.uid() is not null);

create policy "users create rooms they own"
  on public.reading_rooms for insert
  with check (auth.uid() = owner_id);

create policy "members can view room membership"
  on public.room_members for select
  using (
    exists (
      select 1 from public.room_members m
      where m.room_id = room_members.room_id and m.user_id = auth.uid()
    )
  );

create policy "users can join a room as themselves"
  on public.room_members for insert
  with check (auth.uid() = user_id);

create policy "members can view room activity"
  on public.room_activity for select
  using (
    exists (
      select 1 from public.room_members m
      where m.room_id = room_activity.room_id and m.user_id = auth.uid()
    )
  );

create policy "members can post their own room activity"
  on public.room_activity for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.room_members m
      where m.room_id = room_activity.room_id and m.user_id = auth.uid()
    )
  );

-- Auto-add the owner as a member the moment their room is created, so they
-- immediately pass the membership checks above without a second round trip.
create function public.handle_new_room()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.room_members (room_id, user_id) values (new.id, new.owner_id);
  return new;
end;
$$;

create trigger on_room_created
  after insert on public.reading_rooms
  for each row execute procedure public.handle_new_room();
