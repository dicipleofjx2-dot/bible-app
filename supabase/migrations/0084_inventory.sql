-- 물품관리ON — 교회와 가정의 물품을 사진으로 보고 찾는 수납 지도 (기획서 1단계 MVP).
--
-- ── 왜 한 계정 안에 「관리 공간」을 두는가 ───────────────────────────
-- 한 사람이 교회 물품과 집 물품을 같이 관리한다(§3.1). 그렇다고 한 통에 섞으면
-- 교회 봉사자가 그 집 안방 사진을 보게 된다. 그래서 **모든 표의 첫 칸이
-- org_id** 이고, 권한도 물품 하나하나가 아니라 관리 공간 단위로 준다.
--
-- ── 정책이 재귀에 빠지지 않게 ──────────────────────────────────────
-- 「구성원이면 읽는다」를 정책 안에서 inv_members 를 직접 조회해 쓰면,
-- inv_members 자신의 정책이 다시 inv_members 를 부른다(무한 재귀). 그래서
-- 판정은 security definer 함수 inv_role() 한 곳에만 둔다. 정책은 그 함수만
-- 부르고, 권한 규칙을 고칠 자리도 이 함수 하나뿐이다.
--
-- ── 수량은 왜 함수로 바꾸는가 (§13 필수 고려사항) ───────────────────
-- 「수량 칸을 고치고」 + 「이력을 한 줄 넣고」를 화면에서 따로 부르면, 사이에서
-- 끊길 때 수량만 바뀌고 이력이 비는 일이 생긴다. 그러면 과거 수량을 되짚을 수
-- 없다. 두 일을 한 함수 안에서 한다(0077 의 pray_for_fruit 과 같은 판단).
--
-- ── 지우지 않는다 ──────────────────────────────────────────────────
-- 소모품을 다 썼다고 줄을 지우면 구입·사용 기록이 같이 사라진다(§4.6).
-- 수량이 0 이 되면 상태만 「사용 완료」로 바뀌고, 삭제는 deleted_at 을 찍는
-- 소프트 삭제다. 30일 안에는 되돌릴 수 있고, 영구 삭제는 대표 관리자만 한다.

-- ── 관리 공간 ───────────────────────────────────────────────────────
create table if not exists public.inv_orgs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'church' check (kind in ('church', 'home', 'other')),
  name text not null,
  memo text not null default '',
  -- 통 안의 **경로**만 담는다. 절대 주소를 담으면 프로젝트를 옮길 때 통째로 죽는다.
  cover_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inv_orgs_owner_idx on public.inv_orgs (owner_id, created_at);

