-- 데이빗북스 표지 이미지 업로드용 Storage 버킷. 관리자가 등록 화면에서
-- 기기 사진첩의 이미지를 직접 올릴 수 있게 한다 (기존엔 URL만 입력 가능했음).
-- 0020_verse_card_backgrounds_bucket.sql과 같은 public 버킷 패턴이되,
-- 여기는 앱에서 직접 업로드도 해야 하므로 insert/update/delete 정책도 추가한다.

insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true)
on conflict (id) do nothing;

create policy "public can view book covers"
  on storage.objects for select
  using (bucket_id = 'book-covers');

create policy "admin can upload book covers"
  on storage.objects for insert
  with check (
    bucket_id = 'book-covers'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

create policy "admin can update book covers"
  on storage.objects for update
  using (
    bucket_id = 'book-covers'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

create policy "admin can delete book covers"
  on storage.objects for delete
  using (
    bucket_id = 'book-covers'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );
