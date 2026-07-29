-- 데이빗북스 본문 파일(EPUB/PDF) 업로드용 Storage 버킷. 관리자가 텍스트를
-- 직접 붙여넣는 대신 실제 책 파일을 그대로 올릴 수 있게 한다.
-- 0023_book_covers_bucket.sql과 같은 패턴.

insert into storage.buckets (id, name, public)
values ('book-files', 'book-files', true)
on conflict (id) do nothing;

create policy "public can view book files"
  on storage.objects for select
  using (bucket_id = 'book-files');

create policy "admin can upload book files"
  on storage.objects for insert
  with check (
    bucket_id = 'book-files'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

create policy "admin can update book files"
  on storage.objects for update
  using (
    bucket_id = 'book-files'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

create policy "admin can delete book files"
  on storage.objects for delete
  using (
    bucket_id = 'book-files'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );
