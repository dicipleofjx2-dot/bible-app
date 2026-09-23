-- 목장마을ON — 목장이 「작은 교회」가 되고, 목장들이 모여 「마을」이 된다.
--
-- 기획서: Downloads/목장마을ON_앱기획서.md
--
-- ── 새로 만들지 않은 것들 ───────────────────────────────────────────
-- 0065 가 세운 원칙을 그대로 잇는다. 교적이 이미 아는 것은 여기 다시 담지 않는다.
--
--   목장 목록        org_units (unit_type = 'cell')
--   **마을**         org_units (unit_type = 'district') + cell.parent_id
--   누가 어느 목장    members.cell_id
--   앱 계정 ↔ 교인    members.user_id
--   목자 자격        org_units.leader_member_id · church_memberships.role
--   모임 시간·장소(정기)  gather_recurrences (category='cell')
--   심방             cell_visit_requests (0065) · care_records
--   기도제목(교회 전체)  prayer_requests (샬롬기도단)
--
-- **마을을 새 표로 만들지 않은 까닭.** 기획서는 "마을 소속은 교회 조직에 따라
-- 설정한다"고 했다. 교적에 이미 교구(district)가 있고 목장이 parent_id 로 그
-- 아래 달린다. 마을 표를 따로 두면 교적에서 목장을 옮겨도 마을은 안 따라와서,
-- 0068 이 겪은 「24건 중 7건이 어긋난」 일이 그대로 되풀이된다.
--
-- 아직 교구를 안 나눈 교회(parent_id 가 비어 있는 목장)도 있다. 그런 교회는
-- **교회 전체가 한 마을**이다 — can_see_village(null) 가 그 경우를 받는다.
--
-- ── 여기서 새로 만드는 것 ───────────────────────────────────────────
--   예배당   cell_gatherings · cell_gathering_attendance
--   소그룹실 cell_shares · cell_share_comments
--   양육실   cell_nurtures
--   돌봄실   cell_care_notes
--   사역실   cell_ministries · cell_ministry_roles
--   선교실   cell_missions
--   마을     village_posts · village_events · village_works · village_prayers
--            village_signups · village_cheers
--
-- ── 공개 범위를 다루는 방식 ─────────────────────────────────────────
-- 기획서 §5 는 글마다 `나만/지정 담당자/소그룹/목장/마을/교회` 를 고르게 한다.
-- 그러나 **RLS 는 칸(열)을 못 지킨다.** 한 표에 민감한 것과 공개할 것을 같이
-- 담고 visibility 칸으로 가르면, 그 칸을 잘못 쓴 순간 병·가정사가 통째로 열린다.
-- 그래서 민감도가 다른 것은 **표를 갈랐다**:
--
--   목장 안에서 서로 보는 것  cell_shares, cell_gatherings, cell_ministries …
--   담당자만 보는 것          cell_nurtures(note), cell_care_notes
--   마을까지 나가는 것        village_* (승인을 거쳐 **복사**되어 올라간다)
--
-- 목장 글이 마을로 가는 길은 한 방향이다: 목장에서 제안 → 마을장이 승인 →
-- village_posts 에 선다. 목장 표의 행을 마을에서 직접 읽지 않는다.

-- ════════════════════════════════════════════════════════════════════
-- 0. 마을 판정 함수
-- ════════════════════════════════════════════════════════════════════
--
-- 0065 와 같은 이유로 security definer + search_path 고정이다. 정책 안에서
-- org_units·members 를 보는데 그 표에도 RLS 가 걸려 있어 재귀가 생긴다.

/** 내 목장이 속한 마을(교구). 교구를 안 나눈 교회면 null. */
create or replace function public.my_village_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.parent_id
    from org_units u
   where u.id = public.my_cell_id();
$$;

/**
 * 이 마을을 볼 수 있는가.
 *
 * target 이 null 인 경우를 받는 것이 중요하다. 교구를 안 나눈 교회에서는 모든
 * 목장의 parent_id 가 비어 있고, 그 교회의 마을 글은 village_id 가 null 로 선다.
 * 그때는 **목장에 속한 사람이면** 그 마을 사람이다.
 */
