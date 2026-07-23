-- 샬롬기도단 후속 개선: 기도제목/댓글 4색 하이라이트 태그 + 기도제목 owner-update
-- 정책 추가 (색상 변경을 위해 필요, 지금까지는 insert/select/delete만 있었음).
-- Run this in the Supabase SQL editor.

alter table public.prayer_requests add column color text;
alter table public.prayer_comments add column color text;

-- prayer_requests had no update policy at all yet — needed so the owner can
-- set/change their own post's highlight color.
create policy "users update their own prayer requests"
  on public.prayer_requests for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- prayer_comments already has an update policy ("hide prayer comments per
-- rules", see 0015_prayer_group.sql) covering the comment's own author, the
-- prayer request's author, or an admin — that same policy governs the new
-- `color` column too (RLS is row-level, not column-level), so no new policy
-- is needed here.
