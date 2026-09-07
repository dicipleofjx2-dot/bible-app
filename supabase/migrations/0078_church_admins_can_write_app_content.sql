-- 교회 관리자가 데이빗바이블의 글을 쓸 수 있게 한다.
--
-- ## 왜
--
-- 앱을 셋으로 갈랐다 — 데이빗바이블(개인 경건훈련) · 스마트주보(주보·홈페이지) ·
-- 목회 AI(교적·재정·목양). 그러면서 **글 쓰는 화면을 데이빗바이블 밖으로 옮긴다.**
-- 목자의 편지·알림마당·알림팝업은 주보 앱에서, 게시판 설정과 R2M 과정·리더 배정은
-- 목회 AI 앱에서 쓴다.
--
-- 그런데 이 표들의 쓰기 권한은 전부 `profiles.is_admin` **하나**로만 열려 있다.
-- 그건 데이빗바이블이 혼자 쓰던 표시다. 주보 쪽 권한(church_memberships.role)은
-- 여기에 아무 힘이 없어서, 주보편집자로 초대받은 분이 주보 앱에서 공지를 쓰면
-- 화면에는 단추가 보이는데 저장이 조용히 막힌다.
--
-- 그래서 **두 체계를 함수 하나로 잇는다.** 옛 표시(is_admin)는 그대로 살려 둔다 —
-- 지금 그 표시로 일하시는 분들이 계시고, 뺏으면 그날로 아무도 못 쓴다.
--
-- ## 함수가 두 개인 이유
--
-- 성도에게 알리는 글(편지·공지·팝업)과 판을 바꾸는 일(게시판 만들기·훈련과정·
-- 리더 배정)은 맡는 사람이 다르다. 주보편집자에게 게시판을 새로 만들 이유는 없다.
--
-- ⚠️ `has_church_role` 은 **스마트주보 리포의 마이그레이션**(0006, 0054)이 만든
-- 함수다. 두 앱이 같은 데이터베이스를 쓰기 때문에 여기서 부를 수 있다. 그쪽
-- 서열이 바뀌면 여기 판정도 같이 바뀐다 — 그게 맞다. 규칙은 한 군데에 있어야 한다.

-- ── 이을 함수 둘 ────────────────────────────────────────────────────────

