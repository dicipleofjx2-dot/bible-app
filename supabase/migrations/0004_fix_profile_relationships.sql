-- posts/comments/room_activity all reference auth.users(id) for user_id, and
-- profiles(id) separately also references auth.users(id) — but PostgREST can
-- only auto-embed `profiles(...)` in a select() when there's a *direct*
-- foreign key to the profiles table, not just a shared reference to
-- auth.users. Point these at profiles(id) instead (same UUID values, since
-- every auth user gets a profiles row via the handle_new_user trigger) so the
-- `profiles(username)` embeds used by src/db/community.ts and src/db/rooms.ts
-- resolve correctly.

alter table public.posts drop constraint posts_user_id_fkey;
alter table public.posts
  add constraint posts_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.comments drop constraint comments_user_id_fkey;
alter table public.comments
  add constraint comments_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.room_activity drop constraint room_activity_user_id_fkey;
alter table public.room_activity
  add constraint room_activity_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;
