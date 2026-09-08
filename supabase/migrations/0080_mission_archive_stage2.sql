-- 사명기록관 2단계 — 사역 자료실과 공동 증언 (기획서 §9·§10).
--
-- ── 자료는 왜 비공개 통인가 ─────────────────────────────────────────
-- 이 앱의 다른 통(열매 사진·말씀카드 배경)은 공개 읽기다. 주소만 알면 누구나
-- 본다. 여기 올라오는 것은 선교 편지, 파송장, 현지 성도의 얼굴이 담긴 사진이다
-- — 주소가 한 번 새면 되돌릴 길이 없다. 그래서 이 통만 **비공개**로 만들고,
-- 화면은 볼 때마다 짧게 사는 서명 주소를 받아 쓴다.
--
-- ── 증언자는 어떻게 답하는가 ────────────────────────────────────────
-- 증언해 줄 가족·동역자에게 계정을 만들라고 할 수는 없다(§10 은 링크를 보내
-- 답하게 한다). 그렇다고 표를 열어 두면 남의 생애 기록이 통째로 열린다.
-- 그래서 **표는 잠근 채 두고, 함수 두 개만 연다**:
--   mission_witness_prompt(token)  — 물어볼 것만 돌려준다(사역자 성함과 질문).
--   mission_submit_testimony(...)  — 답을 넣기만 한다. 읽지 못한다.
-- 토큰이 곧 열쇠이므로 사역자가 언제든 끌 수 있고(active), 기한도 둔다.

