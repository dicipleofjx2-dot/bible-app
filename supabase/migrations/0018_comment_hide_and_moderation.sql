-- 커뮤니티 댓글 숨기기/삭제 moderation, matching the pattern already shipped for
-- 샬롬기도단 (see 0015_prayer_group.sql) — a hidden comment is only visible to
-- its own author, the post's author, or an admin; hide/unhide and delete are
-- allowed for the same three roles (previously delete was owner-only, and
-- there was no hide concept at all).

alter table public.comments add column hidden boolean not null default false;

drop policy "comments are viewable by everyone" on public.comments;

create policy "comments visible per hide rules"
  on public.comments for select
  using (
    not hidden
    or auth.uid() = user_id
    or auth.uid() = (select p.user_id from public.posts p where p.id = post_id)
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_admin)
  );

create policy "hide comments per rules"
  on public.comments for update
  using (
    auth.uid() = user_id
    or auth.uid() = (select p.user_id from public.posts p where p.id = post_id)
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_admin)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() = (select p.user_id from public.posts p where p.id = post_id)
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_admin)
  );

drop policy "users delete their own comments" on public.comments;

create policy "delete comments per rules"
  on public.comments for delete
  using (
    auth.uid() = user_id
    or auth.uid() = (select p.user_id from public.posts p where p.id = post_id)
    or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_admin)
  );
