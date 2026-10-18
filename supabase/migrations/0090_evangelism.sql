-- 전도 — 이웃초청예배를 향한 전도대상자 돌봄, 중보기도, 교회의 전도전략.
--
-- ── 무엇을 담는가 ───────────────────────────────────────────────────
--   evangelism_campaigns   교회가 정한 전도 일정(예: 이웃초청예배 12/6)
--   evangelism_phases      그 일정을 향한 교회의 전략 — 단계별 기간·할 일
--   evangelism_targets     성도가 올린 전도대상자(본인만 본다)
--   evangelism_actions     대상자를 향한 걸음의 기록 — 기도·연락·선물·만남·초대·참석·정착
--   evangelism_shares      대상자를 교회에 「중보 요청」으로 나눈 것(별명으로)
--   evangelism_prayers     「함께 기도합니다」
--   evangelism_messages    격려·감동 나눔
--
-- ── 사생활 ──────────────────────────────────────────────────────────
-- 아직 믿지 않는 분의 이름·연락처·사정이 적히는 표다. 0076·0085 와 같은 판단으로
-- **RLS 는 칸을 못 지키니 표를 갈랐다.**
--
--   evangelism_targets / actions  → 올린 사람 본인만(관리자도 못 본다)
--   evangelism_shares             → 같은 교회 성도가 본다. **실명이 없다.**
--                                    별명(예: 「직장 동료 김 집사님 이웃」)과 기도제목만.
--
-- 나누기는 올린 사람이 직접 한 번 더 눌러야 생기고, 나눈 뒤에도 언제든 거둘 수 있다.
-- 나눔 표의 단계(stage)는 걸음 기록에서 **트리거가 채운다** — 화면이 채우면
-- 본인이 실제보다 높게 적을 수도 있고 기기 시계도 어긋난다(0076 과 같은 이유).
--
-- 교회 전체 현황(몇 명이 기도 중·초대 중인지)은 이름 없는 숫자만 돌려주는
-- evangelism_summary() 가 맡는다.

-- ════════════════════════════════════════════════════════════════════
-- 1. 일정과 전략
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.evangelism_campaigns (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  title text not null,
  -- 「이웃초청예배」처럼 모두가 향하는 그날의 이름과 날짜
  event_title text not null,
  event_date date not null,
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evangelism_campaigns_church_idx
  on public.evangelism_campaigns (church_id, event_date desc);

create table if not exists public.evangelism_phases (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references evangelism_campaigns(id) on delete cascade,
  church_id uuid not null references churches(id) on delete cascade,
  sort_order int not null default 0,
  title text not null,
  -- 한 줄 요약(카드 머리에 뜬다)
  summary text not null default '',
  start_on date not null,
  end_on date not null,
  -- 이 단계에서 성도가 할 일. 줄마다 하나.
  tasks text[] not null default '{}',
  -- 교회가 함께 하는 일(새벽기도·구역모임 …). 줄마다 하나.
  church_actions text[] not null default '{}',
  -- 이 단계에서 가장 힘줄 걸음(evangelism_actions.kind). 없으면 null.
  focus_kind text,
  created_at timestamptz not null default now(),
  constraint evangelism_phases_range check (end_on >= start_on)
);

create index if not exists evangelism_phases_campaign_idx
  on public.evangelism_phases (campaign_id, sort_order);

alter table public.evangelism_campaigns enable row level security;
alter table public.evangelism_phases enable row level security;

drop policy if exists evangelism_campaigns_read on public.evangelism_campaigns;
create policy evangelism_campaigns_read on public.evangelism_campaigns
  for select using (church_id = public.my_church_id());

drop policy if exists evangelism_campaigns_write on public.evangelism_campaigns;
create policy evangelism_campaigns_write on public.evangelism_campaigns
  for all using (public.can_manage_church_content(church_id))
  with check (public.can_manage_church_content(church_id));

drop policy if exists evangelism_phases_read on public.evangelism_phases;
create policy evangelism_phases_read on public.evangelism_phases
  for select using (church_id = public.my_church_id());

drop policy if exists evangelism_phases_write on public.evangelism_phases;
create policy evangelism_phases_write on public.evangelism_phases
  for all using (public.can_manage_church_content(church_id))
  with check (public.can_manage_church_content(church_id));

-- ════════════════════════════════════════════════════════════════════
-- 2. 전도대상자 — 본인만
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.evangelism_targets (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  campaign_id uuid references evangelism_campaigns(id) on delete set null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- 가족·친구·직장 …
  relation text not null default '',
  -- 사정·기도제목·메모. 본인만 본다.
  note text not null default '',
  -- 아직 믿지 않음 / 관심 / 결신 …이 아니라 **내가 한 걸음**이 기준이므로 상태 칸은 두지 않는다.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists evangelism_targets_owner_idx
  on public.evangelism_targets (owner_id, created_at)
  where deleted_at is null;

create table if not exists public.evangelism_actions (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references evangelism_targets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (
    kind in ('pray', 'contact', 'gift', 'meet', 'invite', 'attend', 'settle')
  ),
  happened_on date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists evangelism_actions_target_idx
  on public.evangelism_actions (target_id, happened_on desc);

alter table public.evangelism_targets enable row level security;
alter table public.evangelism_actions enable row level security;

drop policy if exists evangelism_targets_own on public.evangelism_targets;
create policy evangelism_targets_own on public.evangelism_targets
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and church_id = public.my_church_id());

drop policy if exists evangelism_actions_own on public.evangelism_actions;
create policy evangelism_actions_own on public.evangelism_actions
  for all using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from evangelism_targets t
       where t.id = target_id and t.owner_id = auth.uid()
    )
  );

