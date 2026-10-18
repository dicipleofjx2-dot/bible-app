import { currentChurchId } from '@/lib/churchScope';
import type { ActionKind } from '@/lib/evangelism';
import { supabase } from '@/lib/supabase';

/**
 * 전도 — 대상자 돌봄·중보 요청·교회 전략.
 *
 * 표와 정책은 supabase/migrations/0090_evangelism.sql. 여기서는 읽고 쓰기만 하고
 * **권한 판단을 다시 하지 않는다**(0065 가 정한 원칙). 대상자·걸음은 본인만
 * 읽히고, 교회에 나눈 것(shares)에는 실명이 없다.
 */

export type Campaign = {
  id: string;
  title: string;
  eventTitle: string;
  eventDate: string;
  description: string;
};

export type Phase = {
  id: string;
  sortOrder: number;
  title: string;
  summary: string;
  startOn: string;
  endOn: string;
  tasks: string[];
  churchActions: string[];
  focusKind: ActionKind | null;
};

export type Target = {
  id: string;
  campaignId: string | null;
  name: string;
  relation: string;
  note: string;
  createdAt: string;
  /** 걸음 종류별 가장 최근 날짜. 한 번도 없으면 키가 없다. */
  done: Partial<Record<ActionKind, string>>;
  actionCount: number;
  shareId: string | null;
};

export type Action = {
  id: string;
  kind: ActionKind;
  happenedOn: string;
  note: string;
};

export type Share = {
  id: string;
  targetId: string;
  ownerId: string;
  alias: string;
  topic: string;
  stage: number;
  stageKind: ActionKind | null;
  answered: boolean;
  answeredNote: string;
  createdAt: string;
  prayerCount: number;
  iPrayed: boolean;
  messageCount: number;
  mine: boolean;
};

export type Message = {
  id: string;
  authorId: string;
  author: string;
  kind: 'encourage' | 'testimony';
  body: string;
  createdAt: string;
};

export type Summary = {
  targets: number;
  members: number;
  pray: number;
  contact: number;
  gift: number;
  meet: number;
  invite: number;
  attend: number;
  settle: number;
};

async function myId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// ── 전략 ────────────────────────────────────────────────────────────

/** 내 교회의 가장 최근 전도 일정과 그 단계들. 없으면 null. */
export async function getActiveCampaign(): Promise<{ campaign: Campaign; phases: Phase[] } | null> {
  const churchId = await currentChurchId();
  if (!churchId) return null;
  const { data } = await supabase
    .from('evangelism_campaigns')
    .select('id,title,event_title,event_date,description')
    .eq('church_id', churchId)
    .eq('is_active', true)
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const c = data as Record<string, string>;
  const { data: ph } = await supabase
    .from('evangelism_phases')
    .select('id,sort_order,title,summary,start_on,end_on,tasks,church_actions,focus_kind')
    .eq('campaign_id', c.id)
    .order('sort_order');
  return {
    campaign: {
      id: c.id,
      title: c.title,
      eventTitle: c.event_title,
      eventDate: c.event_date,
      description: c.description ?? '',
    },
    phases: ((ph ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      sortOrder: Number(r.sort_order ?? 0),
      title: String(r.title ?? ''),
      summary: String(r.summary ?? ''),
      startOn: String(r.start_on),
      endOn: String(r.end_on),
      tasks: (r.tasks as string[] | null) ?? [],
      churchActions: (r.church_actions as string[] | null) ?? [],
      focusKind: (r.focus_kind as ActionKind | null) ?? null,
    })),
  };
}

export async function getSummary(campaignId: string): Promise<Summary | null> {
  const { data, error } = await supabase.rpc('evangelism_summary', { target_campaign_id: campaignId });
  if (error) return null;
  const r = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (!r) return null;
  const n = (k: string) => Number(r[k] ?? 0);
  return {
    targets: n('targets'),
    members: n('members'),
    pray: n('prayed'),
    contact: n('contacted'),
    gift: n('gifted'),
    meet: n('met'),
    invite: n('invited'),
    attend: n('attended'),
    settle: n('settled'),
  };
}

// ── 내 대상자 ───────────────────────────────────────────────────────

