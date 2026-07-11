-- Let a room owner delete their own room. Every child table (room_members,
-- room_activity, room_messages) references reading_rooms with "on delete
-- cascade", so deleting the room row cleans up all of its members, activity,
-- and chat history automatically.
create policy "owners can delete their own room"
  on public.reading_rooms for delete
  using (auth.uid() = owner_id);
