-- 선교 카드에 사진과 영상을 붙인다.
--
-- 0085 의 cell_missions 에는 photo_url 한 칸뿐이었다. 선교지 소식은 사진 한 장으로
-- 끝나는 일이 거의 없고(현장 사진 여러 장 + 짧은 영상), 한 칸에 담으면 둘째 장부터
-- 갈 곳이 없다. 그래서 표를 따로 둔다. photo_url 은 남겨 둔다 — 이미 적어 둔 것이
-- 있으면 그대로 보이는 편이 낫다.
--
-- ── 영상 크기를 25MB 로 묶은 까닭 ──────────────────────────────────
-- Supabase 무료 한도는 저장 용량보다 **전송량**이 먼저 찬다. 2026-08-29 에 실제로
-- 전송량 한도에 걸려 프로젝트 두 개가 멎은 적이 있다. 선교 영상은 목장원이
-- 되풀이해 열어 보는 것이라 한 번 올린 영상이 몇 백 번 나간다.
-- 25MB 면 1080p 30초쯤 된다. 긴 영상은 유튜브에 올리고 주소만 적는 편이 맞다.

-- ════════════════════════════════════════════════════════════════════
-- 1. 통 — village-media
-- ════════════════════════════════════════════════════════════════════
--
-- 목장 사진을 감사일기(gratitude-photos)와 같은 통에 담지 않는다. 지우는 규칙이
-- 다르다 — 감사일기는 본인만, 목장 사진은 올린 사람과 목자가 지울 수 있어야 한다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'village-media',
  'village-media',
  true,
  26214400,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do update
  set public = true,
      file_size_limit = 26214400,
      allowed_mime_types = array[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/quicktime', 'video/webm'
      ];

drop policy if exists village_media_public_read on storage.objects;
create policy village_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'village-media');

-- 올리는 것은 로그인한 사람이면 된다. **어느 카드에 붙는지는 아래 표의 정책이
-- 지킨다** — 통에 파일이 있어도 카드에 못 걸면 아무 데도 안 보인다.
-- 저장소 정책에서 목장 소속까지 보려 하면 경로 문자열을 잘라 uuid 로 되돌려야
-- 하는데, 그 한 줄이 틀리면 조용히 다 막히거나 다 열린다.
drop policy if exists village_media_write on storage.objects;
create policy village_media_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'village-media');

-- 지우는 것은 올린 사람만. 목자가 카드에서 떼어내면 표의 줄만 사라지고 파일은
-- 남는데, 그건 괜찮다 — 걸리지 않은 파일은 아무 화면에도 안 나온다.
drop policy if exists village_media_delete_own on storage.objects;
create policy village_media_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'village-media' and owner = auth.uid());

-- ════════════════════════════════════════════════════════════════════
-- 2. cell_mission_media
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.cell_mission_media (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references cell_missions(id) on delete cascade,
  kind text not null default 'image' check (kind in ('image', 'video')),
  -- village-media 통 안의 경로. 전체 주소를 담지 않는다 — 나중에 통을 옮기면
  -- 담아 둔 주소가 전부 죽는다.
  path text not null,
  caption text,
  sort_order integer not null default 0,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists cell_mission_media_idx
  on public.cell_mission_media (mission_id, sort_order, created_at);

alter table public.cell_mission_media enable row level security;

-- 그 선교 카드를 볼 수 있으면 사진도 본다. 카드의 정책을 그대로 탄다.
drop policy if exists cell_mission_media_select on public.cell_mission_media;
create policy cell_mission_media_select on public.cell_mission_media
  for select using (
    exists (select 1 from cell_missions m where m.id = mission_id)
  );

-- 붙이는 것은 그 목장 사람이면 누구나. 선교 사진은 다녀온 사람이 갖고 있다.
drop policy if exists cell_mission_media_insert on public.cell_mission_media;
create policy cell_mission_media_insert on public.cell_mission_media
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from cell_missions m
       where m.id = mission_id and can_see_cell(m.cell_id)
    )
  );

-- 떼어내는 것은 붙인 사람과 목자·교역자.
drop policy if exists cell_mission_media_delete on public.cell_mission_media;
create policy cell_mission_media_delete on public.cell_mission_media
  for delete using (
    created_by = auth.uid()
    or exists (
      select 1 from cell_missions m
       where m.id = mission_id
         and (is_cell_leader_of(m.cell_id) or can_see_all_cells())
    )
  );
