-- 0088 · 사역 나눔 — 사역을 하고 나서 은혜와 아쉬움을 남긴다.
--
-- cell_ministries 의 result 는 사역을 만든 사람이 한 줄 적는 칸이다. 같이 섬긴 사람들의
-- 피드백("뭐가 좋았고 뭐가 아쉬웠나")은 여러 사람이 각자 남기므로 별도 표로 둔다.
--
-- 읽기·쓰기는 그 사역을 볼 수 있는 사람(= cell_ministries 의 RLS 를 통과하는 사람)이다.
-- cell_ministry_roles 와 같은 방식이다 — 목장 판정을 여기서 다시 쓰지 않는다.

create table if not exists public.cell_ministry_notes (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references public.cell_ministries(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  -- grace = 은혜·감사, improve = 아쉬움·제안
  kind text not null default 'grace' check (kind in ('grace', 'improve')),
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists cell_ministry_notes_idx
  on public.cell_ministry_notes (ministry_id, created_at)
  where deleted_at is null;

alter table public.cell_ministry_notes enable row level security;

drop policy if exists cell_ministry_notes_select on public.cell_ministry_notes;
create policy cell_ministry_notes_select on public.cell_ministry_notes
  for select using (
    deleted_at is null
    and exists (select 1 from public.cell_ministries m where m.id = ministry_id)
  );

drop policy if exists cell_ministry_notes_insert on public.cell_ministry_notes;
create policy cell_ministry_notes_insert on public.cell_ministry_notes
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from public.cell_ministries m where m.id = ministry_id)
  );

-- 지우기(deleted_at)는 쓴 사람과 관리자만.
drop policy if exists cell_ministry_notes_update on public.cell_ministry_notes;
create policy cell_ministry_notes_update on public.cell_ministry_notes
  for update using (author_id = auth.uid() or can_see_all_cells())
  with check (author_id = auth.uid() or can_see_all_cells());
