-- 영적기록ON — 첫 표들 (기획서 §13 「먼저 만들 간단한 버전」).
--
-- ── 이 표들이 지키는 두 가지 ──────────────────────────────────────────
-- 1. **모든 기록은 기본 비공개다**(§12). 정책은 `user_id = auth.uid()` 하나뿐이고
--    관리자 예외를 두지 않았다. 꿈·환상·예언에는 배우자와 자녀의 실명, 교회의
--    사정, 어떤 사람을 향해 받았다고 인식한 메시지가 그대로 적힌다. 이 표에
--    「관리자는 다 볼 수 있다」는 줄을 하나 넣는 순간 그 전제가 무너진다.
-- 2. **기존 내용은 덮어쓰지 않는다**(§7). 해석과 관련 사건은 기록을 고치는 것이
--    아니라 `spirit_notes` 에 날짜순으로 쌓인다. 3년 뒤에 이해한 것이 그때
--    적어 둔 것을 지워 버리면, 무엇이 먼저 있었는지 알 수 없게 된다.

-- ── 녹음 원본 ────────────────────────────────────────────────────────
-- 받아쓴 글이 아무리 정확해도 **원본 음성은 지우지 않는다.** 글이 틀리면 글을
-- 고치지, 목소리를 버리지 않는다.
create table if not exists public.spirit_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audio_path text,                  -- spirit-audio 통 안의 경로 (비공개)
  seconds integer,
  transcript text not null default '',   -- 받아쓴 원문. 비어 있을 수 있다(받아쓰기 미지원 기기).
  recorded_on date not null default (now() at time zone 'Asia/Seoul')::date,
  processed boolean not null default false,  -- 정리해서 기록으로 옮겼는가
  created_at timestamptz not null default now()
);

-- ── 기록 ─────────────────────────────────────────────────────────────
create table if not exists public.spirit_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recording_id uuid references public.spirit_recordings(id) on delete set null,
  record_date date not null default (now() at time zone 'Asia/Seoul')::date,
  kind text not null default 'etc'
    check (kind in ('dream','vision','prophecy','impression','word','prayer','etc')),
  title text not null default '',
  -- 받은 내용 (§7). raw 는 말한 그대로, clean 은 군더더기만 덜어낸 사본이다.
  raw_text text not null default '',
  clean_text text not null default '',
  summary text not null default '',
  situation text not null default '',      -- 당시 상황
  tags text[] not null default '{}',
  people text[] not null default '{}',
  places text[] not null default '{}',
  verses text[] not null default '{}',
  emotions text[] not null default '{}',
  symbols text[] not null default '{}',
  status text not null default 'recorded'
    check (status in ('recorded','discerning','partial','related','confirmed','held')),
  -- 기본값이 'private' 인 것이 이 표의 핵심이다. 손대지 않으면 아무 데도 안 나간다.
  visibility text not null default 'private'
    check (visibility in ('private','spouse','invited','blog')),
  order_index integer not null default 0,  -- 같은 날 여러 기록의 차례 (§4)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spirit_records_user_date on public.spirit_records (user_id, record_date desc, order_index);
create index if not exists spirit_records_kind on public.spirit_records (user_id, kind);

-- ── 해석·관련 사건 (§7 — 쌓이기만 한다) ──────────────────────────────
create table if not exists public.spirit_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id uuid not null references public.spirit_records(id) on delete cascade,
  note_kind text not null
    check (note_kind in ('feeling','interpretation','later','event','confirm')),
  body text not null,
  happened_on date,                  -- 관련 사건이 실제로 일어난 날
  created_at timestamptz not null default now()
);

create index if not exists spirit_notes_record on public.spirit_notes (record_id, created_at);

-- ── 발행 기록 (§10 7번 「게시 주소와 상태를 원래 기록에 연결한다」) ───
create table if not exists public.spirit_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id uuid not null references public.spirit_records(id) on delete cascade,
  target text not null default 'wordpress',
  remote_id text,
  remote_url text,
  remote_status text not null default 'draft',
  title text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists spirit_publications_record on public.spirit_publications (record_id, created_at desc);

-- ── 정책: 전부 본인 것만 ─────────────────────────────────────────────
alter table public.spirit_recordings enable row level security;
alter table public.spirit_records enable row level security;
alter table public.spirit_notes enable row level security;
alter table public.spirit_publications enable row level security;

do $$
declare t text;
begin
  foreach t in array array['spirit_recordings','spirit_records','spirit_notes','spirit_publications'] loop
    execute format('drop policy if exists %I_own on public.%I', t, t);
    execute format(
      'create policy %I_own on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t, t);
  end loop;
end $$;

-- ── 음성 통 ──────────────────────────────────────────────────────────
-- **비공개다.** 주소가 한 번 새면 되돌릴 길이 없다. 들을 때마다 짧게 사는
-- 서명 주소를 받는다.
insert into storage.buckets (id, name, public)
values ('spirit-audio', 'spirit-audio', false)
on conflict (id) do nothing;

drop policy if exists spirit_audio_own on storage.objects;
create policy spirit_audio_own on storage.objects for all to authenticated
  using (bucket_id = 'spirit-audio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'spirit-audio' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── 고친 때를 표가 적는다 ────────────────────────────────────────────
-- 화면이 적으면 기기 시계가 틀어진 만큼 기록이 틀어진다.
create or replace function public.spirit_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists spirit_records_touch on public.spirit_records;
create trigger spirit_records_touch before update on public.spirit_records
  for each row execute function public.spirit_touch_updated_at();
