-- prayer_requests/prayer_comments.user_id reference auth.users(id) (from
-- 0015_prayer_group.sql), but src/db/prayer.ts selects `profiles(username)`
-- as an embedded resource — PostgREST can only auto-embed profiles when
-- there's a *direct* foreign key to public.profiles, not just a shared
-- reference to auth.users (see 0004_fix_profile_relationships.sql, which hit
-- and fixed this exact issue for posts/comments/room_activity; prayer_* was
-- added later and missed it). Every getPrayerRequests()/getPrayerComments()
-- call has been throwing PGRST200 ("Could not find a relationship between
-- 'prayer_requests' and 'profiles'"), silently swallowed by a .catch(() =>
-- []) in the app — so posting succeeded (insert only needs auth.users) but
-- the feed always rendered empty. Point both at profiles(id) instead (same
-- UUID values, since every auth user gets a profiles row via
-- handle_new_user).

alter table public.prayer_requests drop constraint prayer_requests_user_id_fkey;
alter table public.prayer_requests
  add constraint prayer_requests_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.prayer_comments drop constraint prayer_comments_user_id_fkey;
alter table public.prayer_comments
  add constraint prayer_comments_user_id_fkey foreign key (user_id) references public.profiles (id) on delete cascade;
