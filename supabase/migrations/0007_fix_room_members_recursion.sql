-- "members can view room membership" (0003) checks membership by selecting
-- from room_members from inside room_members' own SELECT policy. Evaluating
-- that policy re-triggers the same policy on the inner select, forever:
-- "infinite recursion detected in policy for relation room_members". Any
-- query touching room_members (or room_activity/room_messages, which also
-- subquery room_members) hits this.
--
-- Fix: move the membership check into a SECURITY DEFINER function, which
-- runs with the function owner's privileges and so is not itself subject to
-- room_members' RLS policies — breaking the recursive loop.
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

drop policy "members can view room membership" on public.room_members;
create policy "members can view room membership"
  on public.room_members for select
  using (public.is_room_member(room_id));
