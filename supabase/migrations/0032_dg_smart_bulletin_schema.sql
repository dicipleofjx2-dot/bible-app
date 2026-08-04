-- DG 스마트주보(dg-smart-bulletin) 프로젝트의 Supabase 스키마를 데이빗바이블
-- 프로젝트로 이관한다. 원본은 Documents\dg-smart-bulletin\supabase\migrations\
-- 0001~0012(로그인 계정 풀은 공유하되, 앱별 권한/멤버십은 완전히 분리 — 데이빗바이블은
-- 누구나, 스마트주보는 교회 교인만이라는 원칙은 이 스키마 자체가 강제한다: 계정이 있다고
-- 자동으로 church_memberships/members가 생기지 않고, 관리자가 별도로 만들어줘야 한다).
--
-- 유일한 손질: 데이빗바이블에 이미 `profiles` 테이블·`handle_new_user` 함수·
-- `on_auth_user_created` 트리거가 있어서 이름이 그대로 겹친다. 아래에서
-- profiles → bulletin_profiles, handle_new_user → handle_new_bulletin_user,
-- on_auth_user_created → on_auth_user_created_bulletin 로 이름만 바꿔서 옮겼다.
-- 나머지 26개 테이블/함수는 이름 충돌이 없어 원본 그대로다.

create extension if not exists pgcrypto;

-- updated_at 자동 갱신 트리거 함수
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ========== churches ==========
create table churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  cover_image_url text,
  description text,
  motto text,
  address text,
  phone text,
  email text,
  website_url text,
  youtube_url text,
  donation_info text,
  theme_settings jsonb not null default '{}'::jsonb,
  timezone text not null default 'Asia/Seoul',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger churches_set_updated_at before update on churches
  for each row execute function set_updated_at();

-- ========== bulletin_profiles ==========
-- 원본 이름은 profiles였으나 데이빗바이블의 profiles와 겹쳐서 이름을 바꿨다.
-- auth.users 1:1. 회원가입 시 트리거로 자동 생성한다(handle_new_bulletin_user, 아래).
create table bulletin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger bulletin_profiles_set_updated_at before update on bulletin_profiles
  for each row execute function set_updated_at();

-- ========== church_memberships ==========
create table church_memberships (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'ministry_editor', 'viewer')),
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (church_id, user_id)
);
create index church_memberships_user_id_idx on church_memberships (user_id);
create trigger church_memberships_set_updated_at before update on church_memberships
  for each row execute function set_updated_at();

