-- 사명기록관 — 선교사·목회자의 소명과 사역을 한 권으로 남기는 기록대.
--
-- ── 왜 서버인가 ─────────────────────────────────────────────────────
-- 한 사람의 생애를 몇 달에 걸쳐 받아 적는 기록이다. 기기 안에만 두면 휴대폰을
-- 바꾸는 순간 통째로 사라진다. 중보기도 나무(0076)와 같은 판단이다.
--
-- ── 사생활·선교지 보안 (기획서 §14) ─────────────────────────────────
-- **누구와도 나누지 않는다.** 보안 지역의 국가·도시·현지 성도의 실명이 그대로
-- 적히는 표다. 공개하면 사람이 다친다. 그래서 정책은 owner_id = auth.uid()
-- 하나뿐이고, 관리자 예외도 공유 스위치도 두지 않는다. 「공개 범위」
-- (visibility) 는 표 밖으로 내보낼 때(원고·책) 무엇을 빼는지를 정하는 값이지,
-- 표를 남에게 여는 값이 아니다.
--
-- ── 사실성 (기획서 §13) ─────────────────────────────────────────────
-- 답변마다 fact_status 를 함께 담는다. 「본인 증언」과 「사진으로 확인」과
-- 「연도 확인 필요」를 구분해 두지 않으면, 원고를 쓸 때 무엇이 확인된 것인지
-- 아무도 모른다. 확인되지 않은 것을 확인된 것처럼 쓰지 않기 위한 칸이다.

create table if not exists public.mission_subjects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- 기록 대상. 본인일 수도, 유가족이 기록하는 고인일 수도 있다.
  name text not null,
  -- 질문 라이브러리를 고르는 값. 목회자와 선교사는 묻는 것이 다르다.
  role text not null default 'pastor'
    check (role in ('pastor', 'missionary', 'both', 'other')),
  denomination text not null default '',
  church text not null default '',
  fields text not null default '',
  born_year integer,
  called_year integer,
  summary text not null default '',
  -- 고인의 기록(추모 기념관형). 화면 문구가 「~하셨습니다」로 바뀐다.
  is_deceased boolean not null default false,
  -- 보안 지역 사역. 켜면 내보내는 원고에서 지명·인명을 익명으로 바꾼다.
  security_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mission_subjects_owner_idx
  on public.mission_subjects (owner_id, created_at);

create table if not exists public.mission_answers (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.mission_subjects (id) on delete cascade,
  -- subject_id 로도 주인을 알 수 있지만, 정책이 매번 사역자 표를 되짚지 않도록
  -- 주인을 여기에도 적어 둔다(0076 과 같은 이유).
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- 기획서 §6 의 여섯 축.
  axis text not null
    check (axis in ('calling', 'preparation', 'sending', 'fruit', 'suffering', 'legacy')),
  -- 질문 라이브러리의 열쇠. 질문 문구가 나중에 다듬어져도 답이 딴 데 붙지 않게
  -- 문구가 아니라 열쇠로 잇는다.
  question_key text not null,
  -- 물었던 그때의 문구. 라이브러리가 바뀌어도 「무엇을 듣고 한 답인지」가 남는다.
  question text not null default '',
  body text not null default '',
  -- 꼬리질문으로 받아 낸 것들(연표와 원고가 이 값을 쓴다).
  year integer,
  place text not null default '',
  people text not null default '',
  evidence text not null default '',
  fact_status text not null default 'self'
    check (fact_status in ('self', 'witness', 'document', 'need_year', 'conflict', 'review', 'private')),
  visibility text not null default 'church'
    check (visibility in ('public', 'church', 'family', 'writer', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 한 질문에 한 답. 이어서 말하면 그 답을 고친다.
  unique (subject_id, question_key)
);

create index if not exists mission_answers_subject_idx
  on public.mission_answers (subject_id, axis);

create table if not exists public.mission_timeline (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.mission_subjects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  year integer not null,
  -- 달을 모르는 일이 훨씬 많다. 비워 둘 수 있어야 한다.
  month integer check (month is null or (month between 1 and 12)),
  place text not null default '',
  org text not null default '',
  role text not null default '',
  event text not null default '',
  people text not null default '',
  evidence text not null default '',
  fact_status text not null default 'self'
    check (fact_status in ('self', 'witness', 'document', 'need_year', 'conflict', 'review', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mission_timeline_subject_idx
  on public.mission_timeline (subject_id, year, month);

create table if not exists public.mission_chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.mission_subjects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  ord integer not null,
  title text not null,
  -- 자동으로 엮은 초고. 사람이 고쳐 쓴다.
  body text not null default '',
  -- 이 장이 어느 답변에서 나왔는지. 원고 옆에 근거를 띄우기 위한 것이다(§16).
  source_keys text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, ord)
);

create or replace function public.mission_touch()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists mission_subjects_touch on public.mission_subjects;
create trigger mission_subjects_touch before update on public.mission_subjects
  for each row execute function public.mission_touch();

drop trigger if exists mission_answers_touch on public.mission_answers;
create trigger mission_answers_touch before update on public.mission_answers
  for each row execute function public.mission_touch();

drop trigger if exists mission_timeline_touch on public.mission_timeline;
create trigger mission_timeline_touch before update on public.mission_timeline
  for each row execute function public.mission_touch();

drop trigger if exists mission_chapters_touch on public.mission_chapters;
create trigger mission_chapters_touch before update on public.mission_chapters
  for each row execute function public.mission_touch();

alter table public.mission_subjects enable row level security;
alter table public.mission_answers enable row level security;
alter table public.mission_timeline enable row level security;
alter table public.mission_chapters enable row level security;

drop policy if exists "mission subjects own" on public.mission_subjects;
create policy "mission subjects own" on public.mission_subjects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "mission answers own" on public.mission_answers;
create policy "mission answers own" on public.mission_answers
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "mission timeline own" on public.mission_timeline;
create policy "mission timeline own" on public.mission_timeline
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "mission chapters own" on public.mission_chapters;
create policy "mission chapters own" on public.mission_chapters
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
