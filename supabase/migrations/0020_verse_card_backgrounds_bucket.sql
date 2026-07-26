-- Storage bucket for 말씀카드 background photos. Public bucket (served via a
-- plain public URL, no auth needed to view) so the app can fetch a random
-- background without a signed-URL round trip. The select policy on
-- storage.objects lets the app LIST the bucket's current contents at
-- runtime (supabase.storage.from(...).list()) instead of hardcoding a file
-- count/names — the user can add or remove background photos later via the
-- Supabase dashboard's Storage UI with no app update needed.

insert into storage.buckets (id, name, public)
values ('verse-card-backgrounds', 'verse-card-backgrounds', true)
on conflict (id) do nothing;

create policy "public can list verse card backgrounds"
  on storage.objects for select
  using (bucket_id = 'verse-card-backgrounds');
