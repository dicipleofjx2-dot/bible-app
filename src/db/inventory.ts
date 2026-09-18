import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from '@/lib/supabase';
import type { ItemStatus, LogKind, OrgKind, SpaceKind } from '@/lib/inventory';

/**
 * 물품관리ON 데이터(0084). 표 다섯과 비공개 사진 통 하나를 읽고 쓴다.
 *
 * 권한 판정은 전부 서버에 있다(inv_can_read / inv_can_write). 화면은 「되는
 * 만큼만 보여 준다」를 할 뿐, 막는 일은 하지 않는다 — 화면에서 막으면 화면을
 * 고칠 때마다 새는 자리가 생긴다.
 */

const BUCKET = 'inventory-photos';

export type InvOrg = {
  id: string;
  owner_id: string;
  kind: OrgKind;
  name: string;
  memo: string;
  cover_path: string | null;
  /** 교회운영ON 의 교회 슬러그(0002). 가정 공간은 비어 있다. */
  church_slug: string | null;
  created_at: string;
};

export type InvSpace = {
  id: string;
  org_id: string;
  parent_id: string | null;
  kind: SpaceKind;
  name: string;
  memo: string;
  cover_path: string | null;
  pin_x: number | null;
  pin_y: number | null;
  ord: number;
};

export type InvItem = {
  id: string;
  org_id: string;
  space_id: string | null;
  name: string;
  category: string;
  unit: string;
  qty: number;
  min_qty: number;
  status: ItemStatus;
  photo_path: string | null;
  tags: string[];
  memo: string;
  purchased_on: string | null;
  price: number | null;
  vendor: string;
  maker: string;
  model: string;
  serial: string;
  barcode: string;
  warranty_until: string | null;
  expires_on: string | null;
  manager: string;
  deleted_at: string | null;
  deleted_reason: string;
  created_at: string;
  updated_at: string;
};

export type InvLog = {
  id: string;
  item_id: string;
  kind: LogKind;
  delta: number | null;
  qty_after: number | null;
  from_space: string | null;
  to_space: string | null;
  reason: string;
  created_at: string;
};

export type InvRole = 'owner' | 'manager' | 'keeper' | 'member' | 'viewer';

const ORG_COLUMNS = 'id, owner_id, kind, name, memo, cover_path, church_slug, created_at';
const SPACE_COLUMNS = 'id, org_id, parent_id, kind, name, memo, cover_path, pin_x, pin_y, ord';
const ITEM_COLUMNS =
  'id, org_id, space_id, name, category, unit, qty, min_qty, status, photo_path, tags, memo, ' +
  'purchased_on, price, vendor, maker, model, serial, barcode, warranty_until, expires_on, manager, ' +
  'deleted_at, deleted_reason, created_at, updated_at';
const LOG_COLUMNS = 'id, item_id, kind, delta, qty_after, from_space, to_space, reason, created_at';

// ── 관리 공간 ───────────────────────────────────────────────────────

export async function listOrgs(): Promise<InvOrg[]> {
  // 내가 만든 것과 초대받은 것이 함께 온다 — 정책이 inv_can_read 하나이므로
  // 화면에서 걸러 낼 것이 없다.
  const { data, error } = await supabase
    .from('inv_orgs')
    .select(ORG_COLUMNS)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as InvOrg[];
}

/** 교회운영ON 이 슬러그로 들어올 때(0002). 정책이 그대로 걸러 주므로 여기서
 * 더 막을 것이 없다 — 구성원이 아니면 빈 배열이 온다. */
export async function listOrgsForChurch(churchSlug: string): Promise<InvOrg[]> {
  const { data, error } = await supabase
    .from('inv_orgs')
    .select(ORG_COLUMNS)
    .eq('church_slug', churchSlug)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as InvOrg[];
}

export async function getOrg(orgId: string): Promise<InvOrg | null> {
  const { data, error } = await supabase
    .from('inv_orgs')
    .select(ORG_COLUMNS)
    .eq('id', orgId)
    .maybeSingle();
  if (error) throw error;
  return (data as InvOrg | null) ?? null;
}

