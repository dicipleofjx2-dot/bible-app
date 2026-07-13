-- Consolidated re-assertion of everything room_members needs (schema +
-- RLS policies), safe to run any number of times regardless of which of
-- 0005/0007/0008/0009 actually landed before this. Fixes both the
-- "infinite recursion" and "new row violates row-level security policy"
-- errors seen when joining a room by invite code.

alter table public.room_members add column if not exists notified_at timestamptz default now();

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'room_members_user_id_fkey' and table_name = 'room_members'
  ) then
    alter table public.room_members drop constraint room_members_user_id_fkey;
  end if;
  alter table public.room_members
    add constraint room_members_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;
end $$;

create or replace function public.is_room_member(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.room_members
    where room_id = target_room_id and user_id = auth.uid()
  );
$$;

drop policy if exists "members can view room membership" on public.room_members;
create policy "members can view room membership"
  on public.room_members for select
  using (public.is_room_member(room_id));

drop policy if exists "users can join a room as themselves" on public.room_members;
create policy "users can join a room as themselves"
  on public.room_members for insert
  with check (auth.uid() = user_id);

drop policy if exists "room owners can add members directly" on public.room_members;
create policy "room owners can add members directly"
  on public.room_members for insert
  with check (
    auth.uid() = (select owner_id from public.reading_rooms where id = room_members.room_id)
  );

drop policy if exists "members can mark their own invite notified" on public.room_members;
create policy "members can mark their own invite notified"
  on public.room_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