create or replace function public.evangelism_touch()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists evangelism_targets_touch on public.evangelism_targets;
create trigger evangelism_targets_touch before update on public.evangelism_targets
  for each row execute function public.evangelism_touch();

drop trigger if exists evangelism_campaigns_touch on public.evangelism_campaigns;
create trigger evangelism_campaigns_touch before update on public.evangelism_campaigns
  for each row execute function public.evangelism_touch();

-- ════════════════════════════════════════════════════════════════════
-- 3. 중보 요청 — 교회에 나눈 것(실명 없음)
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.evangelism_shares (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  campaign_id uuid references evangelism_campaigns(id) on delete set null,
  target_id uuid not null unique references evangelism_targets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- 실명이 아닌 이름. 「남편 회사 동료 이 과장님」「옆집 새댁」
  alias text not null,
  topic text not null default '',
  -- 가장 앞선 걸음(0=아직 없음 … 7=정착). 트리거가 채운다.
  stage int not null default 0,
  stage_kind text,
  answered boolean not null default false,
  answered_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists evangelism_shares_church_idx
  on public.evangelism_shares (church_id, created_at desc)
  where deleted_at is null;

alter table public.evangelism_shares enable row level security;

drop policy if exists evangelism_shares_read on public.evangelism_shares;
create policy evangelism_shares_read on public.evangelism_shares
  for select using (deleted_at is null and church_id = public.my_church_id());

-- 올린 사람이 자기 대상자만 나눌 수 있다. 교회도 대상자의 교회와 같아야 한다.
drop policy if exists evangelism_shares_insert on public.evangelism_shares;
create policy evangelism_shares_insert on public.evangelism_shares
  for insert with check (
    owner_id = auth.uid()
    and church_id = public.my_church_id()
    and exists (
      select 1 from evangelism_targets t
       where t.id = target_id and t.owner_id = auth.uid() and t.deleted_at is null
    )
  );

drop policy if exists evangelism_shares_update on public.evangelism_shares;
create policy evangelism_shares_update on public.evangelism_shares
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists evangelism_shares_delete on public.evangelism_shares;
create policy evangelism_shares_delete on public.evangelism_shares
  for delete using (owner_id = auth.uid());

drop trigger if exists evangelism_shares_touch on public.evangelism_shares;
create trigger evangelism_shares_touch before update on public.evangelism_shares
  for each row execute function public.evangelism_touch();

/** 걸음 종류 → 서열. 기도 1 … 정착 7. 화면의 단계 막대와 같은 순서다. */
create or replace function public.evangelism_rank(k text)
returns int language sql immutable as $$
  select case k
    when 'pray' then 1 when 'contact' then 2 when 'gift' then 3
    when 'meet' then 4 when 'invite' then 5 when 'attend' then 6
    when 'settle' then 7 else 0 end;
$$;

/** 걸음이 쌓이거나 지워질 때 나눔 표의 「가장 앞선 걸음」을 다시 센다. */
create or replace function public.evangelism_sync_stage()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  tid uuid;
  best text;
begin
  if tg_op = 'DELETE' then tid := old.target_id; else tid := new.target_id; end if;
  select a.kind into best
    from evangelism_actions a
   where a.target_id = tid
   order by public.evangelism_rank(a.kind) desc
   limit 1;

  update evangelism_shares
     set stage = public.evangelism_rank(best), stage_kind = best
   where target_id = tid;
  return null;
end $$;

drop trigger if exists evangelism_actions_sync on public.evangelism_actions;
create trigger evangelism_actions_sync after insert or delete on public.evangelism_actions
  for each row execute function public.evangelism_sync_stage();

/** 나눔을 새로 만들 때도 지금까지의 걸음을 한 번 반영한다. */
create or replace function public.evangelism_share_init()
returns trigger language plpgsql security definer set search_path = public as $$
declare best text;
begin
  select a.kind into best
    from evangelism_actions a
   where a.target_id = new.target_id
   order by public.evangelism_rank(a.kind) desc
   limit 1;
  new.stage := public.evangelism_rank(best);
  new.stage_kind := best;
  return new;
end $$;

drop trigger if exists evangelism_shares_init on public.evangelism_shares;
create trigger evangelism_shares_init before insert on public.evangelism_shares
  for each row execute function public.evangelism_share_init();

-- ════════════════════════════════════════════════════════════════════
-- 4. 함께 기도 · 격려
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.evangelism_prayers (
  share_id uuid not null references evangelism_shares(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (share_id, user_id)
);

alter table public.evangelism_prayers enable row level security;

drop policy if exists evangelism_prayers_read on public.evangelism_prayers;
create policy evangelism_prayers_read on public.evangelism_prayers
  for select using (
    exists (select 1 from evangelism_shares s where s.id = share_id)
  );

drop policy if exists evangelism_prayers_add on public.evangelism_prayers;
create policy evangelism_prayers_add on public.evangelism_prayers
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from evangelism_shares s where s.id = share_id)
  );