create table if not exists public.mission_assets (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.mission_subjects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'photo'
    check (kind in ('sermon', 'photo', 'letter', 'bulletin', 'document', 'audio', 'video', 'other')),
  title text not null default '',
  -- 통 안의 **경로**. 절대 주소를 담으면 프로젝트를 옮길 때 통째로 죽는다(0076).
  path text,
  year integer,
  month integer check (month is null or (month between 1 and 12)),
  place text not null default '',
  people text not null default '',
  note text not null default '',
  -- 설교 원고나 편지 본문을 그대로 담는 칸. 여기 담긴 글에서 반복되는 주제를
  -- 찾아 「설교 유산」을 만든다(§9).
  body text not null default '',
  fact_status text not null default 'document'
    check (fact_status in ('self', 'witness', 'document', 'need_year', 'conflict', 'review', 'private')),
  visibility text not null default 'church'
    check (visibility in ('public', 'church', 'family', 'writer', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mission_assets_subject_idx
  on public.mission_assets (subject_id, kind, year);

-- 증언 요청 하나 = 링크 하나. 사람마다 물을 것이 다르다(§10).
create table if not exists public.mission_witness_invites (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.mission_subjects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- 링크에 실리는 열쇠. 짐작할 수 없어야 한다.
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  invitee_name text not null default '',
  relation text not null default '',
  questions text[] not null default '{}',
  note text not null default '',
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mission_witness_invites_subject_idx
  on public.mission_witness_invites (subject_id, created_at);

create table if not exists public.mission_testimonies (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.mission_subjects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_id uuid references public.mission_witness_invites (id) on delete set null,
  witness_name text not null default '',
  relation text not null default '',
  question text not null default '',
  body text not null default '',
  contact text not null default '',
  -- 링크로 들어온 것인지, 사역자가 대신 적어 넣은 것인지.
  source text not null default 'link' check (source in ('link', 'manual')),
  -- 사역자가 읽고 확인했는지. **서로 다른 기억을 임의로 합치지 않는다**(§10) —
  -- 여기서 하는 일은 「읽었다」 표시뿐이고, 증언은 증언대로 남는다.
  reviewed boolean not null default false,
  visibility text not null default 'church'
    check (visibility in ('public', 'church', 'family', 'writer', 'private')),
  created_at timestamptz not null default now()
);

create index if not exists mission_testimonies_subject_idx
  on public.mission_testimonies (subject_id, created_at);

drop trigger if exists mission_assets_touch on public.mission_assets;
create trigger mission_assets_touch before update on public.mission_assets
  for each row execute function public.mission_touch();

alter table public.mission_assets enable row level security;
alter table public.mission_witness_invites enable row level security;
alter table public.mission_testimonies enable row level security;

drop policy if exists "mission assets own" on public.mission_assets;
create policy "mission assets own" on public.mission_assets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "mission invites own" on public.mission_witness_invites;
create policy "mission invites own" on public.mission_witness_invites
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 증언도 사역자만 읽는다. 증언자는 자기가 낸 답조차 다시 읽지 못한다 —
-- 링크가 남의 손에 넘어갔을 때 그 사람이 읽을 것이 있으면 안 된다.
drop policy if exists "mission testimonies own" on public.mission_testimonies;
create policy "mission testimonies own" on public.mission_testimonies
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ── 증언자에게 여는 문 둘 ───────────────────────────────────────────

create or replace function public.mission_witness_prompt(p_token text)
returns table (
  subject_name text,
  invitee_name text,
  relation text,
  questions text[],
  note text
)
language sql
security definer
set search_path = public
as $$
  select s.name, i.invitee_name, i.relation, i.questions, i.note
  from public.mission_witness_invites i
  join public.mission_subjects s on s.id = i.subject_id
  where i.token = p_token
    and i.active
    and (i.expires_at is null or i.expires_at > now());
$$;

/**
 * 증언 받기.
 *
 * 답을 통째로 jsonb 로 받는다 — [{"question": "...", "body": "..."}, ...].
 * 질문마다 따로 부르면 중간에 끊길 때 반쪽만 남고, 증언자는 다시 열어 볼 길이
 * 없다(읽기 권한이 없다). 한 번에 넣고 끝낸다.
 */
create or replace function public.mission_submit_testimony(
  p_token text,
  p_witness_name text,
  p_relation text,
  p_contact text,
  p_answers jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.mission_witness_invites;
  v_count integer := 0;
  v_item jsonb;
begin
  select * into v_invite
  from public.mission_witness_invites
  where token = p_token and active and (expires_at is null or expires_at > now());

  if not found then
    raise exception '이 링크는 더 이상 쓸 수 없습니다.';
  end if;

  if jsonb_typeof(p_answers) <> 'array' then
    raise exception '답변 형식이 올바르지 않습니다.';
  end if;

  -- 한 번에 스무 개까지. 링크가 새어 나갔을 때 표가 통째로 부풀지 않게 한다.
  if jsonb_array_length(p_answers) > 20 then
    raise exception '답변이 너무 많습니다.';
  end if;

  for v_item in select * from jsonb_array_elements(p_answers) loop
    if coalesce(trim(v_item ->> 'body'), '') <> '' then
      insert into public.mission_testimonies
        (subject_id, owner_id, invite_id, witness_name, relation, question, body, contact, source)
      values (
        v_invite.subject_id,
        v_invite.owner_id,
        v_invite.id,
        coalesce(nullif(trim(p_witness_name), ''), v_invite.invitee_name),
        coalesce(nullif(trim(p_relation), ''), v_invite.relation),
        left(coalesce(v_item ->> 'question', ''), 400),
        left(v_item ->> 'body', 8000),
        left(coalesce(p_contact, ''), 200),
        'link'
      );
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end $$;

revoke all on function public.mission_witness_prompt(text) from public;
revoke all on function public.mission_submit_testimony(text, text, text, text, jsonb) from public;
grant execute on function public.mission_witness_prompt(text) to anon, authenticated;
grant execute on function public.mission_submit_testimony(text, text, text, text, jsonb) to anon, authenticated;

-- ── 자료 통 (비공개) ────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('mission-assets', 'mission-assets', false)
on conflict (id) do nothing;

-- 공개 읽기 정책을 두지 않는다. 주인만 읽고, 화면은 서명 주소로 받아 쓴다.
drop policy if exists "mission assets read own" on storage.objects;
create policy "mission assets read own" on storage.objects
  for select using (
    bucket_id = 'mission-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "mission assets write own" on storage.objects;
create policy "mission assets write own" on storage.objects
  for insert with check (
    bucket_id = 'mission-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "mission assets delete own" on storage.objects;
create policy "mission assets delete own" on storage.objects
  for delete using (
    bucket_id = 'mission-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