-- ========== bulletins ==========
create table bulletins (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  title text not null,
  slug text,
  bulletin_date date not null,
  issue_number integer,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'archived', 'deleted')),
  published_at timestamptz,
  scheduled_at timestamptz,
  theme_settings jsonb not null default '{}'::jsonb,
  source_bulletin_id uuid references bulletins(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index bulletins_church_status_idx on bulletins (church_id, status, published_at desc);
create trigger bulletins_set_updated_at before update on bulletins
  for each row execute function set_updated_at();

-- ========== bulletin_blocks ==========
create table bulletin_blocks (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  bulletin_id uuid not null references bulletins(id) on delete cascade,
  block_type text not null check (block_type in (
    'church_header', 'sermon_feature', 'worship_order', 'weekly_schedule',
    'announcements', 'newcomer', 'participation', 'recent_sermons',
    'church_information', 'mission_news', 'custom_text', 'custom_image'
  )),
  title text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  style_settings jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index bulletin_blocks_bulletin_sort_idx on bulletin_blocks (bulletin_id, sort_order);
create trigger bulletin_blocks_set_updated_at before update on bulletin_blocks
  for each row execute function set_updated_at();

-- ========== sermons ==========
create table sermons (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  bulletin_id uuid references bulletins(id) on delete set null,
  title text not null,
  scripture text,
  preacher text,
  sermon_date date not null,
  summary text,
  full_text text,
  key_message text,
  video_url text,
  audio_url text,
  thumbnail_url text,
  series_id uuid,
  tags text[] not null default '{}',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index sermons_church_date_idx on sermons (church_id, sermon_date desc);
create trigger sermons_set_updated_at before update on sermons
  for each row execute function set_updated_at();

-- ========== sermon_resources ==========
create table sermon_resources (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  sermon_id uuid not null references sermons(id) on delete cascade,
  resource_type text not null check (resource_type in (
    'summary', 'cell_guide', 'family_worship', 'youth_summary',
    'children_summary', 'message_card', 'transcript', 'other'
  )),
  title text,
  description text,
  file_url text,
  content text,
  is_downloadable boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index sermon_resources_sermon_idx on sermon_resources (sermon_id, sort_order);
create trigger sermon_resources_set_updated_at before update on sermon_resources
  for each row execute function set_updated_at();

-- ========== worship_services ==========
create table worship_services (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  bulletin_id uuid not null references bulletins(id) on delete cascade,
  name text not null,
  service_date date not null,
  start_time time,
  end_time time,
  location text,
  preacher text,
  sermon_id uuid references sermons(id) on delete set null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index worship_services_bulletin_idx on worship_services (bulletin_id, sort_order);
create trigger worship_services_set_updated_at before update on worship_services
  for each row execute function set_updated_at();

-- ========== worship_order_items ==========
create table worship_order_items (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  worship_service_id uuid not null references worship_services(id) on delete cascade,
  item_type text not null,
  title text,
  detail text,
  person_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  bank_name text,
  account_number text,
  scripture_text text
);
create index worship_order_items_service_idx on worship_order_items (worship_service_id, sort_order);
create trigger worship_order_items_set_updated_at before update on worship_order_items
  for each row execute function set_updated_at();

-- ========== events (예배·기도회·전도·목장·교육·행사 통합) ==========
create table events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  bulletin_id uuid references bulletins(id) on delete set null,
  category text not null check (category in (
    'worship', 'prayer', 'evangelism', 'cell', 'education', 'event', 'mission', 'other'
  )),
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz,
  is_all_day boolean not null default false,
  is_recurring boolean not null default false,
  recurrence_rule text,
  target_group text,
  leader_name text,
  contact text,
  preparation text,
  registration_enabled boolean not null default false,
  registration_url text,
  online_url text,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- 원본 마이그레이션 파일엔 없지만 운영 중인 DB에 이미 추가되어 있던 컬럼(대시보드에서 직접 추가된 듯).
  schedule_label text,
  image_url text,
  video_url text
);
create index events_church_start_idx on events (church_id, start_at);
create trigger events_set_updated_at before update on events
  for each row execute function set_updated_at();

-- ========== announcements ==========
create table announcements (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  bulletin_id uuid references bulletins(id) on delete set null,
  category text not null check (category in (
    'notice', 'worship', 'education', 'event', 'recruit', 'mission', 'member_news', 'next_gen', 'other'
  )),
  title text not null,
  summary text,
  content text,
  image_url text,
  importance text not null default 'normal' check (importance in ('normal', 'high')),
  event_date date,
  location text,
  contact text,
  action_label text,
  action_url text,
  start_at timestamptz,
  end_at timestamptz,
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  video_url text
);
create index announcements_church_visible_idx on announcements (church_id, is_visible);
create trigger announcements_set_updated_at before update on announcements
  for each row execute function set_updated_at();

-- ========== newcomer_submissions (개인정보, 공개 조회 대상 아님) ==========
create table newcomer_submissions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  name text not null,
  phone text,
  age_group text,
  region text,
  family_info text,
  visit_route text,
  interests text[] not null default '{}',
  consultation_requested boolean not null default false,
  privacy_agreed boolean not null default false,
  status text not null default 'received'
    check (status in (
      'received', 'awaiting_contact', 'contacted', 'education',
      'registered', 'on_hold', 'other_church', 'unreachable'
    )),
  assigned_to uuid references auth.users(id),
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  assigned_pastor_member_id uuid,
  assigned_cell_id uuid,
  first_contacted_at timestamptz,
  welcome_sent_at timestamptz,
  next_contact_on date
);
create index newcomer_submissions_church_idx on newcomer_submissions (church_id, status);
create trigger newcomer_submissions_set_updated_at before update on newcomer_submissions
  for each row execute function set_updated_at();

-- ========== form_submissions (행사 신청·기도제목·봉사 신청 공통, 개인정보) ==========
create table form_submissions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  form_type text not null check (form_type in (
    'event_registration', 'prayer_request', 'serve_application', 'cell_connect', 'other'
  )),
  reference_id uuid,
  name text,
  phone text,
  email text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index form_submissions_church_idx on form_submissions (church_id, form_type);
create trigger form_submissions_set_updated_at before update on form_submissions
  for each row execute function set_updated_at();

-- ========== media_files ==========
create table media_files (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  file_name text not null,
  file_type text,
  mime_type text,
  file_size bigint,
  storage_path text not null,
  public_url text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index media_files_church_idx on media_files (church_id);

-- ========== bulletin_versions ==========
create table bulletin_versions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  bulletin_id uuid not null references bulletins(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  change_summary text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (bulletin_id, version_number)
);
create index bulletin_versions_bulletin_idx on bulletin_versions (bulletin_id, version_number desc);

-- ============================================================
-- RLS 정책 (원본 0002_rls_policies.sql)
-- ============================================================

create or replace function is_church_member(target_church_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from church_memberships
    where church_id = target_church_id
      and user_id = auth.uid()
      and is_active = true
  );
$$;

create or replace function is_church_admin(target_church_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from church_memberships
    where church_id = target_church_id
      and user_id = auth.uid()
      and is_active = true
      and role in ('owner', 'admin')
  );
$$;

alter table churches enable row level security;
create policy churches_public_select on churches
  for select using (is_active = true or is_church_member(id));
create policy churches_admin_update on churches
  for update using (is_church_admin(id));

alter table bulletin_profiles enable row level security;
create policy bulletin_profiles_self_select on bulletin_profiles
  for select using (user_id = auth.uid());
create policy bulletin_profiles_self_insert on bulletin_profiles
  for insert with check (user_id = auth.uid());
create policy bulletin_profiles_self_update on bulletin_profiles
  for update using (user_id = auth.uid());

alter table church_memberships enable row level security;
create policy church_memberships_select on church_memberships
  for select using (user_id = auth.uid() or is_church_admin(church_id));
create policy church_memberships_admin_insert on church_memberships
  for insert with check (is_church_admin(church_id));
create policy church_memberships_admin_update on church_memberships
  for update using (is_church_admin(church_id));

alter table bulletins enable row level security;
create policy bulletins_public_select on bulletins
  for select using (
    (status = 'published' and deleted_at is null) or is_church_member(church_id)
  );
create policy bulletins_member_insert on bulletins
  for insert with check (is_church_member(church_id));
create policy bulletins_member_update on bulletins
  for update using (is_church_member(church_id));

alter table bulletin_blocks enable row level security;
create policy bulletin_blocks_public_select on bulletin_blocks
  for select using (
    (
      is_visible = true and deleted_at is null
      and exists (
        select 1 from bulletins b
        where b.id = bulletin_blocks.bulletin_id
          and b.status = 'published'
          and b.deleted_at is null
      )
    )
    or is_church_member(church_id)
  );
create policy bulletin_blocks_member_insert on bulletin_blocks
  for insert with check (is_church_member(church_id));
create policy bulletin_blocks_member_update on bulletin_blocks
  for update using (is_church_member(church_id));

alter table sermons enable row level security;
create policy sermons_public_select on sermons
  for select using (
    (is_published = true and deleted_at is null) or is_church_member(church_id)
  );
create policy sermons_member_insert on sermons
  for insert with check (is_church_member(church_id));
create policy sermons_member_update on sermons
  for update using (is_church_member(church_id));

alter table sermon_resources enable row level security;
create policy sermon_resources_public_select on sermon_resources
  for select using (
    deleted_at is null
    and exists (
      select 1 from sermons s
      where s.id = sermon_resources.sermon_id and s.is_published = true and s.deleted_at is null
    )
    or is_church_member(church_id)
  );
create policy sermon_resources_member_insert on sermon_resources
  for insert with check (is_church_member(church_id));
create policy sermon_resources_member_update on sermon_resources
  for update using (is_church_member(church_id));

alter table worship_services enable row level security;
create policy worship_services_public_select on worship_services
  for select using (
    (
      deleted_at is null
      and exists (
        select 1 from bulletins b
        where b.id = worship_services.bulletin_id and b.status = 'published' and b.deleted_at is null
      )
    )
    or is_church_member(church_id)
  );
create policy worship_services_member_insert on worship_services
  for insert with check (is_church_member(church_id));
create policy worship_services_member_update on worship_services
  for update using (is_church_member(church_id));

alter table worship_order_items enable row level security;
create policy worship_order_items_public_select on worship_order_items
  for select using (
    (
      deleted_at is null
      and exists (
        select 1 from worship_services ws
        join bulletins b on b.id = ws.bulletin_id
        where ws.id = worship_order_items.worship_service_id
          and b.status = 'published' and b.deleted_at is null
      )
    )
    or is_church_member(church_id)
  );
create policy worship_order_items_member_insert on worship_order_items
  for insert with check (is_church_member(church_id));
create policy worship_order_items_member_update on worship_order_items
  for update using (is_church_member(church_id));

alter table events enable row level security;
create policy events_public_select on events
  for select using (
    (is_visible = true and deleted_at is null) or is_church_member(church_id)
  );
create policy events_member_insert on events
  for insert with check (is_church_member(church_id));
create policy events_member_update on events
  for update using (is_church_member(church_id));

alter table announcements enable row level security;
create policy announcements_public_select on announcements
  for select using (
    (is_visible = true and deleted_at is null) or is_church_member(church_id)
  );
create policy announcements_member_insert on announcements
  for insert with check (is_church_member(church_id));
create policy announcements_member_update on announcements
  for update using (is_church_member(church_id));

alter table newcomer_submissions enable row level security;
create policy newcomer_submissions_public_insert on newcomer_submissions
  for insert with check (true);

alter table form_submissions enable row level security;
create policy form_submissions_public_insert on form_submissions
  for insert with check (true);

alter table media_files enable row level security;
create policy media_files_member_select on media_files
  for select using (is_church_member(church_id));
create policy media_files_member_insert on media_files
  for insert with check (is_church_member(church_id));

alter table bulletin_versions enable row level security;
create policy bulletin_versions_member_select on bulletin_versions
  for select using (is_church_member(church_id));
create policy bulletin_versions_member_insert on bulletin_versions
  for insert with check (is_church_member(church_id));

-- ============================================================
-- 회원가입 트리거 (원본 0003_auth_profile_trigger.sql)
-- 함수/트리거 이름을 데이빗바이블의 handle_new_user/on_auth_user_created와
-- 겹치지 않게 바꿨다.
-- ============================================================

create or replace function handle_new_bulletin_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into bulletin_profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created_bulletin
  after insert on auth.users
  for each row execute function handle_new_bulletin_user();

-- ============================================================
-- 교적관리 1단계 (원본 0006_member_registry.sql)
-- ============================================================

alter table church_memberships drop constraint if exists church_memberships_role_check;
alter table church_memberships add constraint church_memberships_role_check
  check (role in (
    'owner', 'admin', 'editor', 'ministry_editor', 'viewer',
    'member_admin', 'finance_admin', 'pastor', 'cell_leader', 'member'
  ));

alter table church_memberships add column if not exists member_id uuid;

create or replace function has_church_role(target_church_id uuid, allowed text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from church_memberships
    where church_id = target_church_id
      and user_id = auth.uid()
      and is_active = true
      and role = any(allowed)
  );
$$;

create or replace function can_manage_members(target_church_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select has_church_role(target_church_id, array['owner', 'admin', 'member_admin']);
$$;

create or replace function can_view_members(target_church_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select has_church_role(target_church_id, array['owner', 'admin', 'member_admin', 'pastor', 'cell_leader']);
$$;

create table if not exists org_units (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  unit_type text not null check (unit_type in ('district', 'cell', 'department', 'church_school', 'ministry')),
  name text not null,
  parent_id uuid references org_units(id) on delete set null,
  leader_member_id uuid,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists org_units_church_type_idx on org_units (church_id, unit_type, sort_order);
create trigger org_units_set_updated_at before update on org_units
  for each row execute function set_updated_at();

create table if not exists family_groups (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  family_name text not null,
  head_member_id uuid,
  address text,
  phone text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists family_groups_church_idx on family_groups (church_id, family_name);
create trigger family_groups_set_updated_at before update on family_groups
  for each row execute function set_updated_at();

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  member_no text not null,

  name text not null,
  photo_url text,
  gender text check (gender in ('male', 'female')),
  birth_date date,
  birth_is_lunar boolean not null default false,
  phone text,
  email text,
  address text,
  occupation text,
  marital_status text check (marital_status in ('single', 'married', 'widowed', 'divorced', 'unknown')),
  registered_on date,
  registration_route text,

  membership_status text not null default 'newcomer'
    check (membership_status in ('newcomer', 'registered', 'long_absent', 'transferred_out', 'removed', 'deceased')),
  position text,
  is_baptized boolean not null default false,
  baptized_on date,
  is_confirmed boolean not null default false,
  confirmed_on date,
  previous_church text,
  faith_background text,
  care_stage text,

  district_id uuid references org_units(id) on delete set null,
  cell_id uuid references org_units(id) on delete set null,
  department_id uuid references org_units(id) on delete set null,
  church_school_id uuid references org_units(id) on delete set null,
  worship_community text,
  care_pastor_member_id uuid,
  cell_leader_member_id uuid,

  family_group_id uuid references family_groups(id) on delete set null,
  family_role text check (family_role in ('head', 'spouse', 'father', 'mother', 'child', 'sibling', 'other')),

  first_visit_on date,
  next_contact_on date,
  care_level text check (care_level in ('normal', 'watch', 'urgent')),
  absence_reason text,
  public_note text,

  user_id uuid references auth.users(id) on delete set null,
  newcomer_submission_id uuid references newcomer_submissions(id) on delete set null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- 음력 생일 윤달 구분 (원본 0007_member_lunar_birthday.sql)
  birth_lunar_is_leap boolean not null default false,

  unique (church_id, member_no)
);
create index if not exists members_church_name_idx on members (church_id, name);
create index if not exists members_church_status_idx on members (church_id, membership_status);
create index if not exists members_church_phone_idx on members (church_id, phone);
create index if not exists members_family_idx on members (family_group_id);
create index if not exists members_cell_idx on members (cell_id);
create trigger members_set_updated_at before update on members
  for each row execute function set_updated_at();

alter table family_groups add constraint family_groups_head_member_fk
  foreign key (head_member_id) references members(id) on delete set null;

alter table org_units add constraint org_units_leader_member_fk
  foreign key (leader_member_id) references members(id) on delete set null;

alter table members add constraint members_care_pastor_fk
  foreign key (care_pastor_member_id) references members(id) on delete set null;

alter table members add constraint members_cell_leader_fk
  foreign key (cell_leader_member_id) references members(id) on delete set null;

alter table church_memberships add constraint church_memberships_member_fk
  foreign key (member_id) references members(id) on delete set null;

alter table newcomer_submissions add constraint newcomer_submissions_pastor_fk
  foreign key (assigned_pastor_member_id) references members(id) on delete set null;

alter table newcomer_submissions add constraint newcomer_submissions_cell_fk
  foreign key (assigned_cell_id) references org_units(id) on delete set null;

create table if not exists member_change_logs (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('create', 'update', 'delete', 'restore', 'view', 'export', 'import')),
  summary text,
  changed_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists member_change_logs_church_idx on member_change_logs (church_id, created_at desc);
create index if not exists member_change_logs_member_idx on member_change_logs (member_id, created_at desc);

create or replace function next_member_no(target_church_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select lpad(
    (coalesce(max(nullif(regexp_replace(member_no, '\D', '', 'g'), ''))::bigint, 0) + 1)::text,
    4, '0')
  from members
  where church_id = target_church_id;
$$;

alter table org_units enable row level security;
alter table family_groups enable row level security;
alter table members enable row level security;
alter table member_change_logs enable row level security;

create policy org_units_member_select on org_units
  for select using (is_church_member(church_id));
create policy org_units_manage_insert on org_units
  for insert with check (can_manage_members(church_id));
create policy org_units_manage_update on org_units
  for update using (can_manage_members(church_id));
create policy org_units_manage_delete on org_units
  for delete using (can_manage_members(church_id));

create policy family_groups_view_select on family_groups
  for select using (can_view_members(church_id));
create policy family_groups_manage_insert on family_groups
  for insert with check (can_manage_members(church_id));
create policy family_groups_manage_update on family_groups
  for update using (can_manage_members(church_id));

create policy members_view_select on members
  for select using (can_view_members(church_id) or user_id = auth.uid());
create policy members_manage_insert on members
  for insert with check (can_manage_members(church_id));
create policy members_manage_update on members
  for update using (can_manage_members(church_id));

create policy member_change_logs_admin_select on member_change_logs
  for select using (can_manage_members(church_id));
create policy member_change_logs_view_insert on member_change_logs
  for insert with check (can_view_members(church_id));

-- 교인번호(member_no) 자동 채번(원본 미포함, 앱 코드가 next_member_no()로 직접 조회)

-- ========== 새가족 등록 담당자 자동 배정 (원본 0008_newcomer_followup.sql §4) ==========
alter table churches add column if not exists default_newcomer_pastor_member_id uuid;
alter table churches add column if not exists newcomer_contact_due_days integer not null default 3;
alter table churches add constraint churches_default_newcomer_pastor_fk
  foreign key (default_newcomer_pastor_member_id) references members(id) on delete set null;

create or replace function assign_newcomer_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_pastor_member_id is null then
    select default_newcomer_pastor_member_id
      into new.assigned_pastor_member_id
      from churches where id = new.church_id;
  end if;
  return new;
end;
$$;

create trigger newcomer_submissions_assign_defaults before insert on newcomer_submissions
  for each row execute function assign_newcomer_defaults();

create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  template_key text not null check (template_key in ('newcomer_welcome', 'newcomer_education', 'absence_check')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (church_id, template_key)
);
create trigger message_templates_set_updated_at before update on message_templates
  for each row execute function set_updated_at();

alter table message_templates enable row level security;
create policy message_templates_member_select on message_templates
  for select using (is_church_member(church_id));
create policy message_templates_manage_insert on message_templates
  for insert with check (can_manage_members(church_id));
create policy message_templates_manage_update on message_templates
  for update using (can_manage_members(church_id));

-- ========== 개인정보 접근 범위 정리 (원본 0010_newcomer_access_tighten.sql) ==========
create policy newcomer_submissions_view_select on newcomer_submissions
  for select using (can_view_members(church_id));
create policy newcomer_submissions_view_update on newcomer_submissions
  for update using (can_view_members(church_id));
create policy form_submissions_view_select on form_submissions
  for select using (can_view_members(church_id));
create policy form_submissions_view_update on form_submissions
  for update using (can_view_members(church_id));

-- ============================================================
-- 목양관리 (원본 0009_care_management.sql)
-- ============================================================

create or replace function can_record_attendance(target_church_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select has_church_role(target_church_id, array['owner', 'admin', 'member_admin', 'pastor', 'cell_leader']);
$$;

create or replace function can_view_sensitive_care(target_church_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select has_church_role(target_church_id, array['owner', 'admin', 'member_admin', 'pastor']);
$$;

create table if not exists attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  meeting_type text not null check (meeting_type in (
    'sunday_service', 'wednesday', 'dawn_prayer', 'friday', 'cell_meeting',
    'church_school', 'education', 'special', 'event'
  )),
  title text,
  meeting_date date not null,
  org_unit_id uuid references org_units(id) on delete set null,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists attendance_sessions_church_date_idx
  on attendance_sessions (church_id, meeting_date desc);
create unique index if not exists attendance_sessions_unique_idx on attendance_sessions
  (church_id, meeting_type, meeting_date, coalesce(org_unit_id, '00000000-0000-0000-0000-000000000000'::uuid));
create trigger attendance_sessions_set_updated_at before update on attendance_sessions
  for each row execute function set_updated_at();

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  session_id uuid not null references attendance_sessions(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  status text not null default 'present'
    check (status in ('present', 'online', 'late', 'excused', 'absent')),
  note text,
  recorded_by uuid references auth.users(id),
  recorded_at timestamptz not null default now(),
  unique (session_id, member_id)
);
create index if not exists attendance_records_member_idx on attendance_records (member_id, recorded_at desc);
create index if not exists attendance_records_session_idx on attendance_records (session_id);

create table if not exists care_records (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  record_type text not null check (record_type in ('visit', 'counsel', 'prayer', 'call', 'education', 'note')),
  title text,
  content text not null,
  visibility text not null default 'team' check (visibility in ('team', 'pastor_only')),
  occurred_on date not null default current_date,
  follow_up_on date,
  is_resolved boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists care_records_member_idx on care_records (member_id, occurred_on desc);
create index if not exists care_records_church_followup_idx on care_records (church_id, follow_up_on);
create trigger care_records_set_updated_at before update on care_records
  for each row execute function set_updated_at();

alter table churches add column if not exists absence_alert_weeks integer not null default 3;

alter table attendance_sessions enable row level security;
alter table attendance_records enable row level security;
alter table care_records enable row level security;

create policy attendance_sessions_view_select on attendance_sessions
  for select using (can_view_members(church_id));
create policy attendance_sessions_record_insert on attendance_sessions
  for insert with check (can_record_attendance(church_id));
create policy attendance_sessions_record_update on attendance_sessions
  for update using (can_record_attendance(church_id));
create policy attendance_sessions_manage_delete on attendance_sessions
  for delete using (can_manage_members(church_id));

create policy attendance_records_view_select on attendance_records
  for select using (can_view_members(church_id));
create policy attendance_records_record_insert on attendance_records
  for insert with check (can_record_attendance(church_id));
create policy attendance_records_record_update on attendance_records
  for update using (can_record_attendance(church_id));
create policy attendance_records_record_delete on attendance_records
  for delete using (can_record_attendance(church_id));

create policy care_records_select on care_records
  for select using (
    deleted_at is null
    and (
      (visibility = 'team' and can_view_members(church_id))
      or can_view_sensitive_care(church_id)
    )
  );
create policy care_records_insert on care_records
  for insert with check (can_view_members(church_id));
create policy care_records_update on care_records
  for update using (created_by = auth.uid() or can_manage_members(church_id));

-- ============================================================
-- 재정관리 (원본 0011_finance.sql)
-- ============================================================

create or replace function can_manage_finance(target_church_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select has_church_role(target_church_id, array['owner', 'admin', 'finance_admin']);
$$;

create table if not exists offering_types (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  name text not null,
  is_deductible boolean not null default true,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (church_id, name)
);
create trigger offering_types_set_updated_at before update on offering_types
  for each row execute function set_updated_at();

create table if not exists account_categories (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (church_id, kind, name)
);
create trigger account_categories_set_updated_at before update on account_categories
  for each row execute function set_updated_at();

alter table members add column if not exists envelope_no text;
create index if not exists members_envelope_idx on members (church_id, envelope_no);

create table if not exists finance_transactions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  transaction_date date not null,
  amount bigint not null check (amount > 0),

  offering_type_id uuid references offering_types(id) on delete set null,
  member_id uuid references members(id) on delete set null,
  donor_name text,
  envelope_no text,

  account_category_id uuid references account_categories(id) on delete set null,
  department_id uuid references org_units(id) on delete set null,

  payment_method text not null default 'cash'
    check (payment_method in ('cash', 'bank', 'card', 'online', 'other')),
  memo text,
  receipt_url text,

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists finance_tx_church_date_idx on finance_transactions (church_id, transaction_date desc);
create index if not exists finance_tx_member_idx on finance_transactions (member_id, transaction_date desc);
create index if not exists finance_tx_offering_idx on finance_transactions (offering_type_id);
create trigger finance_transactions_set_updated_at before update on finance_transactions
  for each row execute function set_updated_at();

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references churches(id) on delete cascade,
  fiscal_year integer not null,
  account_category_id uuid references account_categories(id) on delete cascade,
  department_id uuid references org_units(id) on delete set null,
  amount bigint not null default 0,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists budgets_church_year_idx on budgets (church_id, fiscal_year);
create trigger budgets_set_updated_at before update on budgets
  for each row execute function set_updated_at();

alter table churches add column if not exists fiscal_year_start_month integer not null default 1;
alter table churches add column if not exists donation_receipt_info jsonb not null default '{}'::jsonb;

alter table offering_types enable row level security;
alter table account_categories enable row level security;
alter table finance_transactions enable row level security;
alter table budgets enable row level security;

create policy offering_types_member_select on offering_types
  for select using (is_church_member(church_id));
create policy offering_types_finance_insert on offering_types
  for insert with check (can_manage_finance(church_id));
create policy offering_types_finance_update on offering_types
  for update using (can_manage_finance(church_id));

create policy account_categories_member_select on account_categories
  for select using (is_church_member(church_id));
create policy account_categories_finance_insert on account_categories
  for insert with check (can_manage_finance(church_id));
create policy account_categories_finance_update on account_categories
  for update using (can_manage_finance(church_id));

create policy finance_tx_select on finance_transactions
  for select using (
    deleted_at is null
    and (
      can_manage_finance(church_id)
      or exists (
        select 1 from members m
        where m.id = finance_transactions.member_id
          and m.user_id = auth.uid()
      )
    )
  );
create policy finance_tx_insert on finance_transactions
  for insert with check (can_manage_finance(church_id));
create policy finance_tx_update on finance_transactions
  for update using (can_manage_finance(church_id));

create policy budgets_finance_select on budgets
  for select using (can_manage_finance(church_id));
create policy budgets_finance_insert on budgets
  for insert with check (can_manage_finance(church_id));
create policy budgets_finance_update on budgets
  for update using (can_manage_finance(church_id));

-- ============================================================
-- 권한 관리 화면용 (원본 0012_membership_roles_admin.sql)
-- ============================================================

alter table bulletin_profiles add column if not exists email text;

update bulletin_profiles p
set email = u.email
from auth.users u
where u.id = p.user_id and p.email is null;

create or replace function handle_new_bulletin_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into bulletin_profiles (user_id, display_name, email)
  values (new.id, new.raw_user_meta_data ->> 'display_name', new.email);
  return new;
end;
$$;

create policy bulletin_profiles_church_admin_select on bulletin_profiles
  for select using (
    exists (
      select 1 from church_memberships cm
      where cm.user_id = bulletin_profiles.user_id
        and is_church_admin(cm.church_id)
    )
  );