export async function getMyTargets(): Promise<Target[]> {
  const uid = await myId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from('evangelism_targets')
    .select('id,campaign_id,name,relation,note,created_at')
    .eq('owner_id', uid)
    .is('deleted_at', null)
    .order('created_at');
  if (error || !data) return [];
  const rows = data as Record<string, string | null>[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id as string);

  const [{ data: acts }, { data: shares }] = await Promise.all([
    supabase.from('evangelism_actions').select('target_id,kind,happened_on').in('target_id', ids),
    supabase.from('evangelism_shares').select('id,target_id').in('target_id', ids).is('deleted_at', null),
  ]);

  const done = new Map<string, Partial<Record<ActionKind, string>>>();
  const count = new Map<string, number>();
  for (const a of (acts ?? []) as { target_id: string; kind: ActionKind; happened_on: string }[]) {
    const m = done.get(a.target_id) ?? {};
    const prev = m[a.kind];
    if (!prev || a.happened_on > prev) m[a.kind] = a.happened_on;
    done.set(a.target_id, m);
    count.set(a.target_id, (count.get(a.target_id) ?? 0) + 1);
  }
  const shareOf = new Map(((shares ?? []) as { id: string; target_id: string }[]).map((s) => [s.target_id, s.id]));

  return rows.map((r) => ({
    id: r.id as string,
    campaignId: r.campaign_id,
    name: String(r.name ?? ''),
    relation: String(r.relation ?? ''),
    note: String(r.note ?? ''),
    createdAt: String(r.created_at),
    done: done.get(r.id as string) ?? {},
    actionCount: count.get(r.id as string) ?? 0,
    shareId: shareOf.get(r.id as string) ?? null,
  }));
}

export async function getTarget(id: string): Promise<Target | null> {
  const all = await getMyTargets();
  return all.find((t) => t.id === id) ?? null;
}

export async function addTarget(input: {
  campaignId: string | null;
  name: string;
  relation: string;
  note: string;
}): Promise<{ id: string | null; error: string | null }> {
  const uid = await myId();
  const churchId = await currentChurchId();
  if (!uid || !churchId) return { id: null, error: '로그인 후 이용해 주세요.' };
  const name = input.name.trim();
  if (!name) return { id: null, error: '이름을 적어 주세요.' };
  const { data, error } = await supabase
    .from('evangelism_targets')
    .insert({
      church_id: churchId,
      campaign_id: input.campaignId,
      owner_id: uid,
      name,
      relation: input.relation.trim(),
      note: input.note.trim(),
    })
    .select('id')
    .maybeSingle();
  if (error) return { id: null, error: '저장하지 못했어요. 잠시 뒤 다시 해 주세요.' };
  return { id: (data as { id: string } | null)?.id ?? null, error: null };
}

export async function updateTarget(
  id: string,
  input: { name: string; relation: string; note: string },
): Promise<string | null> {
  const name = input.name.trim();
  if (!name) return '이름을 적어 주세요.';
  const { error } = await supabase
    .from('evangelism_targets')
    .update({ name, relation: input.relation.trim(), note: input.note.trim() })
    .eq('id', id);
  return error ? '저장하지 못했어요.' : null;
}

export async function deleteTarget(id: string): Promise<string | null> {
  // 나눔이 있으면 함께 거둔다. 대상자도 지우지 않고 숨긴다(soft).
  const now = new Date().toISOString();
  await supabase.from('evangelism_shares').update({ deleted_at: now }).eq('target_id', id);
  const { error } = await supabase.from('evangelism_targets').update({ deleted_at: now }).eq('id', id);
  return error ? '지우지 못했어요.' : null;
}

// ── 걸음 ────────────────────────────────────────────────────────────

export async function getActions(targetId: string): Promise<Action[]> {
  const { data } = await supabase
    .from('evangelism_actions')
    .select('id,kind,happened_on,note')
    .eq('target_id', targetId)
    .order('happened_on', { ascending: false })
    .order('created_at', { ascending: false });
  return ((data ?? []) as Record<string, string>[]).map((r) => ({
    id: r.id,
    kind: r.kind as ActionKind,
    happenedOn: r.happened_on,
    note: r.note ?? '',
  }));
}

export async function addAction(
  targetId: string,
  kind: ActionKind,
  note: string,
  happenedOn: string,
): Promise<string | null> {
  const uid = await myId();
  if (!uid) return '로그인 후 이용해 주세요.';
  const { error } = await supabase
    .from('evangelism_actions')
    .insert({ target_id: targetId, owner_id: uid, kind, note: note.trim(), happened_on: happenedOn });
  return error ? '기록하지 못했어요.' : null;
}

export async function deleteAction(id: string): Promise<string | null> {
  const { error } = await supabase.from('evangelism_actions').delete().eq('id', id);
  return error ? '지우지 못했어요.' : null;
}

// ── 중보 요청(교회에 나누기) ────────────────────────────────────────

export async function shareTarget(input: {
  targetId: string;
  campaignId: string | null;
  alias: string;
  topic: string;
}): Promise<string | null> {
  const uid = await myId();
  const churchId = await currentChurchId();
  if (!uid || !churchId) return '로그인 후 이용해 주세요.';
  const alias = input.alias.trim();
  if (!alias) return '교회에 보일 이름(별명)을 적어 주세요.';
  // 이미 거둔 나눔이 있으면 되살린다(target_id 가 unique).
  const { data: old } = await supabase
    .from('evangelism_shares')
    .select('id')
    .eq('target_id', input.targetId)
    .maybeSingle();
  if (old) {
    const { error } = await supabase
      .from('evangelism_shares')
      .update({ alias, topic: input.topic.trim(), deleted_at: null })
      .eq('id', (old as { id: string }).id);
    return error ? '나누지 못했어요.' : null;
  }
  const { error } = await supabase.from('evangelism_shares').insert({
    church_id: churchId,
    campaign_id: input.campaignId,
    target_id: input.targetId,
    owner_id: uid,
    alias,
    topic: input.topic.trim(),
  });
  return error ? '나누지 못했어요.' : null;
}

