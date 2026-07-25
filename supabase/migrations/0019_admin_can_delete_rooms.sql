-- Let an admin delete any 성경통독방, not just the room's own owner — matches
-- the admin-can-moderate-anything pattern already in place for comments
-- (see 0018_comment_hide_and_moderation.sql). Cascade deletes (members/
-- activity/messages) already exist from 0006_room_delete.sql, unchanged.

create policy "admins can delete any room"
  on public.reading_rooms for delete
  using (exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_admin));