export async function createOrg(
  ownerId: string,
  input: { name: string; kind: OrgKind; memo?: string },
): Promise<string> {
  const { data, error } = await supabase
    .from('inv_orgs')
    .insert({ owner_id: ownerId, name: input.name, kind: input.kind, memo: input.memo ?? '' })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateOrg(orgId: string, patch: Partial<InvOrg>): Promise<void> {
  const { error } = await supabase.from('inv_orgs').update(patch).eq('id', orgId);
  if (error) throw error;
}

export async function deleteOrg(orgId: string): Promise<void> {
  const { error } = await supabase.from('inv_orgs').delete().eq('id', orgId);
  if (error) throw error;
}

/** 이 사람이 이 관리 공간에서 무엇을 할 수 있는가. 판정은 서버 함수가 한다. */
export async function myRole(orgId: string): Promise<InvRole | null> {
  const { data, error } = await supabase.rpc('inv_role', { p_org: orgId });
  if (error) throw error;
  return (data as InvRole | null) ?? null;
}

export function canWrite(role: InvRole | null): boolean {
  return role === 'owner' || role === 'manager' || role === 'keeper';
}

export function canAdmin(role: InvRole | null): boolean {
  return role === 'owner' || role === 'manager';
}

// ── 공간 ────────────────────────────────────────────────────────────

export async function listSpaces(orgId: string): Promise<InvSpace[]> {
  const { data, error } = await supabase
    .from('inv_spaces')
    .select(SPACE_COLUMNS)
    .eq('org_id', orgId)
    .order('ord', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as InvSpace[];
}

export async function createSpace(input: {
  org_id: string;
  parent_id: string | null;
  kind: SpaceKind;
  name: string;
  memo?: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from('inv_spaces')
    .insert({ ...input, memo: input.memo ?? '' })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateSpace(spaceId: string, patch: Partial<InvSpace>): Promise<void> {
  const { error } = await supabase.from('inv_spaces').update(patch).eq('id', spaceId);
  if (error) throw error;
}

export async function deleteSpace(spaceId: string): Promise<void> {
  const { error } = await supabase.from('inv_spaces').delete().eq('id', spaceId);
  if (error) throw error;
}

// ── 물품 ────────────────────────────────────────────────────────────

export async function listItems(
  orgId: string,
  options: { includeTrash?: boolean } = {},
): Promise<InvItem[]> {
  let query = supabase.from('inv_items').select(ITEM_COLUMNS).eq('org_id', orgId);
  if (!options.includeTrash) query = query.is('deleted_at', null);
  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw error;
  // 칼럼 목록을 문자열로 이어 붙여 넘기므로 supabase 가 결과 모양을 읽어 내지
  // 못한다. 한 번 unknown 을 거쳐 우리가 아는 모양으로 좁힌다.
  return (data ?? []) as unknown as InvItem[];
}

export async function getItem(itemId: string): Promise<InvItem | null> {
  const { data, error } = await supabase
    .from('inv_items')
    .select(ITEM_COLUMNS)
    .eq('id', itemId)
    .maybeSingle();
  if (error) throw error;
  return (data as InvItem | null) ?? null;
}

export type ItemInput = Partial<Omit<InvItem, 'id' | 'org_id' | 'created_at' | 'updated_at'>> & {
  name: string;
};

export async function createItem(
  orgId: string,
  userId: string,
  input: ItemInput,
): Promise<string> {
  const { data, error } = await supabase
    .from('inv_items')
    .insert({ org_id: orgId, created_by: userId, ...input })
    .select('id')
    .single();
  if (error) throw error;
  const id = (data as { id: string }).id;
  // 등록도 이력이다. 첫 수량이 어디서 왔는지 남는다.
  await supabase.from('inv_logs').insert({
    org_id: orgId,
    item_id: id,
    user_id: userId,
    kind: 'create',
    qty_after: input.qty ?? 0,
    to_space: input.space_id ?? null,
    reason: '등록',
  });
  return id;
}

export async function updateItem(itemId: string, patch: Partial<ItemInput>): Promise<void> {
  const { error } = await supabase.from('inv_items').update(patch).eq('id', itemId);
  if (error) throw error;
}

/** 수량 변경. 이력과 함께 한 걸음으로 남긴다(0084 의 inv_change_qty). */
export async function changeQty(itemId: string, delta: number, reason = ''): Promise<number> {
  const { data, error } = await supabase.rpc('inv_change_qty', {
    p_item: itemId,
    p_delta: delta,
    p_reason: reason,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

/** 옮기기. qty 를 주면 그만큼만 떼어 새 자리에 둔다(§4.7 분할 이동). */
export async function moveItem(
  itemId: string,
  toSpace: string | null,
  qty?: number,
  reason = '',
): Promise<string> {
  const { data, error } = await supabase.rpc('inv_move_item', {
    p_item: itemId,
    p_to_space: toSpace,
    p_qty: qty ?? null,
    p_reason: reason,
  });
  if (error) throw error;
  return String(data ?? itemId);
}

export async function disposeItem(itemId: string, status: ItemStatus, reason = ''): Promise<void> {
  const { error } = await supabase.rpc('inv_dispose_item', {
    p_item: itemId,
    p_status: status,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function restoreItem(itemId: string): Promise<void> {
  const { error } = await supabase.rpc('inv_restore_item', { p_item: itemId });
  if (error) throw error;
}

export async function purgeItem(itemId: string): Promise<void> {
  const { error } = await supabase.rpc('inv_purge_item', { p_item: itemId });
  if (error) throw error;
}

// ── 이력 ────────────────────────────────────────────────────────────

export async function listItemLogs(itemId: string, limit = 40): Promise<InvLog[]> {
  const { data, error } = await supabase
    .from('inv_logs')
    .select(LOG_COLUMNS)
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as InvLog[];
}

export type RecentLog = InvLog & { item?: { name: string } | null };

export async function listRecentLogs(orgId: string, limit = 12): Promise<RecentLog[]> {
  const { data, error } = await supabase
    .from('inv_logs')
    .select(`${LOG_COLUMNS}, item:inv_items (name)`)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as RecentLog[];
}

// ── 사진 ────────────────────────────────────────────────────────────

/**
 * 찍은 사진을 줄여서 올린다.
 *
 * 폰 사진은 한 장에 4~8MB 다. 그대로 쌓으면 목록 한 면이 수십 MB 가 되어
 * 창고 안 약한 신호에서는 아예 안 뜬다(§13 「썸네일을 쓴다」). 1400px 로
 * 줄이면 화면에 꽉 채워도 흐리지 않고 한 장이 200~400KB 로 떨어진다.
 */
export async function uploadPhoto(
  orgId: string,
  uri: string,
): Promise<{ path?: string; error?: string }> {
  try {
    const shrunk = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1400 } }], {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    }).catch(() => null);

    const response = await fetch(shrunk?.uri ?? uri);
    const arrayBuffer = await response.arrayBuffer();
    // 통 안의 첫 칸이 관리 공간 id 다 — 사진 통의 정책이 이 폴더 이름으로
    // 권한을 판정한다(0084). 다른 모양으로 올리면 아무도 못 읽는다.
    const path = `${orgId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      contentType: 'image/jpeg',
    });
    if (error) return { error: error.message };
    return { path };
  } catch (e) {
    return { error: e instanceof Error ? e.message : '사진을 올리지 못했어요.' };
  }
}

export async function removePhoto(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

/**
 * 비공개 통이라 볼 때마다 서명 주소를 받는다. 한 면에 사진이 수십 장이므로
 * **한 장씩 부르지 않고 묶어서** 한 번에 받고, 받은 것은 잠시 기억한다.
 */
const signedCache = new Map<string, { url: string; until: number }>();
const SIGN_SECONDS = 3600;

export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];

  for (const path of [...new Set(paths.filter(Boolean))]) {
    const hit = signedCache.get(path);
    // 주소가 죽기 5분 전부터는 새로 받는다. 쓰는 도중에 만료되면 사진이 깨진다.
    if (hit && hit.until - 5 * 60_000 > now) out[path] = hit.url;
    else missing.push(path);
  }
  if (missing.length === 0) return out;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(missing, SIGN_SECONDS);
  if (error) return out;
  for (const row of data ?? []) {
    if (!row.signedUrl || !row.path) continue;
    signedCache.set(row.path, { url: row.signedUrl, until: now + SIGN_SECONDS * 1000 });
    out[row.path] = row.signedUrl;
  }
  return out;
}

// ── 구성원 ──────────────────────────────────────────────────────────

export type InvMember = { org_id: string; user_id: string; role: InvRole; display_name: string };

export async function listMembers(orgId: string): Promise<InvMember[]> {
  const { data, error } = await supabase
    .from('inv_members')
    .select('org_id, user_id, role, display_name')
    .eq('org_id', orgId);
  if (error) throw error;
  return (data ?? []) as InvMember[];
}

export async function setMemberRole(
  orgId: string,
  userId: string,
  role: Exclude<InvRole, 'owner'>,
  displayName = '',
): Promise<void> {
  const { error } = await supabase
    .from('inv_members')
    .upsert({ org_id: orgId, user_id: userId, role, display_name: displayName });
  if (error) throw error;
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('inv_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId);
  if (error) throw error;
}

/**
 * 첫 화면의 공간 카드에 붙일 요약. 관리 공간마다 물품을 따로 부르면 공간이
 * 다섯이면 왕복도 다섯이다 — 셈에 필요한 칸만 한 번에 받아 화면에서 묶는다.
 */
export type SummaryRow = {
  org_id: string;
  qty: number;
  min_qty: number;
  status: ItemStatus;
  deleted_at: string | null;
};

export async function summaryRows(): Promise<SummaryRow[]> {
  const { data, error } = await supabase
    .from('inv_items')
    .select('org_id, qty, min_qty, status, deleted_at')
    .is('deleted_at', null);
  if (error) throw error;
  return (data ?? []) as SummaryRow[];
}
