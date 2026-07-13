-- "new row violates row-level security policy for table room_members" when
-- joining by invite code means neither INSERT policy on room_members is
-- passing. Re-assert both (drop + recreate) so this works regardless of
-- which earlier migrations actually landed — safe to run more than once.

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