export async function unshareTarget(targetId: string): Promise<string | null> {
  const { error } = await supabase
    .from('evangelism_shares')
    .update({ deleted_at: new Date().toISOString() })
    .eq('target_id', targetId);
  return error ? '거두지 못했어요.' : null;
}

export async function setShareAnswered(shareId: string, answered: boolean, note: string): Promise<string | null> {
  const { error } = await supabase
    .from('evangelism_shares')
    .update({ answered, answered_note: note.trim() })
    .eq('id', shareId);
  return error ? '저장하지 못했어요.' : null;
}

/** 교회에 나뉜 중보 요청들(내 것 포함). 기도·격려 수를 함께 센다. */
export async function getShares(): Promise<Share[]> {
  const uid = await myId();
  const churchId = await currentChurchId();
  if (!uid || !churchId) return [];
  const { data, error } = await supabase
    .from('evangelism_shares')
    .select('id,target_id,owner_id,alias,topic,stage,stage_kind,answered,answered_note,created_at')
    .eq('church_id', churchId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  const rows = data as Record<string, unknown>[];
  if (!rows.length) return [];
  const ids = rows.map((r) => String(r.id));

  const [{ data: pr }, { data: ms }] = await Promise.all([
    supabase.from('evangelism_prayers').select('share_id,user_id').in('share_id', ids),
    supabase.from('evangelism_messages').select('share_id').in('share_id', ids).is('deleted_at', null),
  ]);
  const prayers = new Map<string, number>();
  const prayed = new Set<string>();
  for (const p of (pr ?? []) as { share_id: string; user_id: string }[]) {
    prayers.set(p.share_id, (prayers.get(p.share_id) ?? 0) + 1);
    if (p.user_id === uid) prayed.add(p.share_id);
  }
  const msgs = new Map<string, number>();
  for (const m of (ms ?? []) as { share_id: string }[]) msgs.set(m.share_id, (msgs.get(m.share_id) ?? 0) + 1);

  return rows.map((r) => ({
    id: String(r.id),
    targetId: String(r.target_id),
    ownerId: String(r.owner_id),
    alias: String(r.alias ?? ''),
    topic: String(r.topic ?? ''),
    stage: Number(r.stage ?? 0),
    stageKind: (r.stage_kind as ActionKind | null) ?? null,
    answered: r.answered === true,
    answeredNote: String(r.answered_note ?? ''),
    createdAt: String(r.created_at),
    prayerCount: prayers.get(String(r.id)) ?? 0,
    iPrayed: prayed.has(String(r.id)),
    messageCount: msgs.get(String(r.id)) ?? 0,
    mine: r.owner_id === uid,
  }));
}

export async function togglePrayer(shareId: string, on: boolean): Promise<string | null> {
  const uid = await myId();
  if (!uid) return '로그인 후 이용해 주세요.';
  const { error } = on
    ? await supabase.from('evangelism_prayers').upsert({ share_id: shareId, user_id: uid })
    : await supabase.from('evangelism_prayers').delete().eq('share_id', shareId).eq('user_id', uid);
  return error ? '저장하지 못했어요.' : null;
}

export async function getMessages(shareId: string): Promise<Message[]> {
  const { data } = await supabase
    .from('evangelism_messages')
    .select('id,author_id,kind,body,created_at,profiles(username)')
    .eq('share_id', shareId)
    .is('deleted_at', null)
    .order('created_at');
  return ((data ?? []) as unknown as {
    id: string;
    author_id: string;
    kind: 'encourage' | 'testimony';
    body: string;
    created_at: string;
    profiles: { username: string | null } | { username: string | null }[] | null;
  }[]).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      authorId: r.author_id,
      author: p?.username ?? '익명',
      kind: r.kind,
      body: r.body,
      createdAt: r.created_at,
    };
  });
}

export async function addMessage(
  shareId: string,
  kind: 'encourage' | 'testimony',
  body: string,
): Promise<string | null> {
  const uid = await myId();
  if (!uid) return '로그인 후 이용해 주세요.';
  const text = body.trim();
  if (!text) return '내용을 적어 주세요.';
  const { error } = await supabase
    .from('evangelism_messages')
    .insert({ share_id: shareId, author_id: uid, kind, body: text });
  return error ? '남기지 못했어요.' : null;
}

export async function deleteMessage(id: string): Promise<string | null> {
  const { error } = await supabase
    .from('evangelism_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  return error ? '지우지 못했어요.' : null;
}
