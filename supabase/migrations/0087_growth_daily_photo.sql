-- 성장ON — 오늘의 사진 (기획서 §4.1 「오늘의 사진과 공동체 한 줄 기록」)
--
-- **0084 다음에 실행한다.** 이 파일은 0084 가 만든 권한 판정 함수
-- (`growth_is_staff`, `growth_has_role`)와 `growth-media` 통을 그대로 쓴다.
--
-- ── 왜 표를 따로 두는가 ─────────────────────────────────────────────
-- 일일 기록(growth_records)의 사진은 **학생 한 명**에게 붙는다. 대문에 거는
-- 사진은 그 날 **학교 전체**의 한 장면이라 붙을 학생이 없다. 학생 하나를
-- 골라 붙이면 그 아이의 성장 기록에 반 전체 사진이 섞인다.
--
-- ── 누가 올리는가 ───────────────────────────────────────────────────
-- **교직원이면 누구라도.** 최고관리자만 올리게 하면 그 사람이 없는 날 대문이
-- 빈다. 대신 누가 올렸는지(author_id)는 남긴다 — 지울 때 물어볼 사람이 있어야
-- 한다.
--
-- ── 누가 보는가 ─────────────────────────────────────────────────────
-- 그 학교 사람만. 보호자·학생도 본다(대문이니까). **밖으로는 열지 않는다** —
-- 미성년의 얼굴이다. 통도 0084 의 비공개 통 그대로라, 화면이 한 시간짜리
-- 서명 주소를 받아 연다.

create table if not exists public.growth_daily_photos (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.growth_schools (id) on delete cascade,
  -- 날짜는 화면이 서울 기준으로 만들어 넣는다(0084 의 출결과 같다).
  on_date date not null,
  photo_path text not null,
  caption text not null default '',
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 하루에 여러 장을 받는다. 한 장으로 묶으면 두 번째 선생님이 올릴 때 앞 사람의
-- 사진이 소리 없이 사라진다. 대문에는 가장 나중 것을 건다.
create index if not exists growth_daily_photos_day_idx
  on public.growth_daily_photos (school_id, on_date desc, created_at desc);

alter table public.growth_daily_photos enable row level security;

drop policy if exists growth_daily_photos_read on public.growth_daily_photos;
create policy growth_daily_photos_read on public.growth_daily_photos for select
  using (public.growth_has_role(school_id, array['owner','teacher','activity','guardian','student']));

drop policy if exists growth_daily_photos_write on public.growth_daily_photos;
create policy growth_daily_photos_write on public.growth_daily_photos for all
  using (public.growth_is_staff(school_id))
  with check (public.growth_is_staff(school_id));