-- 성도에게 알리는 글을 쓸 수 있는가. 주보편집자 이상.
create or replace function public.can_manage_church_content(target_church_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (select 1 from profiles where id = auth.uid() and is_admin)
    or (
      target_church_id is not null
      and public.has_church_role(target_church_id, array['editor'])
    );
$$;

-- 판을 바꿀 수 있는가. 관리자 이상.
create or replace function public.can_manage_church_settings(target_church_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (select 1 from profiles where id = auth.uid() and is_admin)
    or (
      target_church_id is not null
      and public.has_church_role(target_church_id, array['admin'])
    );
$$;

grant execute on function public.can_manage_church_content(uuid) to authenticated;
grant execute on function public.can_manage_church_settings(uuid) to authenticated;

-- ── 알림마당(notices) ───────────────────────────────────────────────────
--
-- 기존 is_admin 정책은 그대로 둔다. 정책은 **또는(OR)** 으로 묶이므로 덧대는
-- 것만으로 둘 다 통한다. 지우고 새로 쓰면 그 사이에 아무도 못 쓰는 틈이 생긴다.

drop policy if exists "church staff can read all notices" on notices;
create policy "church staff can read all notices" on notices
  for select using (public.can_manage_church_content(church_id));

drop policy if exists "church staff can insert notices" on notices;
create policy "church staff can insert notices" on notices
  for insert with check (public.can_manage_church_content(church_id));

drop policy if exists "church staff can update notices" on notices;
create policy "church staff can update notices" on notices
  for update using (public.can_manage_church_content(church_id));

drop policy if exists "church staff can delete notices" on notices;
create policy "church staff can delete notices" on notices
  for delete using (public.can_manage_church_content(church_id));

-- ── 목자의 편지(shepherd_letters) ───────────────────────────────────────

drop policy if exists "church staff can read all letters" on shepherd_letters;
create policy "church staff can read all letters" on shepherd_letters
  for select using (public.can_manage_church_content(church_id));

drop policy if exists "church staff can insert letters" on shepherd_letters;
create policy "church staff can insert letters" on shepherd_letters
  for insert with check (public.can_manage_church_content(church_id));

drop policy if exists "church staff can update letters" on shepherd_letters;
create policy "church staff can update letters" on shepherd_letters
  for update using (public.can_manage_church_content(church_id));

drop policy if exists "church staff can delete letters" on shepherd_letters;
create policy "church staff can delete letters" on shepherd_letters
  for delete using (public.can_manage_church_content(church_id));

-- ── 알림팝업(popup_notices) ─────────────────────────────────────────────

drop policy if exists popup_notices_church_staff_all on popup_notices;
create policy popup_notices_church_staff_all on popup_notices
  for all
  using (public.can_manage_church_content(church_id))
  with check (public.can_manage_church_content(church_id));

-- ── 게시판(boards) — 판을 바꾸는 일이라 관리자 이상 ─────────────────────

drop policy if exists "church admin can manage boards" on boards;
create policy "church admin can manage boards" on boards
  for all
  using (public.can_manage_church_settings(church_id))
  with check (public.can_manage_church_settings(church_id));

-- ── R2M 훈련과정 ────────────────────────────────────────────────────────
--
-- 주(週)와 미션에는 church_id 가 없다. 딸린 과정을 거슬러 올라가 판정한다.

drop policy if exists "church admin can manage r2m courses" on r2m_courses;
create policy "church admin can manage r2m courses" on r2m_courses
  for all
  using (public.can_manage_church_settings(church_id))
  with check (public.can_manage_church_settings(church_id));

drop policy if exists "church admin can manage r2m course weeks" on r2m_course_weeks;
create policy "church admin can manage r2m course weeks" on r2m_course_weeks
  for all
  using (
    exists (
      select 1 from r2m_courses c
       where c.id = r2m_course_weeks.course_id
         and public.can_manage_church_settings(c.church_id)
    )
  )
  with check (
    exists (
      select 1 from r2m_courses c
       where c.id = r2m_course_weeks.course_id
         and public.can_manage_church_settings(c.church_id)
    )
  );

drop policy if exists "church admin can manage r2m missions" on r2m_missions;
create policy "church admin can manage r2m missions" on r2m_missions
  for all
  using (
    exists (
      select 1 from r2m_courses c
       where c.id = r2m_missions.course_id
         and public.can_manage_church_settings(c.church_id)
    )
  )
  with check (
    exists (
      select 1 from r2m_courses c
       where c.id = r2m_missions.course_id
         and public.can_manage_church_settings(c.church_id)
    )
  );

-- ── R2M 리더 배정 ───────────────────────────────────────────────────────
--
-- 이 두 표에는 church_id 가 없다(교회가 하나일 때 만들었다). 배정하는 사람이
-- 자기 교회 관리자인지로 판정한다 — my_church_id() 는 profiles.church_id 다.

drop policy if exists "church admin can manage r2m leaders" on r2m_leaders;
create policy "church admin can manage r2m leaders" on r2m_leaders
  for all
  using (public.can_manage_church_settings(public.my_church_id()))
  with check (public.can_manage_church_settings(public.my_church_id()));

drop policy if exists "church admin can manage r2m leader assignments" on r2m_leader_members;
create policy "church admin can manage r2m leader assignments" on r2m_leader_members
  for all
  using (public.can_manage_church_settings(public.my_church_id()))
  with check (public.can_manage_church_settings(public.my_church_id()));

-- ── 그림 올리는 통 ──────────────────────────────────────────────────────
--
-- 글은 쓸 수 있는데 그림은 못 올리면 편지에 표지를 못 넣는다. 통에는 church_id 가
-- 없으니 올리는 사람의 교회로 판정한다.

drop policy if exists "church staff can upload shepherd letter images" on storage.objects;
create policy "church staff can upload shepherd letter images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'shepherd-letter-images'
    and public.can_manage_church_content(public.my_church_id())
  );

drop policy if exists "church staff can delete shepherd letter images" on storage.objects;
create policy "church staff can delete shepherd letter images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'shepherd-letter-images'
    and public.can_manage_church_content(public.my_church_id())
  );

drop policy if exists popup_images_church_staff_write on storage.objects;
create policy popup_images_church_staff_write
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'popup-images'
    and public.can_manage_church_content(public.my_church_id())
  );

drop policy if exists popup_images_church_staff_delete on storage.objects;
create policy popup_images_church_staff_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'popup-images'
    and public.can_manage_church_content(public.my_church_id())
  );

-- ── 들어갔는지 스스로 확인한다 ──────────────────────────────────────────
--
-- 함수만 만들어지고 정책이 빠지면 「화면에는 되는데 저장이 안 된다」가 된다.
-- 그 증상은 원인을 찾기까지 한참 걸린다.
do $$
declare
  missing text[] := array[]::text[];
  expected text[] := array[
    'church staff can insert notices',
    'church staff can insert letters',
    'popup_notices_church_staff_all',
    'church admin can manage boards',
    'church admin can manage r2m courses',
    'church admin can manage r2m leaders'
  ];
  p text;
begin
  foreach p in array expected loop
    if not exists (select 1 from pg_policies where policyname = p) then
      missing := missing || p;
    end if;
  end loop;
  if array_length(missing, 1) is not null then
    raise exception '정책이 빠졌습니다: %', missing;
  end if;
  raise notice '0078 적용 완료 — 교회 관리자도 앱의 글을 쓸 수 있습니다.';
end $$;