drop policy if exists evangelism_prayers_remove on public.evangelism_prayers;
create policy evangelism_prayers_remove on public.evangelism_prayers
  for delete using (user_id = auth.uid());

create table if not exists public.evangelism_messages (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references evangelism_shares(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  -- encourage 격려 · testimony 감동(응답·간증)
  kind text not null default 'encourage' check (kind in ('encourage', 'testimony')),
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists evangelism_messages_share_idx
  on public.evangelism_messages (share_id, created_at)
  where deleted_at is null;

alter table public.evangelism_messages enable row level security;

drop policy if exists evangelism_messages_read on public.evangelism_messages;
create policy evangelism_messages_read on public.evangelism_messages
  for select using (
    deleted_at is null
    and exists (select 1 from evangelism_shares s where s.id = share_id)
  );

drop policy if exists evangelism_messages_add on public.evangelism_messages;
create policy evangelism_messages_add on public.evangelism_messages
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from evangelism_shares s where s.id = share_id)
  );

-- 쓴 사람과 요청을 올린 사람이 지울 수 있다(soft delete).
drop policy if exists evangelism_messages_remove on public.evangelism_messages;
create policy evangelism_messages_remove on public.evangelism_messages
  for update using (
    author_id = auth.uid()
    or exists (select 1 from evangelism_shares s where s.id = share_id and s.owner_id = auth.uid())
  );

-- ════════════════════════════════════════════════════════════════════
-- 5. 교회 전체 현황 — 이름 없는 숫자
-- ════════════════════════════════════════════════════════════════════
--
-- 대상자 표는 본인만 읽히므로, 교회가 「지금 몇 명을 품고 있나」를 보려면 집계 함수가
-- 필요하다. 숫자만 돌려준다. 어느 성도가 누구를 올렸는지는 알 수 없다.

create or replace function public.evangelism_summary(target_campaign_id uuid)
returns table (
  targets bigint,
  members bigint,
  prayed bigint,
  contacted bigint,
  gifted bigint,
  met bigint,
  invited bigint,
  attended bigint,
  settled bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select t.id, t.owner_id
      from evangelism_targets t
      join evangelism_campaigns c on c.id = target_campaign_id
     where t.deleted_at is null
       and t.church_id = c.church_id
       and c.church_id = public.my_church_id()
       and (t.campaign_id = c.id or t.campaign_id is null)
  )
  select
    (select count(*) from mine),
    (select count(distinct owner_id) from mine),
    -- 「~까지 갔다」가 아니라 「그 걸음을 한 적 있다」로 센다 → 사람 수가 아니라 걸음 종류별로.
    (select count(distinct a.target_id) from evangelism_actions a join mine m on m.id = a.target_id where a.kind = 'pray'),
    (select count(distinct a.target_id) from evangelism_actions a join mine m on m.id = a.target_id where a.kind = 'contact'),
    (select count(distinct a.target_id) from evangelism_actions a join mine m on m.id = a.target_id where a.kind = 'gift'),
    (select count(distinct a.target_id) from evangelism_actions a join mine m on m.id = a.target_id where a.kind = 'meet'),
    (select count(distinct a.target_id) from evangelism_actions a join mine m on m.id = a.target_id where a.kind = 'invite'),
    (select count(distinct a.target_id) from evangelism_actions a join mine m on m.id = a.target_id where a.kind = 'attend'),
    (select count(distinct a.target_id) from evangelism_actions a join mine m on m.id = a.target_id where a.kind = 'settle');