-- ── 구성원 ──────────────────────────────────────────────────────────
-- 기획서 §7.1 의 다섯 등급. owner 는 inv_orgs.owner_id 로 이미 정해지므로
-- 이 표에는 초대받은 사람만 담는다.
create table if not exists public.inv_members (
  org_id uuid not null references public.inv_orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member'
    check (role in ('manager', 'keeper', 'member', 'viewer')),
  display_name text not null default '',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- ── 공간 계층 ───────────────────────────────────────────────────────
-- 건물 → 층 → 방 → 수납 위치를 한 표에 담고 parent_id 로 잇는다. 층이 없는
-- 가정집은 그 단계를 그냥 안 만들면 된다(§3.2 「불필요한 단계 생략」).
create table if not exists public.inv_spaces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.inv_orgs (id) on delete cascade,
  parent_id uuid references public.inv_spaces (id) on delete cascade,
  kind text not null default 'room' check (kind in ('building', 'floor', 'room', 'storage')),
  name text not null,
  memo text not null default '',
  cover_path text,
  -- 부모 공간 **사진 위에서의 자리**를 0~1 비율로 담는다. 화면 크기를 담으면
  -- 폰과 웹에서 핀이 딴 데 찍힌다(0076 의 열매 자리와 같은 이유).
  pin_x real check (pin_x is null or (pin_x between 0 and 1)),
  pin_y real check (pin_y is null or (pin_y between 0 and 1)),
  ord integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inv_spaces_org_idx on public.inv_spaces (org_id, parent_id, ord);

-- ── 물품 ────────────────────────────────────────────────────────────
create table if not exists public.inv_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.inv_orgs (id) on delete cascade,
  space_id uuid references public.inv_spaces (id) on delete set null,
  name text not null,
  category text not null default '',
  -- 1개·1상자·1롤처럼 쓰는 사람이 정한다(§4.5).
  unit text not null default '개',
  qty numeric not null default 0,
  min_qty numeric not null default 0,
  status text not null default 'stored' check (status in (
    'in_use', 'stored', 'loaned', 'repair', 'used_up',
    'to_dispose', 'disposed', 'lost', 'donated', 'sold'
  )),
  photo_path text,
  tags text[] not null default '{}',
  memo text not null default '',
  purchased_on date,
  price numeric,
  vendor text not null default '',
  maker text not null default '',
  model text not null default '',
  serial text not null default '',
  barcode text not null default '',
  warranty_until date,
  expires_on date,
  manager text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  -- 소프트 삭제(§13). 참조 이력이 깨지지 않도록 줄을 지우지 않는다.
  deleted_at timestamptz,
  deleted_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inv_items_org_idx on public.inv_items (org_id, deleted_at, name);
create index if not exists inv_items_space_idx on public.inv_items (space_id, deleted_at);

-- ── 이력 ────────────────────────────────────────────────────────────
-- 「누가 언제 무엇을 얼마나 바꿨는가」(§15). 지우지 않는다.
create table if not exists public.inv_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.inv_orgs (id) on delete cascade,
  item_id uuid not null references public.inv_items (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('create', 'in', 'out', 'adjust', 'move', 'status', 'edit', 'dispose', 'restore')),
  delta numeric,
  qty_after numeric,
  from_space uuid,
  to_space uuid,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists inv_logs_item_idx on public.inv_logs (item_id, created_at desc);
create index if not exists inv_logs_org_idx on public.inv_logs (org_id, created_at desc);

-- ── 권한 판정 한 곳 ─────────────────────────────────────────────────
create or replace function public.inv_role(p_org uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.inv_orgs o where o.id = p_org and o.owner_id = auth.uid())
      then 'owner'
    else (select m.role from public.inv_members m where m.org_id = p_org and m.user_id = auth.uid())
  end;
$$;

create or replace function public.inv_can_read(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.inv_role(p_org) is not null;
$$;

-- 물품을 등록·수정·이동할 수 있는 등급. 일반 사용자와 열람 전용은 조회만 한다.
create or replace function public.inv_can_write(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.inv_role(p_org) in ('owner', 'manager', 'keeper');
$$;

create or replace function public.inv_is_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.inv_role(p_org) in ('owner', 'manager');
$$;

-- 사진 통의 정책이 쓴다. 폴더 이름이 uuid 가 아닐 수도 있어 안전하게 캐스팅한다.
create or replace function public.inv_can_read_folder(p_folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  begin
    v_org := p_folder::uuid;
  exception when others then
    return false;
  end;
  return public.inv_can_read(v_org);
end;
$$;

create or replace function public.inv_can_write_folder(p_folder text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  begin
    v_org := p_folder::uuid;
  exception when others then
    return false;
  end;
  return public.inv_can_write(v_org);
end;
$$;

-- ── 손댄 시각 ───────────────────────────────────────────────────────
create or replace function public.inv_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists inv_orgs_touch on public.inv_orgs;
create trigger inv_orgs_touch before update on public.inv_orgs
  for each row execute function public.inv_touch();

drop trigger if exists inv_spaces_touch on public.inv_spaces;
create trigger inv_spaces_touch before update on public.inv_spaces
  for each row execute function public.inv_touch();

drop trigger if exists inv_items_touch on public.inv_items;
create trigger inv_items_touch before update on public.inv_items
  for each row execute function public.inv_touch();

-- ── 정책 ────────────────────────────────────────────────────────────
alter table public.inv_orgs enable row level security;
alter table public.inv_members enable row level security;
alter table public.inv_spaces enable row level security;
alter table public.inv_items enable row level security;
alter table public.inv_logs enable row level security;

drop policy if exists "inv orgs read" on public.inv_orgs;
create policy "inv orgs read" on public.inv_orgs
  for select using (public.inv_can_read(id));

drop policy if exists "inv orgs insert own" on public.inv_orgs;
create policy "inv orgs insert own" on public.inv_orgs
  for insert with check (owner_id = auth.uid());

drop policy if exists "inv orgs update" on public.inv_orgs;
create policy "inv orgs update" on public.inv_orgs
  for update using (public.inv_is_admin(id)) with check (public.inv_is_admin(id));

-- 관리 공간 자체를 지우는 것은 만든 사람만. 여기엔 남의 기록까지 들어 있다.
drop policy if exists "inv orgs delete own" on public.inv_orgs;
create policy "inv orgs delete own" on public.inv_orgs
  for delete using (owner_id = auth.uid());

drop policy if exists "inv members read" on public.inv_members;
create policy "inv members read" on public.inv_members
  for select using (public.inv_can_read(org_id));

drop policy if exists "inv members write" on public.inv_members;
create policy "inv members write" on public.inv_members
  for all using (public.inv_is_admin(org_id)) with check (public.inv_is_admin(org_id));

drop policy if exists "inv spaces read" on public.inv_spaces;
create policy "inv spaces read" on public.inv_spaces
  for select using (public.inv_can_read(org_id));

drop policy if exists "inv spaces write" on public.inv_spaces;
create policy "inv spaces write" on public.inv_spaces
  for all using (public.inv_can_write(org_id)) with check (public.inv_can_write(org_id));

drop policy if exists "inv items read" on public.inv_items;
create policy "inv items read" on public.inv_items
  for select using (public.inv_can_read(org_id));

drop policy if exists "inv items write" on public.inv_items;
create policy "inv items write" on public.inv_items
  for all using (public.inv_can_write(org_id)) with check (public.inv_can_write(org_id));

drop policy if exists "inv logs read" on public.inv_logs;
create policy "inv logs read" on public.inv_logs
  for select using (public.inv_can_read(org_id));

-- 이력은 넣기만 한다. 고치거나 지우는 정책을 두지 않는 것이 이 표의 뜻이다.
drop policy if exists "inv logs insert" on public.inv_logs;
create policy "inv logs insert" on public.inv_logs
  for insert with check (public.inv_can_write(org_id) and user_id = auth.uid());

-- ── 사진 통 ─────────────────────────────────────────────────────────
-- 비공개다. 여기엔 남의 집 안방과 교회 사무실 내부가 찍힌다(§7.2). 주소가 한 번
-- 새면 되돌릴 길이 없어, 화면은 볼 때마다 짧게 사는 서명 주소를 받아 쓴다.
insert into storage.buckets (id, name, public)
values ('inventory-photos', 'inventory-photos', false)
on conflict (id) do nothing;

drop policy if exists "inventory photos read" on storage.objects;
create policy "inventory photos read" on storage.objects
  for select using (
    bucket_id = 'inventory-photos'
    and public.inv_can_read_folder((storage.foldername(name))[1])
  );

drop policy if exists "inventory photos write" on storage.objects;
create policy "inventory photos write" on storage.objects
  for insert with check (
    bucket_id = 'inventory-photos'
    and public.inv_can_write_folder((storage.foldername(name))[1])
  );

drop policy if exists "inventory photos delete" on storage.objects;
create policy "inventory photos delete" on storage.objects
  for delete using (
    bucket_id = 'inventory-photos'
    and public.inv_can_write_folder((storage.foldername(name))[1])
  );

-- ── 수량 바꾸기 ─────────────────────────────────────────────────────
-- 수량과 이력을 한 걸음으로 남긴다. 0 이 되면 상태가 「사용 완료」로 바뀌고,
-- 다시 채우면 「보관 중」으로 돌아온다(§4.6 재구입).
create or replace function public.inv_change_qty(
  p_item uuid,
  p_delta numeric,
  p_reason text default ''
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inv_items%rowtype;
  v_next numeric;
begin
  select * into v_item from public.inv_items where id = p_item;
  if not found then
    raise exception '물품을 찾지 못했습니다.';
  end if;
  if not public.inv_can_write(v_item.org_id) then
    raise exception '수량을 바꿀 권한이 없습니다.';
  end if;

  -- 실제 창고에 마이너스 재고는 없다. 0 에서 멈춘다.
  v_next := greatest(v_item.qty + p_delta, 0);

  update public.inv_items
     set qty = v_next,
         status = case
           when v_next = 0 and v_item.status in ('in_use', 'stored') then 'used_up'
           when v_next > 0 and v_item.status = 'used_up' then 'stored'
           else v_item.status
         end
   where id = p_item;

  insert into public.inv_logs (org_id, item_id, user_id, kind, delta, qty_after, reason)
  values (
    v_item.org_id, p_item, auth.uid(),
    case when p_delta > 0 then 'in' when p_delta < 0 then 'out' else 'adjust' end,
    p_delta, v_next, coalesce(p_reason, '')
  );

  return v_next;
end;
$$;

-- ── 옮기기 ──────────────────────────────────────────────────────────
-- 일부만 옮기면 같은 물품이 두 자리에 나뉜다(§4.5 의 「A4 용지 총 13박스」).
-- 그때는 새 줄을 하나 떠서 옮긴 수량만 담는다.
create or replace function public.inv_move_item(
  p_item uuid,
  p_to_space uuid,
  p_qty numeric default null,
  p_reason text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inv_items%rowtype;
  v_move numeric;
  v_new uuid;
begin
  select * into v_item from public.inv_items where id = p_item;
  if not found then
    raise exception '물품을 찾지 못했습니다.';
  end if;
  if not public.inv_can_write(v_item.org_id) then
    raise exception '옮길 권한이 없습니다.';
  end if;
  if p_to_space is not null
     and not exists (select 1 from public.inv_spaces s where s.id = p_to_space and s.org_id = v_item.org_id) then
    raise exception '같은 관리 공간 안으로만 옮길 수 있습니다.';
  end if;

  v_move := coalesce(p_qty, v_item.qty);

  if v_move >= v_item.qty then
    update public.inv_items set space_id = p_to_space where id = p_item;
    insert into public.inv_logs (org_id, item_id, user_id, kind, qty_after, from_space, to_space, reason)
    values (v_item.org_id, p_item, auth.uid(), 'move', v_item.qty, v_item.space_id, p_to_space, coalesce(p_reason, ''));
    return p_item;
  end if;

  insert into public.inv_items (
    org_id, space_id, name, category, unit, qty, min_qty, status, photo_path, tags, memo,
    purchased_on, price, vendor, maker, model, serial, barcode, warranty_until, expires_on,
    manager, created_by
  )
  values (
    v_item.org_id, p_to_space, v_item.name, v_item.category, v_item.unit, v_move, v_item.min_qty,
    v_item.status, v_item.photo_path, v_item.tags, v_item.memo,
    v_item.purchased_on, v_item.price, v_item.vendor, v_item.maker, v_item.model, v_item.serial,
    v_item.barcode, v_item.warranty_until, v_item.expires_on, v_item.manager, auth.uid()
  )
  returning id into v_new;

  update public.inv_items set qty = qty - v_move where id = p_item;

  insert into public.inv_logs (org_id, item_id, user_id, kind, delta, qty_after, from_space, to_space, reason)
  values (v_item.org_id, p_item, auth.uid(), 'move', -v_move, v_item.qty - v_move, v_item.space_id, p_to_space, coalesce(p_reason, ''));
  insert into public.inv_logs (org_id, item_id, user_id, kind, delta, qty_after, from_space, to_space, reason)
  values (v_item.org_id, v_new, auth.uid(), 'move', v_move, v_move, v_item.space_id, p_to_space, coalesce(p_reason, ''));

  return v_new;
end;
$$;

-- ── 처분·삭제·복원 ──────────────────────────────────────────────────
create or replace function public.inv_dispose_item(
  p_item uuid,
  p_status text,
  p_reason text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inv_items%rowtype;
begin
  select * into v_item from public.inv_items where id = p_item;
  if not found then
    raise exception '물품을 찾지 못했습니다.';
  end if;
  if not public.inv_can_write(v_item.org_id) then
    raise exception '처분할 권한이 없습니다.';
  end if;
  if p_status not in ('used_up', 'to_dispose', 'disposed', 'lost', 'donated', 'sold') then
    raise exception '알 수 없는 처분 사유입니다.';
  end if;

  update public.inv_items
     set status = p_status,
         deleted_at = now(),
         deleted_reason = coalesce(p_reason, '')
   where id = p_item;

  insert into public.inv_logs (org_id, item_id, user_id, kind, qty_after, reason)
  values (v_item.org_id, p_item, auth.uid(), 'dispose', v_item.qty, coalesce(p_reason, p_status));
end;
$$;

create or replace function public.inv_restore_item(p_item uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inv_items%rowtype;
begin
  select * into v_item from public.inv_items where id = p_item;
  if not found then
    raise exception '물품을 찾지 못했습니다.';
  end if;
  if not public.inv_can_write(v_item.org_id) then
    raise exception '되돌릴 권한이 없습니다.';
  end if;

  update public.inv_items
     set deleted_at = null,
         deleted_reason = '',
         status = case when v_item.qty > 0 then 'stored' else 'used_up' end
   where id = p_item;

  insert into public.inv_logs (org_id, item_id, user_id, kind, qty_after, reason)
  values (v_item.org_id, p_item, auth.uid(), 'restore', v_item.qty, '휴지통에서 되돌림');
end;
$$;

-- 영구 삭제는 대표 관리자와 공간 관리자만. 이력까지 같이 사라진다.
create or replace function public.inv_purge_item(p_item uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.inv_items where id = p_item;
  if v_org is null then
    return;
  end if;
  if not public.inv_is_admin(v_org) then
    raise exception '영구 삭제는 관리자만 할 수 있습니다.';
  end if;
  delete from public.inv_items where id = p_item;
end;
$$;
