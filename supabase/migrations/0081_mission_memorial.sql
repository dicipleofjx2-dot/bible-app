-- 사명기록관 3단계 — 디지털 기념관 (기획서 §4·§15).
--
-- ── 여기만 밖으로 열린다 ────────────────────────────────────────────
-- 0079·0080 의 표는 전부 본인만 읽는다. 기념관은 그 원칙의 **유일한 예외**이자,
-- 예외를 좁게 깎아 만든 문이다:
--   1. 사역자가 직접 켜야 열린다(published).
--   2. 「공개」로 표시한 것만 나간다. 교회 내부·가족·작가·비공개는 한 줄도
--      나가지 않는다 — 기본값이 「교회 내부」라, 아무것도 손대지 않으면
--      기념관은 비어 있다. 실수로 새는 쪽이 아니라 실수로 비는 쪽으로 기울였다.
--   3. 읽기는 함수 하나(mission_memorial)뿐이다. 표를 열지 않는다.
--   4. 보안 모드(security_mode)면 아예 열리지 않는다. 선교지 안전이 출판보다
--      앞선다(§21.8).
--
-- ── 사진은 왜 다른 통인가 ───────────────────────────────────────────
-- 0080 의 자료 통은 비공개다(서명 주소로만 열린다). 익명 방문자는 서명을 받을
-- 수 없으므로 기념관에 걸 사진은 **사역자가 고른 것만** 공개 통으로 옮긴다.
-- 「공개하겠다」고 한 번 더 누른 사진만 공개된다.

create table if not exists public.mission_memorials (
  subject_id uuid primary key references public.mission_subjects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- 주소에 실리는 이름. 소문자·숫자·붙임표만.
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{2,48}[a-z0-9]$'),
  title text not null default '',
  intro text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mission_memorial_photos (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.mission_subjects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- 공개 통 안의 경로. 0080 의 비공개 자료를 그대로 가리키지 않는다 —
  -- 가리키기만 하면 익명 방문자가 열 수 없다.
  path text not null,
  caption text not null default '',
  ord integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists mission_memorial_photos_subject_idx
  on public.mission_memorial_photos (subject_id, ord);

drop trigger if exists mission_memorials_touch on public.mission_memorials;
create trigger mission_memorials_touch before update on public.mission_memorials
  for each row execute function public.mission_touch();

alter table public.mission_memorials enable row level security;
alter table public.mission_memorial_photos enable row level security;

drop policy if exists "mission memorials own" on public.mission_memorials;
create policy "mission memorials own" on public.mission_memorials
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "mission memorial photos own" on public.mission_memorial_photos;
create policy "mission memorial photos own" on public.mission_memorial_photos
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

/**
 * 기념관 한 채를 통째로 돌려준다.
 *
 * 한 번에 다 주는 이유: 방문자는 로그인이 없어 표를 하나도 못 읽는다. 화면이
 * 조각조각 물어볼 길이 없으므로 함수 하나가 필요한 것만 모아 준다.
 *
 * **거르는 일이 이 함수의 본론이다** — published, 보안 모드 아님,
 * visibility = 'public' 세 가지를 여기서 지킨다. 화면에서 거르면 화면을 고칠
 * 때마다 새어 나갈 자리가 생긴다.
 */
create or replace function public.mission_memorial(p_slug text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'name', s.name,
    'title', nullif(m.title, ''),
    'intro', nullif(m.intro, ''),
    'role', s.role,
    'denomination', s.denomination,
    'church', s.church,
    'fields', s.fields,
    'summary', s.summary,
    'is_deceased', s.is_deceased,
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'year', t.year, 'month', t.month, 'place', t.place,
        'org', t.org, 'role', t.role, 'event', t.event, 'people', t.people
      ) order by t.year, t.month nulls first)
      from public.mission_timeline t
      where t.subject_id = s.id
    ), '[]'::jsonb),
    'stories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'question', a.question, 'body', a.body, 'year', a.year, 'place', a.place
      ) order by a.year nulls last)
      from public.mission_answers a
      where a.subject_id = s.id and a.visibility = 'public' and length(btrim(a.body)) >= 15
    ), '[]'::jsonb),
    'testimonies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'witness_name', w.witness_name, 'relation', w.relation,
        'question', w.question, 'body', w.body
      ) order by w.created_at)
      from public.mission_testimonies w
      where w.subject_id = s.id and w.visibility = 'public'
    ), '[]'::jsonb),
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object('path', p.path, 'caption', p.caption) order by p.ord, p.created_at)
      from public.mission_memorial_photos p
      where p.subject_id = s.id
    ), '[]'::jsonb)
  )
  from public.mission_memorials m
  join public.mission_subjects s on s.id = m.subject_id
  where m.slug = p_slug
    and m.published
    -- 보안 지역 사역은 기념관을 열지 않는다. 사람이 먼저다.
    and not s.security_mode;
$$;

revoke all on function public.mission_memorial(text) from public;
grant execute on function public.mission_memorial(text) to anon, authenticated;

-- ── 기념관 사진 통 (공개) ───────────────────────────────────────────
-- 이 통만 공개 읽기다. 여기 올라오는 것은 사역자가 「공개하겠다」고 한 번 더
-- 누른 사진뿐이다.
insert into storage.buckets (id, name, public)
values ('mission-memorial-photos', 'mission-memorial-photos', true)
on conflict (id) do nothing;

drop policy if exists "mission memorial photos read" on storage.objects;
create policy "mission memorial photos read" on storage.objects
  for select using (bucket_id = 'mission-memorial-photos');

drop policy if exists "mission memorial photos write own" on storage.objects;
create policy "mission memorial photos write own" on storage.objects
  for insert with check (
    bucket_id = 'mission-memorial-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "mission memorial photos delete own" on storage.objects;
create policy "mission memorial photos delete own" on storage.objects
  for delete using (
    bucket_id = 'mission-memorial-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
