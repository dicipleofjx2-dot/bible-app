-- 목자의 편지 표지/본문 사진 업로드용 Storage 버킷.
-- book-covers(0023)와 동일한 public + admin 업로드 패턴.

insert into storage.buckets (id, name, public)
values ('shepherd-letter-images', 'shepherd-letter-images', true)
on conflict (id) do nothing;

create policy "public can view shepherd letter images"
  on storage.objects for select
  using (bucket_id = 'shepherd-letter-images');

create policy "admin can upload shepherd letter images"
  on storage.objects for insert
  with check (
    bucket_id = 'shepherd-letter-images'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

create policy "admin can update shepherd letter images"
  on storage.objects for update
  using (
    bucket_id = 'shepherd-letter-images'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

create policy "admin can delete shepherd letter images"
  on storage.objects for delete
  using (
    bucket_id = 'shepherd-letter-images'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );
