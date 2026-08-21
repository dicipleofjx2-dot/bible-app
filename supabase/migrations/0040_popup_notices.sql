-- 알림 팝업.
--
-- 성도에게 꼭 알려야 할 것이 생겼을 때(수련회 신청 마감, 예배 시간 변경) 지금은
-- 알릴 자리가 없다. 알림마당에 올려도 들어와 봐야 보인다. 앱을 열자마자 한 번
-- 보여 주는 자리가 필요하다.
--
-- 두 가지를 처음부터 정해 둔다.
--   · **기간** — 올리는 날과 내리는 날. 지난 공지가 계속 뜨는 것이 가장 나쁘다.
--     사람이 잊고 안 내려도 저절로 사라져야 한다.
--   · **오늘 하루 보지 않기** — 매번 뜨면 성도가 앱을 피하게 된다. 그 기록은
--     기기에만 남긴다(서버에 둘 만한 것이 아니고, 사람마다 기기가 다르다).

create table if not exists popup_notices (
  id uuid primary key default gen_random_uuid(),
  -- 교회마다 따로 띄운다. 0038에서 profiles.church_id로 교회를 나눴다.
  church_id uuid references churches(id) on delete cascade,
  title text not null,
  body text,
  image_url text,
  /** 눌렀을 때 갈 곳. 앱 안 경로(/notice-board)도 되고 바깥 주소도 된다. */
  link_url text,
  link_label text,
  /** 올리는 기간. 비우면 그날부터 / 끝없이. */
  starts_on date,
  ends_on date,
  /** 기간과 별개로 끄고 켠다 — 급히 내려야 할 때 날짜를 고치는 것보다 빠르다. */
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists popup_notices_active_idx
  on popup_notices (church_id, is_active, starts_on, ends_on);

alter table popup_notices enable row level security;

-- 보기: 자기 교회의, 켜져 있고, 기간 안에 든 것만.
--
-- 기간 판정을 화면이 아니라 여기서 한다. 화면에서 걸러면 기기 시계가 틀어졌을
-- 때 지난 공지가 뜬다. 그리고 화면이 여러 개면(홈·읽기) 같은 규칙을 두 번
-- 적게 된다.
drop policy if exists popup_notices_read on popup_notices;
create policy popup_notices_read on popup_notices
  for select using (
    is_active
    and (starts_on is null or starts_on <= current_date)
    and (ends_on is null or ends_on >= current_date)
    and (
      church_id is null
      or church_id = (select church_id from profiles where id = auth.uid())
    )
  );

-- 쓰기: 관리자만. 관리자 판정은 profiles.is_admin으로 이미 하고 있다.
drop policy if exists popup_notices_admin_all on popup_notices;
create policy popup_notices_admin_all on popup_notices
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin)
  ) with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

drop trigger if exists popup_notices_set_updated_at on popup_notices;
create trigger popup_notices_set_updated_at before update on popup_notices
  for each row execute function set_updated_at();

-- 팝업 그림을 담을 자리. 목자편지 그림과 같은 통을 쓰면 관리 화면에서 서로
-- 섞여 보이므로 따로 판다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'popup-images',
  'popup-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists popup_images_public_read on storage.objects;
create policy popup_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'popup-images');

drop policy if exists popup_images_admin_write on storage.objects;
create policy popup_images_admin_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'popup-images'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

drop policy if exists popup_images_admin_delete on storage.objects;
create policy popup_images_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'popup-images'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

-- 적용됐는지 스스로 확인한다. 표만 만들어지고 통이 빠지면 그림만 안 올라가는,
-- 알아채기 어려운 상태가 된다.
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'popup-images') then
    raise exception '팝업 그림 저장소가 만들어지지 않았습니다.';
  end if;
  raise notice '알림 팝업 표와 그림 저장소가 준비됐습니다.';
end $$;

notify pgrst, 'reload schema';