create or replace function public.can_see_village(target_village_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_see_all_cells()
      or (target_village_id is null and public.my_cell_id() is not null)
      or (target_village_id is not null and public.my_village_id() = target_village_id);
$$;

/**
 * 마을장인가.
 *
 * 마을(교구)의 leader_member_id 가 나를 가리키면 마을장이다. 교역자·관리자는
 * 언제나 통과한다 — 마을장을 아직 안 정한 교회가 대부분이라, 그 칸이 빌 때
 * 승인이 통째로 멈추면 광장이 열리지 않는다.
 */
create or replace function public.is_village_leader_of(target_village_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_see_all_cells()
      or (
        target_village_id is not null
        and exists (
          select 1
            from org_units u
            join members m on m.id = u.leader_member_id
           where u.id = target_village_id
             and m.user_id = auth.uid()
             and m.deleted_at is null
        )
      );
$$;

/** 내 교인 기록(members.id). 돌봄·양육에서 「누구에 대한 기록인가」를 잇는다. */
create or replace function public.my_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
    from members m
   where m.user_id = auth.uid()
     and m.deleted_at is null
   limit 1;
$$;

revoke all on function public.my_village_id() from public, anon;
revoke all on function public.can_see_village(uuid) from public, anon;
revoke all on function public.is_village_leader_of(uuid) from public, anon;
revoke all on function public.my_member_id() from public, anon;
grant execute on function public.my_village_id() to authenticated;
grant execute on function public.can_see_village(uuid) to authenticated;
grant execute on function public.is_village_leader_of(uuid) to authenticated;
grant execute on function public.my_member_id() to authenticated;

-- updated_at 자동 갱신은 0065 의 것을 그대로 쓴다(public.cell_set_updated_at).

-- ════════════════════════════════════════════════════════════════════
-- 1. 예배당 — cell_gatherings
-- ════════════════════════════════════════════════════════════════════
--
-- **정기 모임 시간은 여기 적지 않는다**(0065 가 정한 대로 gather_recurrences).
-- 이 표는 「이번 주 그 모임 한 번」이다 — 날짜, 그날의 본문, 그날의 순서.
--
-- steps 를 jsonb 로 둔 이유: 순서는 교회마다 다르고 모임마다 늘었다 줄었다
-- 한다(찬양 둘, 광고 없음 …). 표를 하나 더 만들면 한 모임 만드는 데 여러 번
-- 써야 하고, 화면은 결국 통째로 읽어 통째로 쓴다. 검색할 일도 없다.
--   [{ "kind": "praise"|"word"|"question"|"prayer"|"notice", "title": "...", "body": "..." }]
--
-- status 를 둔 이유는 진행 화면 때문이다. running 인 모임이 목장 현관 맨 위에
-- 「지금 모이는 중」으로 뜬다.

create table if not exists public.cell_gatherings (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references org_units(id) on delete cascade,
  title text not null,
  meet_on date not null default current_date,
  start_time text,
  -- 가정·교회·온라인. 온라인이면 place 에 주소를 적는다.
  place_kind text not null default 'home' check (place_kind in ('home', 'church', 'online', 'other')),
  place text,
  -- 인도자(교인 기록). 비워 두면 목자가 인도하는 것으로 본다.
  leader_member_id uuid references members(id) on delete set null,
  -- 그날의 본문·교재. 설교나 주보 목장교재에서 가져온 자리를 source 에 적는다.
  scripture text,
  material_source text,
  steps jsonb not null default '[]'::jsonb,
  status text not null default 'planned' check (status in ('planned', 'running', 'closed')),
  -- 모임이 끝난 뒤 목자가 적는 것. 개인 상담 원문을 여기 옮겨 적지 않는다.
  summary text,
  next_care text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists cell_gatherings_cell_idx
  on public.cell_gatherings (cell_id, meet_on desc)
  where deleted_at is null;

alter table public.cell_gatherings enable row level security;

drop policy if exists cell_gatherings_select on public.cell_gatherings;
create policy cell_gatherings_select on public.cell_gatherings
  for select using (deleted_at is null and can_see_cell(cell_id));

drop policy if exists cell_gatherings_insert on public.cell_gatherings;
create policy cell_gatherings_insert on public.cell_gatherings
  for insert with check (
    created_by = auth.uid()
    and (is_cell_leader_of(cell_id) or can_see_all_cells())
  );

drop policy if exists cell_gatherings_update on public.cell_gatherings;
create policy cell_gatherings_update on public.cell_gatherings
  for update using (is_cell_leader_of(cell_id) or can_see_all_cells())
  with check (is_cell_leader_of(cell_id) or can_see_all_cells());

drop trigger if exists cell_gatherings_touch on public.cell_gatherings;
create trigger cell_gatherings_touch before update on public.cell_gatherings
  for each row execute function public.cell_set_updated_at();

-- ── 참석 ────────────────────────────────────────────────────────────
--
-- 목장원이 스스로 답하고(going/maybe/absent), 모임이 끝나면 목자가 실제 참석을
-- 표시한다(attended). 두 가지를 한 칸에 담지 않는다 — 「온다고 했는데 못 온 것」과
-- 「안 온 것」은 목자에게 다른 일이다.

create table if not exists public.cell_gathering_attendance (
  gathering_id uuid not null references cell_gatherings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reply text check (reply in ('going', 'maybe', 'absent')),
  attended boolean,
  note text,
  updated_at timestamptz not null default now(),
  primary key (gathering_id, user_id)
);

alter table public.cell_gathering_attendance enable row level security;

drop policy if exists cell_attendance_select on public.cell_gathering_attendance;
create policy cell_attendance_select on public.cell_gathering_attendance
  for select using (
    exists (
      select 1 from cell_gatherings g
       where g.id = gathering_id and can_see_cell(g.cell_id)
    )
  );

-- 내 답은 내가 쓴다. 남의 줄을 만들 수 있는 것은 목자뿐이다(출석 체크).
drop policy if exists cell_attendance_insert on public.cell_gathering_attendance;
create policy cell_attendance_insert on public.cell_gathering_attendance
  for insert with check (
    exists (
      select 1 from cell_gatherings g
       where g.id = gathering_id
         and (
           (user_id = auth.uid() and can_see_cell(g.cell_id))
           or is_cell_leader_of(g.cell_id)
           or can_see_all_cells()
         )
    )
  );

drop policy if exists cell_attendance_update on public.cell_gathering_attendance;
create policy cell_attendance_update on public.cell_gathering_attendance
  for update using (
    exists (
      select 1 from cell_gatherings g
       where g.id = gathering_id
         and (
           (user_id = auth.uid() and can_see_cell(g.cell_id))
           or is_cell_leader_of(g.cell_id)
           or can_see_all_cells()
         )
    )
  );

-- ════════════════════════════════════════════════════════════════════
-- 2. 소그룹실 — cell_shares · cell_share_comments
-- ════════════════════════════════════════════════════════════════════
--
-- 0068 의 cell_messages 는 **소통창**이다(짧은 말이 흐른다). 이 표는 **나눔**이다 —
-- 질문 하나에 대한 답이 모이고, 나중에 다시 읽힌다. 둘을 한 표에 담으면 잡담이
-- 나눔을 밀어내고, 나눔을 찾으려면 대화를 거슬러 올라가야 한다.
--
-- audience 는 두 값뿐이다. 「목장 전체」와 「목자에게만」. 기획서의 여섯 단계를
-- 다 칸으로 만들지 않은 이유는 맨 위 주석에 적었다 — 더 조용히 둬야 할 것은
-- 애초에 다른 표(cell_care_notes, cell_nurtures)로 간다.

create table if not exists public.cell_shares (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references org_units(id) on delete cascade,
  -- 어느 모임의 나눔인가. 모임과 상관없이 올릴 수도 있어 비워 둘 수 있다.
  gathering_id uuid references cell_gatherings(id) on delete set null,
  author_id uuid not null references auth.users(id) on delete cascade,
  -- 어느 질문에 대한 답인가(steps 의 제목을 그대로 적는다). 없으면 자유 나눔.
  question text,
  body text not null,
  audience text not null default 'cell' check (audience in ('cell', 'leader')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists cell_shares_cell_idx
  on public.cell_shares (cell_id, created_at desc)
  where deleted_at is null;

alter table public.cell_shares enable row level security;

drop policy if exists cell_shares_select on public.cell_shares;
create policy cell_shares_select on public.cell_shares
  for select using (
    deleted_at is null
    and can_see_cell(cell_id)
    and (
      audience = 'cell'
      or author_id = auth.uid()
      or is_cell_leader_of(cell_id)
      or can_see_all_cells()
    )
  );

drop policy if exists cell_shares_insert on public.cell_shares;
create policy cell_shares_insert on public.cell_shares
  for insert with check (author_id = auth.uid() and can_see_cell(cell_id));

drop policy if exists cell_shares_update on public.cell_shares;
create policy cell_shares_update on public.cell_shares
  for update using (author_id = auth.uid() or can_see_all_cells())
  with check (author_id = auth.uid() or can_see_all_cells());

drop trigger if exists cell_shares_touch on public.cell_shares;
create trigger cell_shares_touch before update on public.cell_shares
  for each row execute function public.cell_set_updated_at();

create table if not exists public.cell_share_comments (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references cell_shares(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists cell_share_comments_idx
  on public.cell_share_comments (share_id, created_at)
  where deleted_at is null;

alter table public.cell_share_comments enable row level security;

-- 댓글은 그 나눔을 읽을 수 있는 사람만 본다. 나눔의 정책을 그대로 탄다.
drop policy if exists cell_share_comments_select on public.cell_share_comments;
create policy cell_share_comments_select on public.cell_share_comments
  for select using (
    deleted_at is null
    and exists (select 1 from cell_shares s where s.id = share_id)
  );

drop policy if exists cell_share_comments_insert on public.cell_share_comments;
create policy cell_share_comments_insert on public.cell_share_comments
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from cell_shares s where s.id = share_id)
  );

drop policy if exists cell_share_comments_update on public.cell_share_comments;
create policy cell_share_comments_update on public.cell_share_comments
  for update using (author_id = auth.uid() or can_see_all_cells())
  with check (author_id = auth.uid() or can_see_all_cells());

-- ════════════════════════════════════════════════════════════════════
-- 3. 양육실 — cell_nurtures
-- ════════════════════════════════════════════════════════════════════
--
-- 기획서 §2: "목장 전체에는 동의한 축하 소식 또는 개인을 특정하지 않는 집계만
-- 보인다." 그래서 이 표는 **본인과 양육자, 그리고 교역자**만 읽는다. 목자라고
-- 다 열지 않는다 — 양육자와 목자가 늘 같은 사람은 아니고, 상담 내용은 맡은
-- 사람의 것이다.
--
-- 단계 이름을 문자열로 둔 이유: 기획서가 "단계 명칭은 교회에서 설정할 수 있다"고
-- 했다. check 로 박으면 교회마다 못 바꾼다. 대신 진행/마침만 stage_kind 로 센다.

create table if not exists public.cell_nurtures (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references org_units(id) on delete cascade,
  -- 배우는 사람
  learner_id uuid not null references auth.users(id) on delete cascade,
  -- 맡은 사람. 비어 있으면 아직 배정 전이다.
  mentor_id uuid references auth.users(id) on delete set null,
  course text not null,
  stage_label text not null default '등록',
  stage_kind text not null default 'enrolled'
    check (stage_kind in ('enrolled', 'met', 'ongoing', 'paused', 'done')),
  next_meet_on date,
  next_meet_note text,
  -- 제한 메모. 본인·양육자·교역자만 본다.
  note text,
  -- 목장에 알려도 좋다고 **본인이** 고른 축하 소식. 이것만 밖으로 나간다.
  celebrate text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists cell_nurtures_cell_idx
  on public.cell_nurtures (cell_id, stage_kind, next_meet_on)
  where deleted_at is null;
create index if not exists cell_nurtures_learner_idx
  on public.cell_nurtures (learner_id)
  where deleted_at is null;

alter table public.cell_nurtures enable row level security;

drop policy if exists cell_nurtures_select on public.cell_nurtures;
create policy cell_nurtures_select on public.cell_nurtures
  for select using (
    deleted_at is null
    and (learner_id = auth.uid() or mentor_id = auth.uid() or can_see_all_cells())
  );

-- 과정을 여는 것은 목자·양육자·교역자다. 본인이 스스로 등록할 수도 있게
-- learner_id = auth.uid() 를 함께 받는다(신청으로 쓴다).
drop policy if exists cell_nurtures_insert on public.cell_nurtures;
create policy cell_nurtures_insert on public.cell_nurtures
  for insert with check (
    can_see_cell(cell_id)
    and (learner_id = auth.uid() or mentor_id = auth.uid() or is_cell_leader_of(cell_id) or can_see_all_cells())
  );

drop policy if exists cell_nurtures_update on public.cell_nurtures;
create policy cell_nurtures_update on public.cell_nurtures
  for update using (mentor_id = auth.uid() or learner_id = auth.uid() or can_see_all_cells())
  with check (mentor_id = auth.uid() or learner_id = auth.uid() or can_see_all_cells());

drop trigger if exists cell_nurtures_touch on public.cell_nurtures;
create trigger cell_nurtures_touch before update on public.cell_nurtures
  for each row execute function public.cell_set_updated_at();

/**
 * 목장 전체에 보이는 양육 집계 — 개인을 특정하지 않는다.
 *
 * 화면이 cell_nurtures 를 세면 안 된다. 셀 수 있으면 읽을 수 있고, 읽을 수
 * 있으면 언젠가 이름이 새어 나온다. 그래서 숫자만 돌려주는 함수를 따로 둔다.
 */
create or replace function public.cell_nurture_summary(target_cell_id uuid)
returns table (stage_kind text, cnt integer)
language sql
stable
security definer
set search_path = public
as $$
  select n.stage_kind, count(*)::integer
    from cell_nurtures n
   where n.cell_id = target_cell_id
     and n.deleted_at is null
     and public.can_see_cell(target_cell_id)
   group by n.stage_kind;
$$;

revoke all on function public.cell_nurture_summary(uuid) from public, anon;
grant execute on function public.cell_nurture_summary(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 4. 돌봄실 — cell_care_notes
-- ════════════════════════════════════════════════════════════════════
--
-- 심방 **신청**은 0065 의 cell_visit_requests 가 맡는다. 이 표는 목자가 남기는
-- 「누구에게 연락했고 무엇이 필요한가」다. 목원에게는 보이지 않는다.
--
-- 대상은 교인 기록(members)으로 가리킨다. 앱 계정이 없는 성도도 돌봄의 대상이기
-- 때문이다 — user_id 로 가리키면 앱을 안 쓰는 사람은 적을 수가 없다.

create table if not exists public.cell_care_notes (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references org_units(id) on delete cascade,
  about_member_id uuid references members(id) on delete set null,
  -- 교적에 없는 사람(새가족 등)을 적을 때 쓴다.
  about_name text,
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'call' check (kind in ('call', 'visit', 'need', 'thanks')),
  body text not null,
  follow_up_on date,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists cell_care_notes_cell_idx
  on public.cell_care_notes (cell_id, done, follow_up_on)
  where deleted_at is null;

alter table public.cell_care_notes enable row level security;

-- 목자·부목자·교역자만. 「그 목장 사람이면」이 아니다.
drop policy if exists cell_care_notes_select on public.cell_care_notes;
create policy cell_care_notes_select on public.cell_care_notes
  for select using (
    deleted_at is null
    and (is_cell_leader_of(cell_id) or can_see_all_cells())
  );

drop policy if exists cell_care_notes_insert on public.cell_care_notes;
create policy cell_care_notes_insert on public.cell_care_notes
  for insert with check (
    author_id = auth.uid()
    and (is_cell_leader_of(cell_id) or can_see_all_cells())
  );

drop policy if exists cell_care_notes_update on public.cell_care_notes;
create policy cell_care_notes_update on public.cell_care_notes
  for update using (is_cell_leader_of(cell_id) or can_see_all_cells())
  with check (is_cell_leader_of(cell_id) or can_see_all_cells());

drop trigger if exists cell_care_notes_touch on public.cell_care_notes;
create trigger cell_care_notes_touch before update on public.cell_care_notes
  for each row execute function public.cell_set_updated_at();

-- ════════════════════════════════════════════════════════════════════
-- 5. 사역실 — cell_ministries · cell_ministry_roles
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.cell_ministries (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references org_units(id) on delete cascade,
  title text not null,
  purpose text,
  serve_on date,
  place text,
  supplies text,
  status text not null default 'planned' check (status in ('planned', 'doing', 'done', 'cancelled')),
  -- 하고 나서 적는 것
  result text,
  photo_url text,
  next_step text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists cell_ministries_cell_idx
  on public.cell_ministries (cell_id, serve_on desc)
  where deleted_at is null;

alter table public.cell_ministries enable row level security;

drop policy if exists cell_ministries_select on public.cell_ministries;
create policy cell_ministries_select on public.cell_ministries
  for select using (deleted_at is null and can_see_cell(cell_id));

drop policy if exists cell_ministries_insert on public.cell_ministries;
create policy cell_ministries_insert on public.cell_ministries
  for insert with check (created_by = auth.uid() and can_see_cell(cell_id));

drop policy if exists cell_ministries_update on public.cell_ministries;
create policy cell_ministries_update on public.cell_ministries
  for update using (created_by = auth.uid() or is_cell_leader_of(cell_id) or can_see_all_cells())
  with check (created_by = auth.uid() or is_cell_leader_of(cell_id) or can_see_all_cells());

drop trigger if exists cell_ministries_touch on public.cell_ministries;
create trigger cell_ministries_touch before update on public.cell_ministries
  for each row execute function public.cell_set_updated_at();

-- 역할 — 「누가 무엇을 맡는가」. 비어 있는 역할이 곧 지원 단추가 된다.
create table if not exists public.cell_ministry_roles (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references cell_ministries(id) on delete cascade,
  name text not null,
  taken_by uuid references auth.users(id) on delete set null,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists cell_ministry_roles_idx
  on public.cell_ministry_roles (ministry_id, created_at);

alter table public.cell_ministry_roles enable row level security;

drop policy if exists cell_ministry_roles_select on public.cell_ministry_roles;
create policy cell_ministry_roles_select on public.cell_ministry_roles
  for select using (
    exists (select 1 from cell_ministries m where m.id = ministry_id)
  );

drop policy if exists cell_ministry_roles_insert on public.cell_ministry_roles;
create policy cell_ministry_roles_insert on public.cell_ministry_roles
  for insert with check (
    exists (
      select 1 from cell_ministries m
       where m.id = ministry_id
         and (m.created_by = auth.uid() or is_cell_leader_of(m.cell_id) or can_see_all_cells())
    )
  );

-- 지원·취소는 **본인 칸만** 바꾼다. 남이 맡은 역할을 빼앗지 못하게 using 에서
-- 「비어 있거나 내 것」만 연다.
drop policy if exists cell_ministry_roles_update on public.cell_ministry_roles;
create policy cell_ministry_roles_update on public.cell_ministry_roles
  for update using (
    exists (select 1 from cell_ministries m where m.id = ministry_id)
    and (taken_by is null or taken_by = auth.uid() or can_see_all_cells())
  )
  with check (taken_by is null or taken_by = auth.uid() or can_see_all_cells());

-- ════════════════════════════════════════════════════════════════════
-- 6. 선교실 — cell_missions
-- ════════════════════════════════════════════════════════════════════
--
-- 후원은 **교회가 승인한 안내로만** 잇는다(기획서 §2). 계좌번호 칸을 두지 않은
-- 것은 실수가 아니다 — 칸이 있으면 개인 계좌가 들어간다. support_note 에는
-- 「교회 재정부로 문의」 같은 안내만 적게 한다.

create table if not exists public.cell_missions (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references org_units(id) on delete cascade,
  field text not null,
  partner text,
  story text,
  prayer_points text,
  support_note text,
  visit_plan text,
  photo_url text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists cell_missions_cell_idx
  on public.cell_missions (cell_id, created_at desc)
  where deleted_at is null;

alter table public.cell_missions enable row level security;

drop policy if exists cell_missions_select on public.cell_missions;
create policy cell_missions_select on public.cell_missions
  for select using (deleted_at is null and can_see_cell(cell_id));

drop policy if exists cell_missions_insert on public.cell_missions;
create policy cell_missions_insert on public.cell_missions
  for insert with check (created_by = auth.uid() and can_see_cell(cell_id));

drop policy if exists cell_missions_update on public.cell_missions;
create policy cell_missions_update on public.cell_missions
  for update using (created_by = auth.uid() or is_cell_leader_of(cell_id) or can_see_all_cells())
  with check (created_by = auth.uid() or is_cell_leader_of(cell_id) or can_see_all_cells());

drop trigger if exists cell_missions_touch on public.cell_missions;
create trigger cell_missions_touch before update on public.cell_missions
  for each row execute function public.cell_set_updated_at();

-- ════════════════════════════════════════════════════════════════════
-- 7. 마을 광장 — village_posts
-- ════════════════════════════════════════════════════════════════════
--
-- 목장 글이 저절로 올라오지 않는다. 목장원이 **제안**하면 status='pending' 으로
-- 서고, 마을장·교역자가 승인해야 광장에 보인다. 낸 사람은 자기 것을 볼 수 있다
-- (승인을 기다리는 동안 「올라갔나」를 확인할 수 있어야 한다).

create table if not exists public.village_posts (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  -- 교구를 안 나눈 교회는 null. can_see_village(null) 이 받는다.
  village_id uuid references org_units(id) on delete cascade,
  -- 어느 목장이 내는 소식인가
  cell_id uuid not null references org_units(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'news' check (kind in ('news', 'testimony', 'invite', 'thanks', 'ministry', 'mission')),
  title text not null,
  body text not null,
  photo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists village_posts_village_idx
  on public.village_posts (village_id, status, created_at desc)
  where deleted_at is null;

alter table public.village_posts enable row level security;

drop policy if exists village_posts_select on public.village_posts;
create policy village_posts_select on public.village_posts
  for select using (
    deleted_at is null
    and can_see_village(village_id)
    and (
      status = 'approved'
      or author_id = auth.uid()
      or is_village_leader_of(village_id)
      or is_cell_leader_of(cell_id)
    )
  );

drop policy if exists village_posts_insert on public.village_posts;
create policy village_posts_insert on public.village_posts
  for insert with check (
    author_id = auth.uid()
    and can_see_cell(cell_id)
    and can_see_village(village_id)
    -- 낼 때는 언제나 대기 상태다. 스스로 승인해서 올리지 못한다.
    and status = 'pending'
  );

drop policy if exists village_posts_update on public.village_posts;
create policy village_posts_update on public.village_posts
  for update using (author_id = auth.uid() or is_village_leader_of(village_id))
  with check (author_id = auth.uid() or is_village_leader_of(village_id));

drop trigger if exists village_posts_touch on public.village_posts;
create trigger village_posts_touch before update on public.village_posts
  for each row execute function public.cell_set_updated_at();

-- ════════════════════════════════════════════════════════════════════
-- 8. 마을회관 · 함께하는 사역 — village_events · village_works
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.village_events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  village_id uuid references org_units(id) on delete cascade,
  title text not null,
  body text,
  event_on date not null,
  start_time text,
  place text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists village_events_idx
  on public.village_events (village_id, event_on)
  where deleted_at is null;

alter table public.village_events enable row level security;

drop policy if exists village_events_select on public.village_events;
create policy village_events_select on public.village_events
  for select using (deleted_at is null and can_see_village(village_id));

drop policy if exists village_events_insert on public.village_events;
create policy village_events_insert on public.village_events
  for insert with check (created_by = auth.uid() and is_village_leader_of(village_id));

drop policy if exists village_events_update on public.village_events;
create policy village_events_update on public.village_events
  for update using (is_village_leader_of(village_id))
  with check (is_village_leader_of(village_id));

drop trigger if exists village_events_touch on public.village_events;
create trigger village_events_touch before update on public.village_events
  for each row execute function public.cell_set_updated_at();

-- 연합 봉사·선교 프로젝트. 목장끼리 역할을 나눈다.
create table if not exists public.village_works (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  village_id uuid references org_units(id) on delete cascade,
  title text not null,
  body text,
  work_on date,
  place text,
  status text not null default 'planned' check (status in ('planned', 'doing', 'done', 'cancelled')),
  result text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists village_works_idx
  on public.village_works (village_id, work_on desc)
  where deleted_at is null;

alter table public.village_works enable row level security;

drop policy if exists village_works_select on public.village_works;
create policy village_works_select on public.village_works
  for select using (deleted_at is null and can_see_village(village_id));

drop policy if exists village_works_insert on public.village_works;
create policy village_works_insert on public.village_works
  for insert with check (created_by = auth.uid() and is_village_leader_of(village_id));

drop policy if exists village_works_update on public.village_works;
create policy village_works_update on public.village_works
  for update using (created_by = auth.uid() or is_village_leader_of(village_id))
  with check (created_by = auth.uid() or is_village_leader_of(village_id));

drop trigger if exists village_works_touch on public.village_works;
create trigger village_works_touch before update on public.village_works
  for each row execute function public.cell_set_updated_at();

-- ── 신청 — 모임 참석 신청과 봉사 역할 지원을 한 표로 ────────────────
--
-- 표를 둘로 나누지 않은 이유: 하는 일이 같다(「나 갈게요」 + 무엇을 맡을지).
-- target_kind 로 가른다. 정책은 그 대상이 보이는 사람이면 신청할 수 있다.

create table if not exists public.village_signups (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('event', 'work')),
  target_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 봉사에서 맡은 역할. 모임 참석이면 비어 있다.
  role text,
  note text,
  created_at timestamptz not null default now(),
  unique (target_kind, target_id, user_id, role)
);

create index if not exists village_signups_target_idx
  on public.village_signups (target_kind, target_id);

alter table public.village_signups enable row level security;

drop policy if exists village_signups_select on public.village_signups;
create policy village_signups_select on public.village_signups
  for select using (
    (target_kind = 'event' and exists (select 1 from village_events e where e.id = target_id))
    or (target_kind = 'work' and exists (select 1 from village_works w where w.id = target_id))
  );

drop policy if exists village_signups_insert on public.village_signups;
create policy village_signups_insert on public.village_signups
  for insert with check (
    user_id = auth.uid()
    and (
      (target_kind = 'event' and exists (select 1 from village_events e where e.id = target_id))
      or (target_kind = 'work' and exists (select 1 from village_works w where w.id = target_id))
    )
  );

drop policy if exists village_signups_delete on public.village_signups;
create policy village_signups_delete on public.village_signups
  for delete using (user_id = auth.uid() or can_see_all_cells());

-- ════════════════════════════════════════════════════════════════════
-- 9. 기도정원 — village_prayers
-- ════════════════════════════════════════════════════════════════════
--
-- 교회 전체 기도제목은 샬롬기도단(prayer_requests)이 맡는다. 여기 서는 것은
-- **마을에 나누기로 고른** 제목뿐이다. 그래서 목장 표에서 끌어오지 않고 따로
-- 적는다 — 옮겨 적는 그 한 동작이 곧 「나눠도 좋다」는 뜻이 된다.

create table if not exists public.village_prayers (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  village_id uuid references org_units(id) on delete cascade,
  cell_id uuid not null references org_units(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  -- 이름을 빼고 올릴 수 있다. 「우리 목장의 한 가정」처럼.
  is_anonymous boolean not null default false,
  answered boolean not null default false,
  answered_at timestamptz,
  answered_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists village_prayers_idx
  on public.village_prayers (village_id, answered, created_at desc)
  where deleted_at is null;

alter table public.village_prayers enable row level security;

drop policy if exists village_prayers_select on public.village_prayers;
create policy village_prayers_select on public.village_prayers
  for select using (deleted_at is null and can_see_village(village_id));

drop policy if exists village_prayers_insert on public.village_prayers;
create policy village_prayers_insert on public.village_prayers
  for insert with check (
    author_id = auth.uid() and can_see_cell(cell_id) and can_see_village(village_id)
  );

drop policy if exists village_prayers_update on public.village_prayers;
create policy village_prayers_update on public.village_prayers
  for update using (author_id = auth.uid() or is_village_leader_of(village_id))
  with check (author_id = auth.uid() or is_village_leader_of(village_id));

drop trigger if exists village_prayers_touch on public.village_prayers;
create trigger village_prayers_touch before update on public.village_prayers
  for each row execute function public.cell_set_updated_at();

/**
 * 응답 시각은 표가 채운다.
 *
 * 0076(중보기도 나무)에서 배운 그대로다 — 화면이 채우면 기기 시계가 틀어진
 * 만큼 기록이 틀어진다.
 */
create or replace function public.village_prayer_stamp()
returns trigger language plpgsql as $$
begin
  if new.answered and not old.answered then
    new.answered_at := now();
  elsif not new.answered then
    new.answered_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists village_prayers_stamp on public.village_prayers;
create trigger village_prayers_stamp before update on public.village_prayers
  for each row execute function public.village_prayer_stamp();

-- ── 반응 — 광장 글과 기도 참여를 한 표로 ────────────────────────────
--
-- 「함께 기도해요」와 「아멘·감사」는 같은 동작이다(한 사람이 한 번, 다시 누르면
-- 취소). 표를 둘로 두면 세는 코드가 두 벌이 된다.

create table if not exists public.village_cheers (
  target_kind text not null check (target_kind in ('post', 'prayer', 'work')),
  target_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null default '🙏',
  created_at timestamptz not null default now(),
  primary key (target_kind, target_id, user_id)
);

create index if not exists village_cheers_target_idx
  on public.village_cheers (target_kind, target_id);

alter table public.village_cheers enable row level security;

drop policy if exists village_cheers_select on public.village_cheers;
create policy village_cheers_select on public.village_cheers
  for select using (
    (target_kind = 'post' and exists (select 1 from village_posts p where p.id = target_id))
    or (target_kind = 'prayer' and exists (select 1 from village_prayers r where r.id = target_id))
    or (target_kind = 'work' and exists (select 1 from village_works w where w.id = target_id))
  );

drop policy if exists village_cheers_insert on public.village_cheers;
create policy village_cheers_insert on public.village_cheers
  for insert with check (
    user_id = auth.uid()
    and (
      (target_kind = 'post' and exists (select 1 from village_posts p where p.id = target_id))
      or (target_kind = 'prayer' and exists (select 1 from village_prayers r where r.id = target_id))
      or (target_kind = 'work' and exists (select 1 from village_works w where w.id = target_id))
    )
  );

drop policy if exists village_cheers_delete on public.village_cheers;
create policy village_cheers_delete on public.village_cheers
  for delete using (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════
-- 10. 마을 한눈에 — 목장 거리에 세울 건물 카드
-- ════════════════════════════════════════════════════════════════════
--
-- 화면이 목장마다 따로 물으면 목장 수만큼 왕복이 생긴다(새부대교회는 11개).
-- 한 번에 준다. 사람 수는 세되 **이름은 주지 않는다** — 남의 목장 명단은
-- 목장 거리에서 볼 것이 아니다.

create or replace function public.village_street(target_village_id uuid)
returns table (
  cell_id uuid,
  cell_name text,
  member_count integer,
  leader_name text,
  next_meet_on date,
  next_meet_title text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id,
         u.name,
         (select count(*)::integer from members m
           where m.cell_id = u.id and m.deleted_at is null),
         (select lm.name from members lm where lm.id = u.leader_member_id),
         g.meet_on,
         g.title
    from org_units u
    left join lateral (
      select gg.meet_on, gg.title
        from cell_gatherings gg
       where gg.cell_id = u.id
         and gg.deleted_at is null
         and gg.meet_on >= current_date - 7
       order by gg.meet_on
       limit 1
    ) g on true
   where u.unit_type = 'cell'
     and u.is_active
     and (u.parent_id is not distinct from target_village_id)
     and public.can_see_village(target_village_id)
   order by u.sort_order, u.name;
$$;

revoke all on function public.village_street(uuid) from public, anon;
grant execute on function public.village_street(uuid) to authenticated;