$$;

revoke all on function public.evangelism_summary(uuid) from public, anon;
grant execute on function public.evangelism_summary(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 6. 새부대교회 — 이웃초청예배(2026-12-06) 전략
-- ════════════════════════════════════════════════════════════════════
--
-- D-49(10/18)부터 여섯 단계. 날짜는 모두 12/6 을 기준으로 거꾸로 셌다.
-- 슬러그가 없는 DB(다른 교회·로컬)에서는 아무것도 넣지 않는다.

do $$
declare
  ch uuid := (select id from churches where slug = 'saebudae-church');
  cp uuid;
begin
  if ch is null then return; end if;
  if exists (select 1 from evangelism_campaigns where church_id = ch and event_date = '2026-12-06') then
    return;
  end if;

  insert into evangelism_campaigns (church_id, title, event_title, event_date, description)
  values (
    ch, '2026 이웃초청 전도', '이웃초청예배', '2026-12-06',
    '12월 6일 주일, 한 사람 한 사람을 하나님께 데려오는 날입니다. 기도로 시작해 사랑으로 초대하고, 예배 뒤에도 곁에 있어 주세요.'
  )
  returning id into cp;

  insert into evangelism_phases
    (campaign_id, church_id, sort_order, title, summary, start_on, end_on, tasks, church_actions, focus_kind)
  values
  (cp, ch, 1, '작정 — 한 사람을 품다', '이름을 적고, 하나님께 맡기는 단계',
   '2026-10-18', '2026-11-01',
   array['전도대상자 1~3명을 마음에 품고 이 앱에 올립니다.',
         '이름 앞에 하루 한 번, 짧게라도 기도를 시작합니다.',
         '「중보 요청」으로 나눌 수 있는 분은 별명으로 교회에 나눕니다.'],
   array['주일 광고·목장모임에서 이웃초청예배 비전 나눔',
         '새벽기도회 때 「작정 기도」 시작'],
   'pray'),
  (cp, ch, 2, '기도로 길을 닦다', '대상자를 위해 함께 기도하는 단계',
   '2026-11-02', '2026-11-15',
   array['매일 대상자를 위해 기도합니다(하루 한 번 기도 기록).',
         '중보기도 광장에서 다른 성도의 대상자를 위해서도 「함께 기도합니다」를 누릅니다.',
         '안부 문자·전화로 먼저 연락을 시작합니다.'],
   array['금요기도회·새벽기도회에 이웃초청 중보 시간',
         '목장모임에서 대상자 기도제목 나눔'],
   'contact'),
  (cp, ch, 3, '마음을 열다 — 선물과 섬김', '작은 선물과 섬김으로 마음의 문을 두드리는 단계',
   '2026-11-16', '2026-11-29',
   array['식사·커피·작은 선물로 사랑을 표현합니다.',
         '필요를 살펴 돕고, 대화 속에서 신앙 이야기를 자연스럽게 꺼내 봅니다.',
         '직접 만나는 시간을 한 번 이상 가집니다.'],
   array['추수감사주일(11/22) 감사 나눔과 이웃 초청 간증',
         '초청 선물(교회 준비) 배부'],
   'gift'),
  (cp, ch, 4, '초대하다', '날짜를 알리고 함께 가자고 초대하는 단계',
   '2026-11-30', '2026-12-05',
   array['초청장을 전하고 12월 6일 예배에 함께 가자고 직접 초대합니다.',
         '참석 의사를 확인하고, 교통·동행 방법을 정합니다.',
         '12/5(토) 저녁 확인 연락과 기도를 합니다.'],
   array['초청장 배부와 예배 안내',
         '12/5(토) 저녁 전교인 합심기도'],
   'invite'),
  (cp, ch, 5, '이웃초청예배', '12월 6일(주일) — 환영하고 함께 앉는 날',
   '2026-12-06', '2026-12-06',
   array['대상자와 함께 도착해 옆자리에 앉습니다.',
         '예배 후 식사·교제를 함께합니다.',
         '이 앱에서 「참석」 걸음을 기록하고 감사 인사를 나눕니다.'],
   array['환영팀 운영 · 새가족 등록 안내', '이웃초청 감사 식사'],
   'attend'),
  (cp, ch, 6, '정착 — 곁에 있어 주다', '한 번의 방문이 정착으로 이어지는 단계',
   '2026-12-07', '2027-01-03',
   array['예배 다음 날 감사 연락을 합니다.',
         '다음 주일에도 함께 예배드리도록 초대합니다.',
         '목장·새가족반으로 연결하고, 정착하면 「정착」으로 기록합니다.'],
   array['새가족반 개설 · 목장 배정', '4주 동행 돌봄'],
   'settle');
end $$;
